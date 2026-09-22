import React, { useState } from 'react';
import { createRoute, useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { queryKeys, supabase, addGuestBotToMatch, submitMatchGrade, setMatchMvp } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches/$matchId',
  component: MatchDetailPage,
});

function MatchDetailPage() {
  const { matchId } = useParams({ from: '/matches/$matchId' });
  const queryClient = useQueryClient();
  const [selectedRatedMember, setSelectedRatedMember] = useState<string>('');
  const [stars, setStars] = useState<number>(3.5);

  const { data: match, isLoading } = useQuery({
    queryKey: queryKeys.matchDetail(matchId),
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      return data;
    },
  });

  const { data: participations } = useQuery({
    queryKey: [...queryKeys.matchDetail(matchId), 'participations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('match_participations')
        .select('*, league_members(id, profiles(nickname))')
        .eq('match_id', matchId);
      return data || [];
    },
  });

  const botMutation = useMutation({
    mutationFn: (team: 'A' | 'B') => addGuestBotToMatch(queryClient, matchId, team),
  });

  const gradeMutation = useMutation({
    mutationFn: () => submitMatchGrade(queryClient, { matchId, ratedMemberId: selectedRatedMember, stars }),
    onSuccess: () => alert('Voto registrato!'),
  });

  const mvpMutation = useMutation({
    mutationFn: (memberId: string) => setMatchMvp(queryClient, matchId, memberId),
  });

  if (isLoading) return <div className="p-6 text-center text-slate-400">Caricamento partita...</div>;
  if (!match) return <div className="p-6 text-center text-slate-400">Partita non trovata.</div>;

  const teamA = participations?.filter((p: any) => p.team === 'A') || [];
  const teamB = participations?.filter((p: any) => p.team === 'B') || [];

  return (
    <div className="p-4 space-y-5">
      <div className="p-4 rounded-xl bg-[#151b28] border border-[#222c42] text-center space-y-2">
        <span className="text-xs text-slate-400 uppercase font-semibold">
          {new Date(match.played_at).toLocaleDateString('it-IT')}
        </span>
        <div className="flex justify-around items-center pt-2">
          <div>
            <p className="font-bebas text-lg text-slate-300">SQUADRA A</p>
            <p className="font-bebas text-5xl text-lime-400">{match.score_a}</p>
          </div>
          <span className="font-bebas text-2xl text-slate-500">VS</span>
          <div>
            <p className="font-bebas text-lg text-slate-300">SQUADRA B</p>
            <p className="font-bebas text-5xl text-amber-400">{match.score_b}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#151b28] p-3 rounded-xl border border-[#222c42] space-y-2">
          <div className="flex justify-between items-center border-b border-[#222c42] pb-1.5">
            <span className="font-bebas text-lg text-lime-400">SQUADRA A ({teamA.length})</span>
            <button
              onClick={() => botMutation.mutate('A')}
              className="text-[10px] font-bold px-2 py-0.5 bg-lime-400/20 text-lime-400 rounded border border-lime-400/30"
            >
              + BOT
            </button>
          </div>
          <div className="space-y-1">
            {teamA.map((p: any) => (
              <div key={p.id} className="text-xs flex justify-between py-1">
                <span>{p.league_members?.profiles?.nickname || 'Guest Bot'}</span>
                {match.mvp_member_id === p.member_id && <span className="text-amber-400 font-bold">MVP</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#151b28] p-3 rounded-xl border border-[#222c42] space-y-2">
          <div className="flex justify-between items-center border-b border-[#222c42] pb-1.5">
            <span className="font-bebas text-lg text-amber-400">SQUADRA B ({teamB.length})</span>
            <button
              onClick={() => botMutation.mutate('B')}
              className="text-[10px] font-bold px-2 py-0.5 bg-amber-400/20 text-amber-400 rounded border border-amber-400/30"
            >
              + BOT
            </button>
          </div>
          <div className="space-y-1">
            {teamB.map((p: any) => (
              <div key={p.id} className="text-xs flex justify-between py-1">
                <span>{p.league_members?.profiles?.nickname || 'Guest Bot'}</span>
                {match.mvp_member_id === p.member_id && <span className="text-amber-400 font-bold">MVP</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-3">
        <h3 className="font-bebas text-xl text-slate-100">PAGELLE & VALUTAZIONI (0.5 - 5.0 ★)</h3>
        <select
          value={selectedRatedMember}
          onChange={(e) => setSelectedRatedMember(e.target.value)}
          className="w-full bg-[#0b0e14] border border-[#222c42] rounded-lg p-2.5 text-xs text-slate-100"
        >
          <option value="">-- Seleziona Compagno da Votare --</option>
          {participations?.map((p: any) => (
            <option key={p.member_id} value={p.member_id}>
              {p.league_members?.profiles?.nickname || 'Guest Bot'} (Sq. {p.team})
            </option>
          ))}
        </select>

        <div className="flex items-center space-x-3">
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={stars}
            onChange={(e) => setStars(parseFloat(e.target.value))}
            className="flex-1 accent-lime-400"
          />
          <span className="font-bebas text-2xl text-lime-400 w-12 text-right">{stars} ★</span>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            disabled={!selectedRatedMember || gradeMutation.isPending}
            onClick={() => gradeMutation.mutate()}
            className="flex-1 py-2.5 bg-lime-400 text-black font-bebas text-lg rounded-xl disabled:opacity-50"
          >
            INVIA VOTO
          </button>
          <button
            disabled={!selectedRatedMember || mvpMutation.isPending}
            onClick={() => mvpMutation.mutate(selectedRatedMember)}
            className="px-4 py-2.5 bg-amber-400 text-black font-bebas text-lg rounded-xl disabled:opacity-50"
          >
            ELEGGHI MVP
          </button>
        </div>
      </div>
    </div>
  );
}
