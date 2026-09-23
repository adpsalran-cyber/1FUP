import React from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/standings',
  component: StandingsPage,
});

function StandingsPage() {
  const localLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  // 1. Recupera l'unica lega attiva per garantire che punti sempre a quella corretta
  const { data: currentLeague } = useQuery({
    queryKey: ['active_league_single'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leagues')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data?.id) {
        localStorage.setItem('alci_league_id', data.id);
        localStorage.setItem('active_league_id', data.id);
      }
      return data || null;
    },
  });

  const activeLeagueId = currentLeague?.id || localLeagueId;

  // 2. Recupera la stagione attiva
  const { data: season } = useQuery({
    queryKey: ['active_season', activeLeagueId],
    enabled: !!activeLeagueId,
    queryFn: async () => {
      const { data } = await supabase
        .from('seasons')
        .select('*')
        .eq('league_id', activeLeagueId)
        .order('is_active', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    },
  });

  // 3. Recupera giocatori e calcola classifica dinamica dalle partite giocate/simulate
  const { data: standings, isLoading, refetch } = useQuery({
    queryKey: ['standings_table', activeLeagueId],
    queryFn: async () => {
      // A. Recupera giocatori della rosa
      let playersQuery = supabase.from('players').select('*');
      if (activeLeagueId) {
        playersQuery = playersQuery.eq('league_id', activeLeagueId);
      }
      const { data: players, error: pErr } = await playersQuery;
      if (pErr || !players || players.length === 0) return [];

      // B. Recupera partite senza filtri PostgREST a rischio errore 400
      const { data: allMatches, error: mErr } = await supabase
        .from('matches')
        .select('*');

      if (mErr || !allMatches) return [];

      // Filtra le partite della lega corrente o senza lega esplicita
      const matches = allMatches.filter((m: any) => {
        if (!activeLeagueId) return true;
        return !m.league_id || String(m.league_id) === String(activeLeagueId);
      });

      // Inizializza mappa statistiche a 0 per tutti
      const stats: Record<string, { pg: number; v: number; p: number; s: number; mvp: number }> = {};
      players.forEach((p: any) => {
        stats[String(p.id)] = {
          pg: 0,
          v: 0,
          p: 0,
          s: 0,
          mvp: Number(p.mvp_count || 0),
        };
      });

      // Funzione helper per estrarre l'ID di un giocatore
      const extractId = (item: any): string | null => {
        if (!item) return null;
        if (typeof item === 'string' || typeof item === 'number') return String(item);
        if (typeof item === 'object') {
          const raw = item.id || item.player_id || item._id;
          return raw ? String(raw) : null;
        }
        return null;
      };

      // C. Calcola i risultati da qualsiasi partita conclusa o simulata
      matches.forEach((m: any) => {
        const rawScore1 = m.score_team1 ?? m.score_team_a;
        const rawScore2 = m.score_team2 ?? m.score_team_b;

        const hasScore = rawScore1 !== null && rawScore1 !== undefined && rawScore2 !== null && rawScore2 !== undefined;
        const isCompleted =
          m.status === 'completed' ||
          m.status === 'finished' ||
          (hasScore && (Number(rawScore1) > 0 || Number(rawScore2) > 0 || m.status !== 'scheduled'));

        if (!isCompleted) return;

        const s1 = Number(rawScore1 ?? 0);
        const s2 = Number(rawScore2 ?? 0);
        const isDraw = s1 === s2;
        const t1Won = s1 > s2;
        const t2Won = s2 > s1;

        // Gestione Squadra 1 (team1_players, team_a, team1)
        let t1List = m.team1_players ?? m.team_a ?? m.team1 ?? [];
        if (typeof t1List === 'string') {
          try { t1List = JSON.parse(t1List); } catch (e) { t1List = []; }
        }
        if (Array.isArray(t1List)) {
          t1List.forEach((rawP: any) => {
            const pId = extractId(rawP);
            if (pId && stats[pId]) {
              stats[pId].pg += 1;
              if (isDraw) stats[pId].p += 1;
              else if (t1Won) stats[pId].v += 1;
              else stats[pId].s += 1;
            }
          });
        }

        // Gestione Squadra 2 (team2_players, team_b, team2)
        let t2List = m.team2_players ?? m.team_b ?? m.team2 ?? [];
        if (typeof t2List === 'string') {
          try { t2List = JSON.parse(t2List); } catch (e) { t2List = []; }
        }
        if (Array.isArray(t2List)) {
          t2List.forEach((rawP: any) => {
            const pId = extractId(rawP);
            if (pId && stats[pId]) {
              stats[pId].pg += 1;
              if (isDraw) stats[pId].p += 1;
              else if (t2Won) stats[pId].v += 1;
              else stats[pId].s += 1;
            }
          });
        }

        // MVP partita
        const mvpId = extractId(m.mvp_player_id || m.mvp_id);
        if (mvpId && stats[mvpId]) {
          stats[mvpId].mvp += 1;
        }
      });

      const rows = players.map((p: any) => {
        const s = stats[String(p.id)] || { pg: 0, v: 0, p: 0, s: 0, mvp: 0 };
        const punti = (s.v * 3) + (s.p * 1);

        return {
          id: p.id,
          name: p.name,
          pg: s.pg,
          v: s.v,
          p: s.p,
          s: s.s,
          mvp: s.mvp,
          punti,
        };
      });

      // Ordinamento: Punti DESC, Vittorie DESC, MVP DESC, PG ASC, Nome ASC
      rows.sort((a, b) => {
        if (b.punti !== a.punti) return b.punti - a.punti;
        if (b.v !== a.v) return b.v - a.v;
        if (b.mvp !== a.mvp) return b.mvp - a.mvp;
        return a.pg - b.pg;
      });

      return rows;
    },
  });

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      {/* Header Schermata */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-3">
        <div>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider block">
            {season?.name || currentLeague?.name || 'ALCI 2026'}
          </span>
          <h1 className="font-bebas text-4xl text-white tracking-wider">CLASSIFICA</h1>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs font-mono text-white bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 hover:border-amber-400 transition"
        >
          Aggiorna
        </button>
      </div>

      {/* Tabella Classifica Minimale & Bianca */}
      {isLoading ? (
        <div className="text-center py-12 text-white font-bebas text-xl animate-pulse">
          CARICAMENTO CLASSIFICA...
        </div>
      ) : !standings || standings.length === 0 ? (
        <div className="text-center py-10 bg-[#131926] border border-slate-800 rounded-2xl text-white text-xs italic">
          Nessun giocatore registrato nella lega.
        </div>
      ) : (
        <div className="bg-[#131926] border border-[#20293d] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#20293d] bg-[#0d121c] text-white font-bold text-[11px] tracking-wider">
                  <th className="py-3 px-3 text-center w-8">#</th>
                  <th className="py-3 px-3 text-white">GIOCATORE</th>
                  <th className="py-3 px-2 text-center text-white" title="Partite Giocate">PG</th>
                  <th className="py-3 px-2 text-center text-white" title="Vittorie">V</th>
                  <th className="py-3 px-2 text-center text-white" title="Pareggi">P</th>
                  <th className="py-3 px-2 text-center text-white" title="Sconfitte">S</th>
                  <th className="py-3 px-2 text-center text-white" title="MVP">MVP</th>
                  <th className="py-3 px-3 text-center text-white font-black">PUNTI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20293d]/60 font-mono text-white">
                {standings.map((player: any, idx: number) => {
                  const rank = idx + 1;

                  return (
                    <tr key={player.id} className="hover:bg-[#1a2233]/40 transition">
                      {/* Posizione */}
                      <td className="py-3 px-3 text-center font-bebas text-lg text-white">
                        {rank}
                      </td>

                      {/* Nome Giocatore Grande */}
                      <td className="py-3 px-3 font-sans">
                        <span className="font-bold text-base text-white truncate block max-w-[140px] sm:max-w-[180px]">
                          {player.name}
                        </span>
                      </td>

                      {/* Partite Giocate */}
                      <td className="py-3 px-2 text-center text-white">
                        {player.pg}
                      </td>

                      {/* Vittorie */}
                      <td className="py-3 px-2 text-center text-white font-bold">
                        {player.v}
                      </td>

                      {/* Pareggi */}
                      <td className="py-3 px-2 text-center text-white">
                        {player.p}
                      </td>

                      {/* Sconfitte */}
                      <td className="py-3 px-2 text-center text-white">
                        {player.s}
                      </td>

                      {/* MVP */}
                      <td className="py-3 px-2 text-center text-white font-bold">
                        {player.mvp}
                      </td>

                      {/* Punti */}
                      <td className="py-3 px-3 text-center font-bebas text-xl text-white font-bold">
                        {player.punti}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
