import React from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players',
  component: PlayersPage,
});

export function getConditionBadge(formVal: any) {
  const val = String(formVal ?? '0').toLowerCase();

  if (val === 'infortunato' || val === 'injured' || val === 'croce') {
    return (
      <div className="flex items-center gap-1 bg-[#2a151b] border border-red-500/50 px-2 py-0.5 rounded-lg text-red-400">
        <span className="text-xs font-bold leading-none">✚</span>
        <span className="text-[10px] font-bold">INF</span>
      </div>
    );
  }

  const num = Number(formVal);

  if (val === 'in_forma' || (!isNaN(num) && num > 0)) {
    return (
      <div className="flex items-center gap-1 bg-[#102419] border border-emerald-500/50 px-2 py-0.5 rounded-lg text-emerald-400">
        <span className="text-sm font-bold leading-none">↑</span>
        <span className="text-[10px] font-bold">TOP</span>
      </div>
    );
  }

  if (val === 'non_in_forma' || (!isNaN(num) && num < 0)) {
    return (
      <div className="flex items-center gap-1 bg-[#2b1619] border border-rose-500/50 px-2 py-0.5 rounded-lg text-rose-400">
        <span className="text-sm font-bold leading-none">↓</span>
        <span className="text-[10px] font-bold">DOWN</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-[#251d10] border border-amber-500/50 px-2 py-0.5 rounded-lg text-amber-400">
      <span className="text-sm font-bold leading-none">→</span>
      <span className="text-[10px] font-bold">OK</span>
    </div>
  );
}

// Componente Card Giocatore Condiviso
export function PlayerCard({ player }: { player: any }) {
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
    <div className="w-full max-w-[340px] mx-auto bg-[#131926] border border-[#1e2738] rounded-[28px] p-6 shadow-2xl space-y-4">
      {/* Top: OVR + Badge Ruolo / FORMA */}
      <div className="flex justify-between items-start">
        <div>
          <span className="font-bebas text-6xl text-slate-100 leading-none block">
            {player.overall || 70}
          </span>
          <span className="inline-block mt-1 bg-[#1a2d4c] text-sky-400 font-bebas text-xs px-2.5 py-0.5 rounded tracking-wider">
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
        <h2 className="font-bebas text-3xl text-slate-100 tracking-wider uppercase truncate">
          {player.name}
        </h2>
      </div>

      {/* Griglia Statistiche */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 px-2 text-xs">
        <div className="space-y-2.5">
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

        <div className="space-y-2.5">
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

      {/* Gioco di squadra ed Efficacia portiere */}
      <div className="border-t border-[#1e2738] pt-3.5 space-y-2 text-xs">
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
}

function PlayersPage() {
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

      <div className="space-y-4">
        {players?.map((player: any) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
}
