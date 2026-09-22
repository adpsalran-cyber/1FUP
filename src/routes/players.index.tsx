import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
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
  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('active_league_id') || '00000000-0000-0000-0000-000000000001'
    : '00000000-0000-0000-0000-000000000001';

  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);

  const { data: players, isLoading } = useQuery({
    queryKey: ['players', activeLeagueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('league_id', activeLeagueId)
        .order('is_dummy', { ascending: true })
        .order('name');
      if (error) return [];
      return data || [];
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
      <div className="p-8 text-center text-slate-400 font-bebas text-xl animate-pulse">
        CARICAMENTO PLAYERS...
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="border-b border-[#222c42] pb-3 flex justify-between items-end">
        <div>
          <h1 className="font-bebas text-3xl text-slate-100">PLAYERS & CARTE FUT</h1>
          <p className="text-xs text-slate-400">Tocca una carta per aprire statistiche e dettagli</p>
        </div>
        <span className="font-bebas text-amber-400 text-lg bg-[#151b28] px-3 py-1 rounded-lg border border-[#222c42]">
          {players?.length || 0} CARTE
        </span>
      </div>

      {players && players.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {players.map((p: any) => {
            const isGk = p.position === 'Portiere';
            const roleCode = getRoleCode(p.position);

            const cardInput: PlayerInput = {
              id: p.id,
              nickname: p.name,
              role: roleCode as any,
              isEligible: true,
              isGuest: p.is_dummy,
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
                sho: p.position === 'Attaccante' ? 80 : 68,
                pas: 72,
                dri: 74,
                def: p.position === 'Difensore' ? 80 : 65,
                phy: 73,
              },
            };

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlayer(p)}
                className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-95"
              >
                <PlayerCard player={cardInput} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#151b28] border border-[#222c42] rounded-xl p-8 text-center space-y-2">
          <p className="font-bebas text-xl text-slate-300">NESSUN GIOCATORE PRESENTE</p>
          <p className="text-xs text-slate-500">
            Aggiungi giocatori dalla sezione Admin oppure invita i tuoi compagni con il codice lega.
          </p>
        </div>
      )}

      {/* MODAL DETTAGLI / PROFILO GIOCATORE */}
      {selectedPlayer && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPlayer(null)}
        >
          <div 
            className="bg-[#151b28] border border-[#222c42] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Profilo */}
            <div className="flex justify-between items-start border-b border-[#222c42] pb-3">
              <div>
                <span className="text-xs font-bold text-amber-400 tracking-wider uppercase">
                  #{selectedPlayer.number} • {selectedPlayer.position}
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

            {/* Scheda Caratteristiche */}
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

            {/* Statistiche Riepilogative */}
            <div className="space-y-1.5 bg-[#0b0e14] border border-[#222c42] p-3 rounded-xl text-xs">
              <div className="flex justify-between py-1 border-b border-[#222c42]/60">
                <span className="text-slate-400">Presenze Totali</span>
                <span className="text-slate-200 font-bold">0</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222c42]/60">
                <span className="text-slate-400">Gol Segnati</span>
                <span className="text-slate-200 font-bold">0</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222c42]/60">
                <span className="text-slate-400">Media Voto</span>
                <span className="text-amber-400 font-bold">6.00</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Vittorie / Sconfitte</span>
                <span className="text-slate-200 font-bold">0 / 0</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedPlayer(null)}
              className="w-full py-2.5 bg-amber-400 text-black font-bebas text-lg rounded-xl hover:bg-amber-300 transition"
            >
              CHIUDI SCHEDA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
