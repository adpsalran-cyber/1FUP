import React, { useState, useEffect } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';
import { ARCHETYPES } from '../lib/engine';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(
    typeof window !== 'undefined'
      ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
      : null
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser(user);
    });
  }, []);

  // 1. Cerca il cartellino giocatore collegato a questo account nella lega attiva
  const { data: myPlayer, refetch: refetchMyPlayer } = useQuery({
    queryKey: ['my_player_card', currentUser?.id, activeLeagueId],
    enabled: Boolean(currentUser?.id) && Boolean(activeLeagueId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('league_id', activeLeagueId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error) return null;
      return data;
    },
  });

  // 2. Se non collegato, carica i cartellini non ancora rivendicati (user_id nullo)
  const { data: unlinkedPlayers, refetch: refetchUnlinked } = useQuery({
    queryKey: ['unlinked_players', activeLeagueId],
    enabled: Boolean(!myPlayer) && Boolean(activeLeagueId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('league_id', activeLeagueId)
        .is('user_id', null)
        .order('name');

      if (error) return [];
      return data || [];
    },
  });

  // 3. Mutazione per collegare l'account al cartellino
  const linkPlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      if (!currentUser?.id) return;
      const { error } = await supabase
        .from('players')
        .update({ user_id: currentUser.id, is_dummy: false })
        .eq('id', playerId);

      if (error) throw error;
    },
    onSuccess: () => {
      alert('Cartellino collegato con successo al tuo account!');
      refetchMyPlayer();
      refetchUnlinked();
      queryClient.invalidateQueries();
    },
    onError: (err: any) => alert(`Errore collegamento: ${err.message}`),
  });

  const archDef = myPlayer ? ARCHETYPES[myPlayer.archetype] : null;

  return (
    <div className="space-y-6 pb-20 max-w-md mx-auto">
      {/* Box Account Utente */}
      <div className="bg-[#121721] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
          ACCOUNT UTENTE
        </span>
        <h1 className="font-bebas text-3xl text-slate-100">PROFILO PERSONALE</h1>
        <div className="bg-[#0b0e14] border border-[#222c42] p-3 rounded-xl space-y-1 text-xs text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Email:</span>
            <span className="font-mono text-slate-100 font-semibold">{currentUser?.email || 'N/D'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Ruolo Lega:</span>
            <span className="font-bold text-amber-400 uppercase">
              {localStorage.getItem('alci_user_role') || 'Membro'}
            </span>
          </div>
        </div>
      </div>

      {/* CASO 1: Cartellino collegato -> Scheda Giocatore */}
      {myPlayer ? (
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Il Tuo Cartellino Ufficiale
          </span>

          <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-gradient-to-b from-[#1c2438] via-[#121721] to-[#0b0e14] p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bebas text-5xl text-amber-400 leading-none block">
                  {myPlayer.overall || 70}
                </span>
                <span className="font-bebas text-xl text-slate-200 tracking-wider">
                  {myPlayer.role || 'ATT'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                  ARCHETIPO
                </span>
                <span className="font-bebas text-lg text-lime-400">
                  {archDef ? archDef.name : myPlayer.archetype || 'Base'}
                </span>
              </div>
            </div>

            <div className="text-center py-2 border-y border-slate-800">
              <h2 className="font-bebas text-3xl text-slate-100 tracking-wide uppercase">
                {myPlayer.name}
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                {archDef?.weightsSummary || 'Statistiche Bilanciate'}
              </span>
            </div>

            {/* Statistiche Archetipo */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {myPlayer.attributes &&
                Object.entries(myPlayer.attributes).map(([stat, val]: any) => (
                  <div key={stat} className="bg-[#0b0e14]/70 border border-slate-800 p-2 rounded-xl">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {stat}
                    </span>
                    <span className="font-bebas text-xl text-amber-300 font-bold">{val}</span>
                  </div>
                ))}
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
              <span>Intesa: <strong className="text-slate-200">{myPlayer.teamwork || 'Medio'}</strong></span>
              <span>Portiere: <strong className="text-slate-200">{myPlayer.gk_efficiency || 'Media'}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        /* CASO 2: Non collegato -> Lista Cartellini da Rivendicare */
        <div className="bg-[#121721] border border-amber-400/40 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider">
              CARTELLINO NON COLLEGATO
            </span>
            <h2 className="font-bebas text-2xl text-slate-100 mt-2">COLLEGA IL TUO GIOCATORE</h2>
            <p className="text-xs text-slate-400">
              Non hai ancora associato il tuo account a un giocatore in questa lega.
              Seleziona il tuo cartellino per collegarlo:
            </p>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {unlinkedPlayers && unlinkedPlayers.length > 0 ? (
              unlinkedPlayers.map((p: any) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center bg-[#0b0e14] border border-[#222c42] p-2.5 rounded-xl text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-100 block">{p.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {p.role} • {p.overall} OVR
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={linkPlayerMutation.isPending}
                    onClick={() => {
                      if (confirm(`Confermi di collegare "${p.name}" al tuo account?`)) {
                        linkPlayerMutation.mutate(p.id);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm rounded-lg font-bold transition shadow"
                  >
                    SONO IO (COLLEGA)
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-2 text-center">
                Nessun cartellino disponibile. Chiedi all'admin di aggiungerti nella rosa.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
