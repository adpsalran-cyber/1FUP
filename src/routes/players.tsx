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
      <div className="flex items-center gap-1 bg-[#2a1318] border border-red-500/40 px-2 py-0.5 rounded-lg text-red-400">
        <span className="text-xs font-bold leading-none">✚</span>
        <span className="text-[10px] font-bold">INF</span>
      </div>
    );
  }

  const num = Number(formVal);

  if (val === 'in_forma' || (!isNaN(num) && num > 0)) {
    return (
      <div className="flex items-center gap-1 bg-[#102419] border border-emerald-500/40 px-2 py-0.5 rounded-lg text-emerald-400">
        <span className="text-sm font-bold leading-none">↑</span>
        <span className="text-[10px] font-bold">TOP</span>
      </div>
    );
  }

  if (val === 'non_in_forma' || (!isNaN(num) && num < 0)) {
    return (
      <div className="flex items-center gap-1 bg-[#2b151a] border border-rose-500/40 px-2 py-0.5 rounded-lg text-rose-400">
        <span className="text-sm font-bold leading-none">↓</span>
        <span className="text-[10px] font-bold">DOWN</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-[#281c10] border border-amber-500/40 px-2 py-0.5 rounded-lg text-amber-400">
      <span className="text-sm font-bold leading-none">→</span>
      <span className="text-[10px] font-bold">OK</span>
    </div>
  );
}

// Card Longilinea proporzionata identica allo screenshot
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
    <div className="w-full rounded-[28px] bg-[#141a27] border border-[#20293d] p-6 shadow-2xl flex flex-col justify-between min-h-[460px] transition hover:border-slate-600">
      {/* Top: OVR + Badge Ruolo a sinistra, FORMA a destra */}
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
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            FORMA
          </span>
          {getConditionBadge(player.form ?? player.condition)}
        </div>
      </div>

      {/* Centro: Nome Giocatore Spaziato */}
      <div className="text-center py-4 my-auto">
        <h2 className="font-bebas text-4xl text-slate-100 tracking-wider uppercase truncate">
          {player.name}
        </h2>
      </div>

      {/* Griglia Attributi a 2 Colonne */}
      <div className="grid grid-cols-2 gap-x-10 gap-y-3 px-3 text-xs mb-3">
        {/* Colonna Sinistra */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold text-xs tracking-wider">VEL</span>
            <span className="font-mono text-slate-100 font-bold text-base">{vel}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold text-xs tracking-wider">TIR</span>
            <span className="font-mono text-slate-100 font-bold text-base">{tir}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold text-xs tracking-wider">PAS</span>
            <span className="font-mono text-slate-100 font-bold text-base">{pas}</span>
          </div>
        </div>

        {/* Colonna Destra */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold text-xs tracking-wider">DRI</span>
            <span className="font-mono text-slate-100 font-bold text-base">{dri}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold text-xs tracking-wider">DIF</span>
            <span className="font-mono text-slate-100 font-bold text-base">{dif}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-bold text-xs tracking-wider">FIS</span>
            <span className="font-mono text-slate-100 font-bold text-base">{fis}</span>
          </div>
        </div>
      </div>

      {/* Footer Carta: Gioco di squadra ed Efficacia portiere */}
      <div className="border-t border-[#20293d] pt-4 space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-xs">Gioco di squadra:</span>
          <span className="flex items-center gap-1.5 font-medium text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            {teamworkText}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-xs">Efficacia portiere:</span>
          <span className="flex items-center gap-1.5 font-medium text-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
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
    <div className="space-y-5 pb-20 max-w-sm mx-auto px-1">
      {/* Header Schermata */}
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
          className="bg-[#141a27] border border-slate-700 hover:border-amber-400 text-amber-400 px-3.5 py-1.5 rounded-xl flex flex-col items-center leading-tight shadow transition"
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

      {/* Lista Carte Giocatore Allungate */}
      <div className="space-y-5">
        {players?.map((player: any) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
}
