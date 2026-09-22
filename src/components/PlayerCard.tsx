import React from 'react';
import { PlayerInput, calculateDynamicOverall } from '../lib/engine';

interface PlayerCardProps {
  player: PlayerInput;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player }) => {
  const overall = calculateDynamicOverall(
    player.attributes,
    player.wins,
    player.draws,
    player.losses
  );

  const isGK = player.role === 'POR';
  const attrs = player.attributes as any;

  const roleBadgeColors: Record<string, string> = {
    POR: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    DIF: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    EST: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    UNI: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    ATT: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  };

  return (
    <div className="relative w-full max-w-[280px] mx-auto rounded-2xl bg-gradient-to-b from-[#1a2333] via-[#121824] to-[#0b0e14] border-2 border-lime-400/40 p-4 shadow-xl shadow-lime-400/5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="font-bebas text-5xl font-extrabold text-lime-400 leading-none block">
            {overall}
          </span>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border mt-1 ${roleBadgeColors[player.role] || 'bg-slate-700 text-slate-200 border-slate-600'}`}>
            {player.role}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">FORMA</span>
          <span className={`font-bebas text-xl font-bold ${
            player.currentFormModifier > 0 ? 'text-lime-400' : player.currentFormModifier < 0 ? 'text-rose-400' : 'text-slate-300'
          }`}>
            {player.currentFormModifier > 0 ? `+${player.currentFormModifier}` : player.currentFormModifier}
          </span>
        </div>
      </div>

      <div className="my-2 text-center py-2 border-y border-[#222c42]">
        <h3 className="font-bebas text-2xl tracking-wider text-slate-100 truncate uppercase">
          {player.nickname}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 text-xs font-semibold">
        {isGK ? (
          <>
            <div className="flex justify-between border-b border-[#222c42]/60 pb-1">
              <span className="text-slate-400">RIF</span>
              <span className="text-slate-100">{attrs.rif ?? 60}</span>
            </div>
            <div className="flex justify-between border-b border-[#222c42]/60 pb-1">
              <span className="text-slate-400">POS</span>
              <span className="text-slate-100">{attrs.pos ?? 60}</span>
            </div>
            <div className="flex justify-between border-b border-[#222c42]/60 pb-1">
              <span className="text-slate-400">AGG</span>
              <span className="text-slate-100">{attrs.agg ?? 60}</span>
            </div>
            <div className="flex justify-between border-b border-[#222c42]/60 pb-1">
              <span className="text-slate-400">PAS</span>
              <span className="text-slate-100">{attrs.pas ?? 60}</span>
            </div>
            <div className="flex justify-between border-b border-[#222c42]/60 pb-1">
              <span className="text-slate-400">USC</span>
              <span className="text-slate-100">{attrs.usc ?? 60}</span>
            </div>
            <div className="flex justify-between border-b border-[#222c42]/60 pb-1">
              <span className="text-slate-400">COM</span>
              <span className="text-slate-100">{attrs.com ?? 60}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between border-b border-[#222c42]/60 pb-1">
              <span className="text-slate-400">PAC</span>
              <span className="text-slate-100">{attrs.pac ?? 60}</span>
            </div>
            <div className="flex justify-between border-b border-[#222c42]/60 pb-1">
              <span className="text-slate-400">DRI</span>
              <span className="text-slate-100">{attrs.dri ?? 60}</span>
            </div>
            <div className="flex justify-between border-b border-[#222c42]/60 pb-1">
              <span className="text-slate-400">SHO</span>
              <span className="text-slate-100">{attrs.sho ?? 60}</span>
            </div>
            <div className="flex justify-between border-b border-[#222c42]/60 pb-1">
              <span className="text-slate-400">DEF</span>
              <span className="text-slate-100">{attrs.def ?? 60}</span>
            </div>
            <div className="flex justify-between border-b border-[#222c42]/60 pb-1">
              <span className="text-slate-400">PAS</span>
              <span className="text-slate-100">{attrs.pas ?? 60}</span>
            </div>
            <div className="flex justify-between border-b border-[#222c42]/60 pb-1">
              <span className="text-slate-400">PHY</span>
              <span className="text-slate-100">{attrs.phy ?? 60}</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 pt-2 flex justify-around text-center text-[10px] text-slate-400 uppercase tracking-wider">
        <div>
          <span className="font-bebas text-sm text-slate-200 block">{player.matchesPlayed}</span>
          PRES
        </div>
        <div>
          <span className="font-bebas text-sm text-lime-400 block">{player.wins}</span>
          VITT
        </div>
        <div>
          <span className="font-bebas text-sm text-amber-400 block">{player.mvpCount}</span>
          MVP
        </div>
      </div>
    </div>
  );
};
