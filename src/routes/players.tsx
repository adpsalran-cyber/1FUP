import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players',
  component: PlayersPage,
});

function getConditionBadge(formVal: any) {
  const val = String(formVal ?? '0').toLowerCase();

  if (val === 'infortunato' || val === 'injured' || val === 'croce') {
    return (
      <div className="flex items-center gap-1 bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded-md" title="Infortunato">
        <span className="text-sm leading-none font-bold text-red-500">✚</span>
        <span className="text-[10px] font-bold text-red-400">INF</span>
      </div>
    );
  }

  const num = Number(formVal);

  if (val === 'in_forma' || (!isNaN(num) && num > 0)) {
    return (
      <div className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md" title="In forma">
        <span className="text-base leading-none font-bold text-emerald-400">↑</span>
        <span className="text-[10px] font-bold text-emerald-400">TOP</span>
      </div>
    );
  }

  if (val === 'non_in_forma' || (!isNaN(num) && num < 0)) {
    return (
      <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded-md" title="Fuori forma">
        <span className="text-base leading-none font-bold text-rose-500">↓</span>
        <span className="text-[10px] font-bold text-rose-400">DOWN</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-md" title="Normale">
      <span className="text-base leading-none font-bold text-amber-400">→</span>
      <span className="text-[10px] font-bold text-amber-300">OK</span>
    </div>
  );
}

function PlayersPage() {
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);

  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  const { data: players, isLoading, refetch } = useQuery({
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

  return (
    <div className="space-y-4 pb-20 max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start pt-1">
        <div>
          <h1 className="font-bebas text-4xl text-slate-100 tracking-wider">PLAYERS</h1>
          <p className="text-[11px] text-slate-400">
            Tocca una carta per visualizzare dettagli o riscattarla
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="bg-[#151c28] border border-slate-700/80 hover:border-amber-400 text-amber-400 px-3.5 py-1.5 rounded-xl flex flex-col items-center leading-tight shadow transition"
        >
          <span className="font-bebas text-xs tracking-wider">AGGIORNA</span>
          <span className="font-mono text-[10px] text-slate-400">({players?.length || 0})</span>
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-amber-400 font-bebas text-xl animate-pulse">
          CARICAMENTO...
        </div>
      )}

      {/* Lista Carte Giocatore */}
      <div className="space-y-4">
        {players?.map((player: any) => {
          const attrs = player.attributes || {};
          const vel = attrs.VEL ?? attrs.vel ?? 65;
          const tir = attrs.TIR ?? attrs.tir ?? 65;
          const pas = attrs.PAS ?? attrs.pas ?? 65;
          const dri = attrs.DRI ?? attrs.dri ?? 65;
          const dif = attrs.DIF ?? attrs.dif ?? 65;
          const fis = attrs.FIS ?? attrs.fis ?? 65;

          const teamworkText = player.teamwork || 'Medio';
          const gkText = player.gk_efficiency || 'Media';

          return (
            <div
              key={player.id}
              onClick={() => setSelectedPlayer(player)}
              className="bg-[#151c28] border border-[#222c42] rounded-2xl p-5 shadow-xl space-y-4 cursor-pointer hover:border-slate-600 transition"
            >
              {/* OVR + Ruolo a sinistra, Freccia Forma a destra */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bebas text-5xl text-slate-100 leading-none block">
                    {player.overall || 70}
                  </span>
                  <span className="inline-block mt-1 bg-[#1a2d4c] text-sky-400 font-bebas text-xs px-2 py-0.5 rounded tracking-wider">
                    {player.role || 'DIF'}
                  </span>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    FORMA
                  </span>
                  {getConditionBadge(player.form ?? player.condition)}
                </div>
              </div>

              {/* Nome Giocatore */}
              <div className="text-center py-1">
                <h2 className="font-bebas text-3xl text-slate-100 tracking-wider uppercase">
                  {player.name}
                </h2>
              </div>

              {/* Attributi 2 Colonne */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 px-3 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[11px]">VEL</span>
                    <span className="font-mono text-slate-100 font-bold text-sm">{vel}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[11px]">TIR</span>
                    <span className="font-mono text-slate-100 font-bold text-sm">{tir}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[11px]">PAS</span>
                    <span className="font-mono text-slate-100 font-bold text-sm">{pas}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[11px]">DRI</span>
                    <span className="font-mono text-slate-100 font-bold text-sm">{dri}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[11px]">DIF</span>
                    <span className="font-mono text-slate-100 font-bold text-sm">{dif}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold text-[11px]">FIS</span>
                    <span className="font-mono text-slate-100 font-bold text-sm">{fis}</span>
                  </div>
                </div>
              </div>

              {/* Intesa & Portiere */}
              <div className="border-t border-[#222c42] pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Gioco di squadra:</span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    {teamworkText}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Efficacia portiere:</span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-200">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    {gkText}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
