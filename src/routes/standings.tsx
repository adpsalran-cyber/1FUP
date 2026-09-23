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
          role: p.role || 'ATT',
          pg,
          v,
          p: p_draw,
          s,
          mvp,
          punti,
        };
      });

      // Ordinamento: Punti DESC, poi Vittorie DESC, poi MVP DESC
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
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-3">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
            {season?.name || 'STAGIONE IN CORSO'}
          </span>
          <h1 className="font-bebas text-4xl text-slate-100 tracking-wider">CLASSIFICA</h1>
        </div>
        <span className="text-[10px] font-bold text-slate-400 font-mono bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
          TOTALE: {standings?.length || 0}
        </span>
      </div>

      {/* Tabella Classifica */}
      {isLoading ? (
        <div className="text-center py-12 text-amber-400 font-bebas text-xl animate-pulse">
          CARICAMENTO CLASSIFICA...
        </div>
      ) : !standings || standings.length === 0 ? (
        <div className="text-center py-10 bg-[#131926] border border-slate-800 rounded-2xl text-slate-400 text-xs italic">
          Nessun giocatore registrato nella lega. Aggiungili dal pannello Admin!
        </div>
      ) : (
        <div className="bg-[#131926] border border-[#20293d] rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#20293d] bg-[#0d121c] text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3 text-center w-8">#</th>
                  <th className="py-3 px-3">Giocatore</th>
                  <th className="py-3 px-2 text-center" title="Partite Giocate">PG</th>
                  <th className="py-3 px-2 text-center text-emerald-400" title="Vittorie">V</th>
                  <th className="py-3 px-2 text-center text-amber-400" title="Pareggi">P</th>
                  <th className="py-3 px-2 text-center text-rose-400" title="Sconfitte">S</th>
                  <th className="py-3 px-2 text-center text-yellow-300" title="MVP">MVP</th>
                  <th className="py-3 px-3 text-center text-amber-400 font-black">PUNTI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#20293d]/60 font-mono text-slate-200">
                {standings.map((player: any, idx: number) => {
                  const rank = idx + 1;
                  const isPodium = rank <= 3;
                  const rankColor =
                    rank === 1
                      ? 'text-amber-400 font-bold'
                      : rank === 2
                      ? 'text-slate-300 font-bold'
                      : rank === 3
                      ? 'text-amber-600 font-bold'
                      : 'text-slate-500';

                  return (
                    <tr key={player.id} className="hover:bg-[#1a2233]/50 transition">
                      {/* Posizione */}
                      <td className={`py-3 px-3 text-center font-bebas text-base ${rankColor}`}>
                        {rank}
                      </td>

                      {/* Nome Giocatore e Ruolo */}
                      <td className="py-3 px-3 font-sans">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5 truncate max-w-[120px] sm:max-w-[150px]">
                          {player.name}
                          {isPodium && (
                            <span className="text-[10px]">
                              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono uppercase">
                          {player.role}
                        </span>
                      </td>

                      {/* Partite Giocate */}
                      <td className="py-3 px-2 text-center text-slate-300 font-medium">
                        {player.pg}
                      </td>

                      {/* Vittorie */}
                      <td className="py-3 px-2 text-center text-emerald-400 font-bold">
                        {player.v}
                      </td>

                      {/* Pareggi */}
                      <td className="py-3 px-2 text-center text-amber-300">
                        {player.p}
                      </td>

                      {/* Sconfitte */}
                      <td className="py-3 px-2 text-center text-rose-400">
                        {player.s}
                      </td>

                      {/* MVP */}
                      <td className="py-3 px-2 text-center text-yellow-300 font-bold">
                        {player.mvp}
                      </td>

                      {/* Punti */}
                      <td className="py-3 px-3 text-center font-bebas text-lg text-amber-400 font-bold">
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
