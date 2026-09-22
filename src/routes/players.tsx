import React, { useState, useEffect } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerInput } from '../lib/engine';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players',
  component: PlayersPage,
});

function PlayersPage() {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['players_all'],
    queryFn: async () => {
      const res = await supabase
        .from('players')
        .select('*');
      
      if (res.error) {
        throw new Error(res.error.message);
      }
      return res.data || [];
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (playerId: string) => {
      if (!currentUserId) throw new Error('Devi effettuare il login per collegare il profilo.');
      
      const { error: rpcError } = await supabase.rpc('claim_player', {
        p_player_id: playerId,
        p_user_id: currentUserId,
      });

      if (rpcError) {
        const { error: updateError } = await supabase
          .from('players')
          .update({ user_id: currentUserId, is_dummy: false })
          .eq('id', playerId);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      alert('Profilo collegato con successo!');
      setSelectedPlayer(null);
      refetch();
    },
    onError: (err: any) => {
      alert(`Errore claim: ${err.message}`);
    },
  });

  const getRoleCode = (pos: string) => {
    switch (pos) {
      case 'Portiere': return 'POR';
      case 'Difensore': return 'DIF';
      case 'Centrocampista': return 'CEN';
      case 'Attaccante': return 'ATT';
      default: return 'UNI';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-amber-400 font-bebas text-xl animate-pulse">
        CARICAMENTO PLAYERS IN CORSO...
      </div>
    );
  }

  const playersList = data || [];

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="border-b border-[#222c42] pb-3 flex justify-between items-end">
        <div>
          <h1 className="font-bebas text-3xl text-slate-100">PLAYERS</h1>
          <p className="text-xs text-slate-400">Tocca una carta per visualizzare dettagli o riscattarla</p>
        </div>
        <button
          onClick={() => refetch()}
          className="font-bebas text-amber-400 text-sm bg-[#151b28] px-3 py-1 rounded-lg border border-[#222c42]"
        >
          AGGIORNA ({playersList.length})
        </button>
      </div>

      {/* Box di debug se c'è un errore o se la tabella è vuota */}
      {error && (
        <div className="p-3 rounded-lg bg-red-950/70 border border-red-700 text-red-200 text-xs">
          <strong>Errore Supabase:</strong> {(error as any).message}
        </div>
      )}

      {playersList.length === 0 ? (
        <div className="bg-[#151b28] border border-[#222c42] rounded-xl p-8 text-center space-y-3">
          <p className="font-bebas text-xl text-slate-300">NESSUNA CARTA TROVATA</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            La tabella <code>players</code> su Supabase è attualmente vuota o bloccata dai permessi RLS.
          </p>
          <div className="pt-2">
            <span className="text-[11px] text-amber-400 bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-800">
              Controlla se in Admin il giocatore compare nella lista "ROSA GIOCATORI"
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {playersList.map((p: any) => {
            const isGk = p.position === 'Portiere';
            const roleCode = getRoleCode(p.position);

            const cardInput: PlayerInput = {
              id: p.id,
              nickname: p.name || 'Giocatore',
              role: roleCode as any,
              isEligible: true,
              isGuest: Boolean(p.is_dummy),
              matchesPlayed: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              mvpCount: 0,
              consecutiveAbsences: 0,
              currentFormModifier: 0,
              attributes: isGk ? {
                rif: 75,
                pos: 72,
                agg: 68,
                pas: 65,
                usc: 70,
                com: 74,
              } : {
                pac: 75,
                sho: p.position === 'Attaccante' ? 82 : 68,
                pas: 72,
                dri: 75,
                def: p.position === 'Difensore' ? 80 : 65,
                phy: 74,
              },
            };

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlayer(p)}
                className="cursor-pointer transition-transform active:scale-95"
              >
                <PlayerCard player={cardInput} />
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dettagli / Claim */}
      {selectedPlayer && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPlayer(null)}
        >
          <div 
            className="bg-[#151b28] border border-[#222c42] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-[#222c42] pb-3">
              <div>
                <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">
                  #{selectedPlayer.number || 10} • {selectedPlayer.position || 'Giocatore'}
                </span>
                <h3 className="font-bebas text-3xl text-slate-100 leading-tight">
                  {selectedPlayer.name}
                </h3>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                  selectedPlayer.is_dummy ? 'bg-amber-900/60 text-amber-300' : 'bg-emerald-900/60 text-emerald-300'
                }`}>
                  {selectedPlayer.is_dummy ? 'Profilo Fittizio' : 'Giocatore Registrato'}
                </span>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="w-8 h-8 rounded-full bg-[#0b0e14] border border-[#222c42] text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#0b0e14] border border-[#222c42] p-2.5 rounded-lg">
                <span className="text-slate-500 uppercase text-[10px] block">Piede</span>
                <span className="text-slate-200 font-semibold">{selectedPlayer.preferred_foot || 'Destro'}</span>
              </div>
              <div className="bg-[#0b0e14] border border-[#222c42] p-2.5 rounded-lg">
                <span className="text-slate-500 uppercase text-[10px] block">Archetipo</span>
                <span className="text-slate-200 font-semibold">{selectedPlayer.archetype || 'Universale'}</span>
              </div>
            </div>

            {selectedPlayer.is_dummy && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <p className="text-xs text-amber-300 text-center font-medium">
                  Questo profilo è libero. Vuoi collegarlo al tuo account?
                </p>
                <button
                  disabled={claimMutation.isPending}
                  onClick={() => claimMutation.mutate(selectedPlayer.id)}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bebas text-lg rounded-xl tracking-wider shadow-lg transition disabled:opacity-50"
                >
                  {claimMutation.isPending ? 'COLLEGAMENTO...' : 'COLLEGA AL MIO ACCOUNT'}
                </button>
              </div>
            )}

            <button
              onClick={() => setSelectedPlayer(null)}
              className="w-full py-2 bg-[#0b0e14] text-slate-400 font-semibold text-xs rounded-xl hover:text-white transition"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
