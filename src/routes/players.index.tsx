import React from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { queryKeys, supabase } from '../lib/actions';
import { PlayerCard } from '../components/PlayerCard';
import { PlayerInput } from '../lib/engine';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players',
  component: PlayersPage,
});

function PlayersPage() {
  const LEAGUE_ID = '00000000-0000-0000-0000-000000000001';

  const { data: members, isLoading } = useQuery({
    queryKey: queryKeys.members(LEAGUE_ID),
    queryFn: async () => {
      const { data } = await supabase
        .from('league_members')
        .select('*, profiles(nickname)')
        .eq('league_id', LEAGUE_ID)
        .eq('is_guest', false);
      return data || [];
    },
  });

  if (isLoading) return <div className="p-6 text-center text-slate-400">Caricamento carte giocatori...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="border-b border-[#222c42] pb-3">
        <h1 className="font-bebas text-3xl text-slate-100">ROSTER & CARTE FUT</h1>
        <p className="text-xs text-slate-400">Valutazioni dinamiche e statistiche individuali</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {members?.map((m: any) => {
          const player: PlayerInput = {
            id: m.id,
            nickname: m.profiles?.nickname || 'Giocatore',
            role: m.role || 'UNI',
            isEligible: m.is_eligible,
            isGuest: m.is_guest,
            matchesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            mvpCount: 0,
            consecutiveAbsences: m.consecutive_absences || 0,
            currentFormModifier: m.form_modifier || 0,
            attributes: m.role === 'POR' ? {
              rif: m.attr_rif || 60,
              pos: m.attr_pos || 60,
              agg: m.attr_agg || 60,
              pas: m.attr_gk_pas || 60,
              usc: m.attr_usc || 60,
              com: m.attr_com || 60,
            } : {
              pac: m.attr_pac || 60,
              sho: m.attr_sho || 60,
              pas: m.attr_pas || 60,
              dri: m.attr_dri || 60,
              def: m.attr_def || 60,
              phy: m.attr_phy || 60,
            },
          };

          return <PlayerCard key={m.id} player={player} />;
        })}
      </div>
    </div>
  );
}
