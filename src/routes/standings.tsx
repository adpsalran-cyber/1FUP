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

  // 2. Recupera tutti i giocatori della lega (anche a 0 presenze)
  const { data: standings, isLoading } = useQuery({
    queryKey: ['standings_table', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return [];

      const { data: players, error } = await supabase
        .from('players')
        .select('*')
        .eq('league_id', activeLeagueId);

      if (error || !players) return [];

      const rows = players.map((p: any) => {
        const pg = Number(p.matches_played || 0);
        const v = Number(p.wins || 0);
        const p_draw = Number(p.draws || 0);
        const s = Number(p.losses || Math.max(0, pg - v - p_draw));
        const mvp = Number(p.mvp_count || 0);
        const punti = (v * 3) + (p_draw * 1);

        return {
          id: p.id,
          name: p.name,
          pg,
          v,
          p: p_draw,
          s,
          mvp,
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

                      {/* Nome Giocatore Grande (Senza ruolo o altro) */}
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
