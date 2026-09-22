import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { queryKeys, supabase, submitPollPreference, cancelPollReservation } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/polls',
  component: PollsPage,
});

function PollsPage() {
  const queryClient = useQueryClient();
  const LEAGUE_ID = '00000000-0000-0000-0000-000000000001';

  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  const { data: poll, isLoading: pollLoading } = useQuery({
    queryKey: queryKeys.activePoll(LEAGUE_ID),
    queryFn: async () => {
      const { data } = await supabase
        .from('polls')
        .select('*')
        .eq('league_id', LEAGUE_ID)
        .eq('is_closed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.members(LEAGUE_ID),
    queryFn: async () => {
      const { data } = await supabase
        .from('league_members')
        .select('id, profile_id, profiles(nickname)')
        .eq('league_id', LEAGUE_ID);
      return data || [];
    },
  });

  const { data: votes } = useQuery({
    queryKey: queryKeys.pollVotes(poll?.id || ''),
    enabled: !!poll?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('poll_votes')
        .select('*, league_members(profiles(nickname))')
        .eq('poll_id', poll!.id)
        .order('registered_at', { ascending: true });
      return data || [];
    },
  });

  const voteMutation = useMutation({
    mutationFn: () =>
      submitPollPreference(queryClient, LEAGUE_ID, {
        pollId: poll!.id,
        memberId: selectedMemberId,
        selectedSlots,
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      cancelPollReservation(queryClient, LEAGUE_ID, poll!.id, selectedMemberId),
  });

  const toggleSlot = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const confirmedVotes = votes?.filter((v: any) => v.is_confirmed) || [];
  const waitingVotes = votes?.filter((v: any) => !v.is_confirmed) || [];

  if (pollLoading) return <div className="p-6 text-center text-slate-400">Caricamento sondaggio...</div>;
  if (!poll) return <div className="p-6 text-center text-slate-400">Nessun sondaggio convocazione attivo.</div>;

  return (
    <div className="p-4 space-y-5">
      <div className="border-b border-[#222c42] pb-3">
        <h1 className="font-bebas text-3xl text-slate-100">SONDAGGIO CONVOCAZIONI</h1>
        <p className="text-xs text-slate-400">Data bersaglio: {new Date(poll.target_date).toLocaleDateString('it-IT')}</p>
      </div>

      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-4">
        <div>
          <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Seleziona il tuo Profilo</label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="w-full bg-[#0b0e14] border border-[#222c42] rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-lime-400"
          >
            <option value="">-- Seleziona Giocatore --</option>
            {members?.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.profiles?.nickname || 'Senza nome'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase text-slate-400 font-semibold mb-2">Fasce Orarie Disponibili</label>
          <div className="grid grid-cols-3 gap-2">
            {poll.time_slots?.map((slot: string) => {
              const isSelected = selectedSlots.includes(slot);
              return (
                <button
                  type="button"
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  className={`py-2 rounded-lg font-bebas text-lg border transition-colors ${
                    isSelected
                      ? 'bg-lime-400 text-black border-lime-400 font-bold'
                      : 'bg-[#0b0e14] text-slate-300 border-[#222c42]'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            disabled={!selectedMemberId || selectedSlots.length === 0 || voteMutation.isPending}
            onClick={() => voteMutation.mutate()}
            className="flex-1 py-3 bg-lime-400 disabled:opacity-50 text-black font-bebas text-lg rounded-xl transition-all"
          >
            {voteMutation.isPending ? 'Salvataggio...' : 'CONFERMA VOTO'}
          </button>
          <button
            type="button"
            disabled={!selectedMemberId || cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
            className="px-4 py-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 disabled:opacity-50 font-bebas text-lg rounded-xl"
          >
            RITIRA
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="font-bebas text-xl text-lime-400 tracking-wide mb-2">
            CONFERMATI NEI PRIMI 10 ({confirmedVotes.length}/10)
          </h2>
          <div className="space-y-1.5">
            {confirmedVotes.map((v: any, index: number) => (
              <div key={v.id} className="flex justify-between items-center p-2.5 rounded-lg bg-[#151b28] border border-[#222c42]">
                <div className="flex items-center space-x-2">
                  <span className="font-bebas text-lime-400 w-5 text-sm">{index + 1}.</span>
                  <span className="text-sm font-semibold text-slate-100">{v.league_members?.profiles?.nickname || 'Membro'}</span>
                </div>
                <div className="flex gap-1">
                  {v.selected_slots?.map((s: string) => (
                    <span key={s} className="px-1.5 py-0.5 rounded text-[10px] bg-[#0b0e14] text-slate-300 border border-[#222c42]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {waitingVotes.length > 0 && (
          <div>
            <h2 className="font-bebas text-xl text-amber-400 tracking-wide mb-2">
              LISTA D'ATTESA (CODA)
            </h2>
            <div className="space-y-1.5">
              {waitingVotes.map((v: any) => (
                <div key={v.id} className="flex justify-between items-center p-2.5 rounded-lg bg-[#151b28]/60 border border-amber-500/20">
                  <div className="flex items-center space-x-2">
                    <span className="font-bebas text-amber-400 w-5 text-sm">+{v.queue_position}</span>
                    <span className="text-sm text-slate-300">{v.league_members?.profiles?.nickname || 'Membro'}</span>
                  </div>
                  <span className="text-xs text-amber-400/80 font-semibold">In attesa</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
