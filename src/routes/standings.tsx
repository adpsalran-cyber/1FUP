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
  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  // 1. Recupera la stagione attiva
  const { data: season } = useQuery({
    queryKey: ['active_season', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return null;
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

  // 2. Recupera tutti i giocatori della lega e calcola dalle partite giocate
  const { data: standings, isLoading } = useQuery({
    queryKey: ['standings_table', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return [];

      // A. Tutti i giocatori della rosa
      const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .eq('league_id', activeLeagueId);

      if (error || !players) return [];

      // B. Tutte le partite concluse
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('league_id', activeLeagueId)
        .eq('status', 'completed');

      // Mappa statistiche inizializzata a 0 per tutti
      const stats: Record<string, { pg: number; v: number; p: number; s: number; mvp: number }> = {};
      players.forEach((p: any) => {
        stats[p.id] = { pg: 0, v: 0, p: 0, s: 0, mvp: Number(p.mvp_count || 0) };
      });

      // Calcola presenze, esiti e punti dalle partite registrate
      if (matches && matches.length > 0) {
        matches.forEach((m: any) => {
          const s1 = Number(m.score_team1 ?? 0);
          const s2 = Number(m.score_team2 ?? 0);
          const isDraw = s1 === s2;
          const t1Won = s1 > s2;
          const t2Won = s2 > s1;

          (m.team1_players || []).forEach((p: any) => {
            if (p?.id && stats[p.id]) {
              stats[p.id].pg += 1;
              if (isDraw) stats[p.id].p += 1;
              else if (t1Won) stats[p.id].v += 1;
              else stats[p.id].s += 1;
            }
          });

          (m.team2_players || []).forEach((p: any) => {
            if (p?.id && stats[p.id]) {
              stats[p.id].pg += 1;
              if (isDraw) stats[p.id].p += 1;
              else if (t2Won) stats[p.id].v += 1;
              else stats[p.id].s += 1;
            }
          });

          if (m.mvp_player_id && stats[m.mvp_player_id]) {
            stats[m.mvp_player_id].mvp += 1;
          }
        });
      }

      const rows = players.map((p: any) => {
        const s = stats[p.id] || { pg: 0, v: 0, p: 0, s: 0, mvp: 0 };
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
            {season?.name || 'STAGIONE GENERALE'}
          </span>
          <h1 className="font-bebas text-4xl text-white tracking-wider">CLASSIFICA</h1>
        </div>
        <span className="text-xs font-mono text-white">
          Totale: <strong>{standings?.length || 0}</strong>
        </span>
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
