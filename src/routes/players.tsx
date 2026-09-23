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
  const [authLoading, setAuthLoading] = useState(true);

  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  const currentRole = typeof window !== 'undefined'
    ? localStorage.getItem('alci_user_role') || 'member'
    : 'member';

  // Sincronizza l'utente sia al mount che al cambio di stato Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 1. Cerca il cartellino collegato all'utente nella lega attiva
  const { data: myPlayer, isLoading: playerLoading, refetch: refetchMyPlayer } = useQuery({
    queryKey: ['my_player_card', currentUser?.id, activeLeagueId],
    enabled: Boolean(currentUser?.id),
    queryFn: async () => {
      if (!currentUser?.id) return null;

      // Cerca per user_id e league_id
      let query = supabase
        .from('players')
        .select('*')
        .eq('user_id', currentUser.id);

      if (activeLeagueId) {
        query = query.eq('league_id', activeLeagueId);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        // Fallback: se user_id non era ancora salvato, cerca per email o nome utente se registrato
        const userName = currentUser.user_metadata?.name || currentUser.user_metadata?.full_name;
        if (userName) {
          const { data: fallbackPlayer } = await supabase
            .from('players')
            .select('*')
            .ilike('name', userName)
            .maybeSingle();

          if (fallbackPlayer) {
            // Auto-associa l'id auth al player
            await supabase.from('players').update({ user_id: currentUser.id }).eq('id', fallbackPlayer.id);
            return fallbackPlayer;
          }
        }
        return null;
      }

      return data;
    },
  });

  // 2. Se non ha un cartellino associato, elenca i cartellini liberi della lega da rivendicare
  const { data: unlinkedPlayers, refetch: refetchUnlinked } = useQuery({
    queryKey: ['unlinked_players', activeLeagueId],
    enabled: Boolean(!myPlayer) && Boolean(currentUser?.id),
    queryFn: async () => {
      let query = supabase.from('players').select('*');
      if (activeLeagueId) {
        query = query.eq('league_id', activeLeagueId);
      }
      const { data, error } = await query.is('user_id', null).order('name');
      if (error) return [];
      return data || [];
    },
  });

  // 3. Mutazione per collegare manualmente il profilo al cartellino
  const linkPlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      if (!currentUser?.id) throw new Error('Utente non autenticato');
      const { error } = await supabase
        .from('players')
        .update({ user_id: currentUser.id, is_dummy: false })
        .eq('id', playerId);

      if (error) throw error;
    },
    onSuccess: () => {
      alert('Cartellino collegato con successo!');
      refetchMyPlayer();
      refetchUnlinked();
      queryClient.invalidateQueries();
    },
    onError: (err: any) => alert(`Errore collegamento: ${err.message}`),
  });

  const archDef = myPlayer ? ARCHETYPES[myPlayer.archetype] : null;

  if (authLoading) {
    return (
      <div className="text-center py-12 text-amber-400 font-bebas text-xl tracking-wider">
        CARICAMENTO PROFILO...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-md mx-auto">
      {/* 1. Box Dati Utente */}
      <div className="bg-[#121721] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              ACCOUNT PERSONALE
            </span>
            <h1 className="font-bebas text-3xl text-slate-100">PROFILO</h1>
          </div>
          <span className="text-xs font-bold font-mono px-2 py-1 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 uppercase">
            {currentRole === 'admin' ? 'Admin' : 'Giocatore'}
          </span>
        </div>

        <div className="bg-[#0b0e14] border border-[#222c42] p-3 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Email:</span>
            <span className="font-mono text-slate-200 font-medium truncate max-w-[200px]">
              {currentUser?.email || 'Nessuna email registrata'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Nome / Username:</span>
            <span className="font-semibold text-slate-100">
              {currentUser?.user_metadata?.name ||
                currentUser?.user_metadata?.full_name ||
                myPlayer?.name ||
                currentUser?.email?.split('@')[0] ||
                'Utente ALCI'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">ID Account:</span>
            <span className="font-mono text-[10px] text-slate-400">
              {currentUser?.id ? currentUser.id.slice(0, 10) + '...' : 'N/D'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Cartellino FUT Giocatore */}
      {playerLoading ? (
        <div className="text-center text-xs text-slate-500 py-6">Caricamento cartellino...</div>
      ) : myPlayer ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              La Tua Carta Ufficiale
            </span>
            <span className="text-[10px] text-lime-400 font-bold bg-lime-400/10 border border-lime-400/20 px-2 py-0.5 rounded">
              COLLEGATA ✓
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-[#1e273a] via-[#121721] to-[#0b0e14] p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bebas text-6xl text-amber-400 leading-none block">
                  {myPlayer.overall || 70}
                </span>
                <span className="font-bebas text-2xl text-slate-200 tracking-wider">
                  {myPlayer.role || 'ATT'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                  ARCHETIPO
                </span>
                <span className="font-bebas text-lg text-lime-400">
                  {archDef ? archDef.name : myPlayer.archetype || 'Universale'}
                </span>
              </div>
            </div>

            <div className="text-center py-2 border-y border-slate-800">
              <h2 className="font-bebas text-3xl text-slate-100 tracking-wide uppercase">
                {myPlayer.name}
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {archDef?.weightsSummary || 'Bilanciato'}
              </span>
            </div>

            {/* Statistiche Archetipo */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {myPlayer.attributes &&
                Object.entries(myPlayer.attributes).map(([stat, val]: any) => (
                  <div key={stat} className="bg-[#0b0e14]/80 border border-slate-800 p-2 rounded-xl">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {stat}
                    </span>
                    <span className="font-bebas text-2xl text-amber-300 font-bold">{val}</span>
                  </div>
                ))}
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span>Intesa: <strong className="text-slate-200">{myPlayer.teamwork || 'Medio'}</strong></span>
              <span>In Porta: <strong className="text-slate-200">{myPlayer.gk_efficiency || 'Media'}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        /* Caso: Non ancora collegato */
        <div className="bg-[#121721] border border-amber-400/40 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider">
              NESSUN CARTELLINO COLLEGATO
            </span>
            <h2 className="font-bebas text-2xl text-slate-100 mt-2">COLLEGA IL TUO PROFILO</h2>
            <p className="text-xs text-slate-400">
              Seleziona il tuo nome dalla rosa per associare la tua carta giocatore a questo account:
            </p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {unlinkedPlayers && unlinkedPlayers.length > 0 ? (
              unlinkedPlayers.map((p: any) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center bg-[#0b0e14] border border-[#222c42] p-2.5 rounded-xl text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-100 block text-sm">{p.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {p.role} • OVR {p.overall}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={linkPlayerMutation.isPending}
                    onClick={() => {
                      if (confirm(`Confermi di voler collegare "${p.name}" al tuo account?`)) {
                        linkPlayerMutation.mutate(p.id);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm rounded-lg font-bold transition shadow"
                  >
                    COLLEGA
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-3 text-center">
                Nessun cartellino libero disponibile. Chiedi all'admin di aggiungerti nella rosa dei giocatori.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
