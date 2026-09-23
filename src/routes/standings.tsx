import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/standings',
  component: StandingsPage,
});

function StandingsPage() {
  const queryClient = useQueryClient();
  const [newSeasonName, setNewSeasonName] = useState('');
  const [creatingSeason, setCreatingSeason] = useState(false);

  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('alci_user_role') === 'admin';

  // 1. Carica le stagioni della lega
  const { data: seasons } = useQuery({
    queryKey: ['seasons', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return [];
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('league_id', activeLeagueId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  const activeSeason = seasons?.find((s: any) => s.is_active) || seasons?.[0];

  // 2. Creazione Nuova Stagione (Admin)
  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonName.trim() || !activeLeagueId) return;

    setCreatingSeason(true);
    try {
      // Disattiva le altre stagioni
      await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('league_id', activeLeagueId);

      // Crea e attiva la nuova
      const { error } = await supabase.from('seasons').insert({
        league_id: activeLeagueId,
        name: newSeasonName.trim(),
        is_active: true,
      });

      if (error) throw error;
      setNewSeasonName('');
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      alert('Nuova stagione creata e attivata con successo!');
    } catch (err: any) {
      alert(`Errore creazione stagione: ${err.message}`);
    } finally {
      setCreatingSeason(false);
    }
  };

  // 3. Carica tutti i giocatori della lega (anche quelli con 0 partite)
  const { data: standings, isLoading } = useQuery({
    queryKey: ['standings_players', activeLeagueId, activeSeason?.id],
    queryFn: async () => {
      if (!activeLeagueId) return [];

      // Recupera tutti i giocatori della rosa della lega
      const { data: players, error } = await supabase
        .from('players')
        .select('id, name, role, overall, matches_played, wins, draws, losses, mvp_count')
        .eq('league_id', activeLeagueId)
        .order('overall', { ascending: false });

      if (error) return [];

      // Mappiamo i dati assicurandoci che ogni colonna abbia un valore numerico
      const rows = (players || []).map((p: any) => {
        const pg = p.matches_played || 0;
        const v = p.wins || 0;
        const p_draw = p.draws || 0;
        const s = p.losses || Math.max(0, pg - v - p_draw);
        const mvp = p.mvp_count || 0;
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

      // Ordinamento classifica: Punti DESC, poi Vittorie DESC, poi PG ASC, poi Nome ASC
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
    <div className="space-y-6 pb-20 max-w-lg mx-auto">
      {/* Header Classifica */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-3">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
            {activeSeason ? activeSeason.name : 'STAGIONE GENERALE'}
          </span>
          <h1 className="font-bebas text-4xl text-slate-100 tracking-wider">CLASSIFICA</h1>
        </div>

        {activeSeason && (
          <span className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded tracking-wide">
            IN CORSO
          </span>
        )}
      </div>

      {/* Box Admin: Creazione e Gestione Stagione */}
      {isAdmin && (
        <div className="bg-[#131926] border border-amber-400/30 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              ⚙️ Gestione Stagione (Admin)
            </span>
          </div>

          <form onSubmit={handleCreateSeason} className="flex gap-2">
            <input
              type="text"
              placeholder="Es. Stagione 2026/2027..."
              value={newSeasonName}
              onChange={(e) => setNewSeasonName(e.target.value)}
              className="flex-1 bg-[#0b0e14] border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
              required
            />
            <button
              type="submit"
              disabled={creatingSeason}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm px-4 py-2 rounded-xl font-bold transition shadow"
            >
              {creatingSeason ? 'SALVATAGGIO...' : 'CREA STAGIONE'}
            </button>
          </form>

          {/* Elenco o selettore stagioni se presenti */}
          {seasons && seasons.length > 1 && (
            <div className="flex items-center gap-2 pt-1 overflow-x-auto no-scrollbar text-xs">
              <span className="text-slate-400 text-[11px]">Archivio:</span>
              {seasons.map((s: any) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={async () => {
                    await supabase.from('seasons').update({ is_active: false }).eq('league_id', activeLeagueId);
                    await supabase.from('seasons').update({ is_active: true }).eq('id', s.id);
                    queryClient.invalidateQueries({ queryKey: ['seasons'] });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    s.is_active
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-[#0b0e14] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabella Classifica Generale */}
      {isLoading ? (
        <div className="text-center py-12 text-amber-400 font-bebas text-xl animate-pulse">
          CARICAMENTO CLASSIFICA...
        </div>
      ) : !standings || standings.length === 0 ? (
        <div className="text-center py-10 bg-[#131926] border border-slate-800 rounded-2xl text-slate-500 text-xs italic">
          Nessun giocatore registrato in questa lega. Aggiungi i giocatori dalla rosa!
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
                  <th className="py-3 px-2 text-center text-yellow-300" title="Miglior Giocatore">MVP</th>
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
                    <tr
                      key={player.id}
                      className="hover:bg-[#1a2233]/50 transition"
                    >
                      {/* Posizione */}
                      <td className={`py-3 px-3 text-center font-bebas text-base ${rankColor}`}>
                        {rank}
                      </td>

                      {/* Nome Giocatore e Ruolo */}
                      <td className="py-3 px-3 font-sans">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5 truncate max-w-[120px] sm:max-w-[160px]">
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

                      {/* Punti Totali */}
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
