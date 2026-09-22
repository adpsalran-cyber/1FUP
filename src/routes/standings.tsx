import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { queryKeys, supabase } from '../lib/actions';
import { calculateOfficialStandings, calculateGeneralStandings, PlayerInput } from '../lib/engine';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/standings',
  component: StandingsPage,
});

function StandingsPage() {
  const LEAGUE_ID = '00000000-0000-0000-0000-000000000001';
  const [tab, setTab] = useState<'official' | 'general'>('official');

  const { data: members, isLoading } = useQuery({
    queryKey: queryKeys.members(LEAGUE_ID),
    queryFn: async () => {
      const { data } = await supabase
        .from('league_members')
        .select('*, profiles(nickname)')
        .eq('league_id', LEAGUE_ID);
      return data || [];
    },
  });

  const players: PlayerInput[] = (members || []).map((m: any) => ({
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
    attributes: { pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 },
  }));

  const officialRows = calculateOfficialStandings(players);
  const generalRows = calculateGeneralStandings(players);

  if (isLoading) return <div className="p-6 text-center text-slate-400">Calcolo classifiche in corso...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="border-b border-[#222c42] pb-3">
        <h1 className="font-bebas text-3xl text-slate-100">CLASSIFICHE ALCI</h1>
        <div className="flex bg-[#151b28] p-1 rounded-xl border border-[#222c42] mt-2">
          <button
            onClick={() => setTab('official')}
            className={`flex-1 py-1.5 rounded-lg font-bebas text-base transition-colors ${
              tab === 'official' ? 'bg-lime-400 text-black font-bold' : 'text-slate-400'
            }`}
          >
            UFFICIALE (PPM & MALUS)
          </button>
          <button
            onClick={() => setTab('general')}
            className={`flex-1 py-1.5 rounded-lg font-bebas text-base transition-colors ${
              tab === 'general' ? 'bg-lime-400 text-black font-bold' : 'text-slate-400'
            }`}
          >
            GENERALE (PUNTI TOTALI)
          </button>
        </div>
      </div>

      {tab === 'official' ? (
        <div className="space-y-2">
          {officialRows.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-[#151b28] rounded-xl border border-[#222c42]">
              Dati insufficienti per la classifica ufficiale (almeno 1 partita richiesta).
            </div>
          ) : (
            officialRows.map((row) => (
              <div key={row.playerId} className="p-3 rounded-xl bg-[#151b28] border border-[#222c42] flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <span className={`font-bebas text-2xl w-6 ${row.position === 1 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {row.position}
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-slate-100">{row.nickname}</p>
                    <p className="text-[10px] text-slate-400">P.Reali: {row.realPoints} | Pres: {row.matchesPlayed}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bebas text-2xl text-lime-400">{row.pointsPerMatch}</span>
                  <span className="block text-[10px] text-slate-400">PPM</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {generalRows.map((row) => (
            <div key={row.playerId} className="p-3 rounded-xl bg-[#151b28] border border-[#222c42] flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <span className={`font-bebas text-2xl w-6 ${row.position === 1 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {row.position}
                </span>
                <div>
                  <p className="font-semibold text-sm text-slate-100">{row.nickname}</p>
                  <p className="text-[10px] text-slate-400">V: {row.wins} | P: {row.draws} | S: {row.losses}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bebas text-2xl text-amber-400">{row.totalPoints}</span>
                <span className="block text-[10px] text-slate-400">PUNTI</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
