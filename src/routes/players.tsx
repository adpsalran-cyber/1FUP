import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';
import { ARCHETYPES } from '../lib/engine';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players',
  component: PlayersPage,
});

function PlayersPage() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('alci_user_role') === 'admin';

  // Carica i giocatori della lega attiva
  const { data: players, isLoading } = useQuery({
    queryKey: ['players_list', activeLeagueId],
    queryFn: async () => {
      let query = supabase.from('players').select('*');
      if (activeLeagueId) {
        query = query.eq('league_id', activeLeagueId);
      }
      const { data, error } = await query.order('overall', { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  // Mutazione elimina giocatore (solo Admin)
  const deletePlayerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players_list'] });
    },
    onError: (err: any) => alert(`Errore eliminazione: ${err.message}`),
  });

  const filteredPlayers = (players || []).filter((p: any) => {
    const matchRole = selectedRole === 'ALL' || p.role === selectedRole;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-3">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
            ROSA UFFICIALE
          </span>
          <h1 className="font-bebas text-3xl text-slate-100">PLAYERS</h1>
        </div>
        <span className="font-mono text-xs text-slate-400">
          Totale: <strong className="text-amber-400">{filteredPlayers.length}</strong>
        </span>
      </div>

      {/* Filtri e Ricerca */}
      <div className="flex flex-col gap-2.5">
        <input
          type="text"
          placeholder="Cerca giocatore..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#121721] border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
        />

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {['ALL', 'POR', 'DIF', 'CEN', 'ATT'].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1 rounded-lg font-bebas text-sm transition ${
                selectedRole === role
                  ? 'bg-amber-400 text-slate-950 font-bold shadow'
                  : 'bg-[#121721] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Carte Giocatore */}
      {isLoading ? (
        <div className="text-center py-10 text-amber-400 font-bebas text-xl animate-pulse">
          CARICAMENTO CARTELLINI...
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-xs italic">
          Nessun giocatore trovato con questi filtri.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredPlayers.map((player: any) => {
            const arch = ARCHETYPES[player.archetype];
            return (
              <div
                key={player.id}
                className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#121721] p-4 shadow-lg hover:border-amber-400/50 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bebas text-4xl text-amber-400 leading-none">
                        {player.overall || 70}
                      </span>
                      <span className="font-bebas text-lg text-slate-300">
                        {player.role || 'ATT'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">
                        ARCHETIPO
                      </span>
                      <span className="font-bebas text-sm text-lime-400">
                        {arch ? arch.name : player.archetype || 'Universale'}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bebas text-2xl text-slate-100 uppercase tracking-wide truncate">
                    {player.name}
                  </h3>

                  {/* Griglia Attributi */}
                  <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
                    {player.attributes &&
                      Object.entries(player.attributes).map(([stat, val]: any) => (
                        <div
                          key={stat}
                          className="bg-[#0b0e14] border border-slate-800/80 p-1.5 rounded-lg"
                        >
                          <span className="block text-[9px] font-bold text-slate-400 uppercase">
                            {stat}
                          </span>
                          <span className="font-bebas text-base text-amber-300 font-bold">
                            {val}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Footer Cartellino & Azioni Admin */}
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                  <span>Intesa: <strong className="text-slate-200">{player.teamwork || 'Medio'}</strong></span>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Vuoi davvero eliminare ${player.name}?`)) {
                          deletePlayerMutation.mutate(player.id);
                        }
                      }}
                      className="text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider"
                    >
                      Elimina
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
