import React, { useState, useEffect } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';
import { PlayerCard } from '../components/PlayerCard';
import { ARCHETYPES, MainRole, generateAttributesFromOverall, calculateArchetypeOverall } from '../lib/engine';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players',
  component: PlayersPage,
});

function PlayersPage() {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);

  const leagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['players_all', leagueId],
    queryFn: async () => {
      let query = supabase.from('players').select('*');
      if (leagueId) {
        query = query.eq('league_id', leagueId);
      }
      const res = await query.order('name');
      if (res.error) throw new Error(res.error.message);
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
      queryClient.invalidateQueries({ queryKey: ['players_all'] });
    },
    onError: (err: any) => {
      alert(`Errore claim: ${err.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-amber-400 font-bebas text-xl animate-pulse">
        CARICAMENTO PLAYERS IN CORSO...
      </div>
    );
  }

  const playersList = data || [];

  return (
    <div className="p-4 space-y-4 pb-24 max-w-2xl mx-auto">
      {/* Header */}
      <div className="border-b border-[#222c42] pb-3 flex justify-between items-end">
        <div>
          <h1 className="font-bebas text-3xl text-slate-100">PLAYERS</h1>
          <p className="text-xs text-slate-400">Tocca una carta per visualizzare dettagli o riscattarla</p>
        </div>
        <button
          onClick={() => refetch()}
          className="font-bebas text-amber-400 text-sm bg-[#151b28] px-3 py-1 rounded-lg border border-[#222c42] hover:border-amber-400 transition"
        >
          AGGIORNA ({playersList.length})
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-950/70 border border-red-700 text-red-200 text-xs">
          <strong>Errore:</strong> {(error as any).message}
        </div>
      )}

      {playersList.length === 0 ? (
        <div className="bg-[#151b28] border border-[#222c42] rounded-xl p-8 text-center space-y-3">
          <p className="font-bebas text-xl text-slate-300">NESSUNA CARTA TROVATA</p>
          <p className="text-xs text-slate-400">Nessun giocatore registrato in questa lega.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {playersList.map((p: any) => {
            const archKey = p.archetype || 'ATT_BOMBER';
            const archDef = ARCHETYPES[archKey];
            const roleCode: MainRole = (p.role as MainRole) || archDef?.role || 'ATT';
            const isGk = roleCode === 'POR';

            // Recupera gli attributi salvati, o fallback generati partendo dall'overall
            const playerAttrs = p.attributes && Object.keys(p.attributes).length > 0
              ? p.attributes
              : generateAttributesFromOverall(archKey, p.overall || 70);

            const calculatedOvr = p.overall ?? calculateArchetypeOverall(archKey, playerAttrs);

            const cardInput: any = {
              id: p.id,
              nickname: p.name || 'Giocatore',
              role: roleCode,
              archetype: archKey,
              overall: calculatedOvr,
              isEligible: true,
              isGuest: Boolean(p.is_dummy),
              matchesPlayed: p.matches_played || 0,
              wins: p.wins || 0,
              draws: p.draws || 0,
              losses: p.losses || 0,
              mvpCount: p.mvp_count || 0,
              consecutiveAbsences: 0,
              currentFormModifier: 0,
              teamworkTendency: p.teamwork || 'Medio',
              gkEfficiency: p.gk_efficiency || (isGk ? 'Alta' : 'Media'),
              attributes: playerAttrs,
            };

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlayer({ ...p, cardData: cardInput })}
                className="cursor-pointer transition-transform active:scale-95"
              >
                <PlayerCard player={cardInput} />
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dettagli / Claim (SENZA NUMERO DI MAGLIA) */}
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">
                    {selectedPlayer.cardData?.role || selectedPlayer.role || 'ATT'}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs text-slate-300 font-semibold">
                    {ARCHETYPES[selectedPlayer.archetype]?.name || selectedPlayer.archetype || 'Archetipo'}
                  </span>
                </div>
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
                <span className="text-slate-500 uppercase text-[10px] block">Overall Effettivo</span>
                <span className="text-amber-400 font-bebas text-xl">
                  {selectedPlayer.cardData?.overall || selectedPlayer.overall || 70}
                </span>
              </div>
              <div className="bg-[#0b0e14] border border-[#222c42] p-2.5 rounded-lg">
                <span className="text-slate-500 uppercase text-[10px] block">Piede Preferito</span>
                <span className="text-slate-200 font-semibold mt-1 block">
                  {selectedPlayer.preferred_foot || 'Destro'}
                </span>
              </div>
              <div className="bg-[#0b0e14] border border-[#222c42] p-2.5 rounded-lg">
                <span className="text-slate-500 uppercase text-[10px] block">Gioco di Squadra</span>
                <span className="text-slate-200 font-semibold">{selectedPlayer.teamwork || 'Medio'}</span>
              </div>
              <div className="bg-[#0b0e14] border border-[#222c42] p-2.5 rounded-lg">
                <span className="text-slate-500 uppercase text-[10px] block">Efficacia Portiere</span>
                <span className="text-slate-200 font-semibold">{selectedPlayer.gk_efficiency || 'Media'}</span>
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
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-lg rounded-xl tracking-wider shadow-lg transition disabled:opacity-50 font-bold"
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
