import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { queryKeys, supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const LEAGUE_ID = '00000000-0000-0000-0000-000000000001';

  const [targetDate, setTargetDate] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [cardModifier, setCardModifier] = useState<number>(1);

  const { data: members } = useQuery({
    queryKey: queryKeys.members(LEAGUE_ID),
    queryFn: async () => {
      const { data } = await supabase
        .from('league_members')
        .select('id, profiles(nickname)')
        .eq('league_id', LEAGUE_ID);
      return data || [];
    },
  });

  const createPollMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('polls')
        .insert({
          league_id: LEAGUE_ID,
          target_date: targetDate,
          is_closed: false,
        });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Sondaggio creato con successo!');
      queryClient.invalidateQueries({ queryKey: queryKeys.polls(LEAGUE_ID) });
    },
  });

  const cardModifierMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('rpc_apply_card_modifier', {
        p_member_id: selectedMember,
        p_delta: cardModifier,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Statistiche aggiornate!');
      queryClient.invalidateQueries({ queryKey: queryKeys.members(LEAGUE_ID) });
    },
  });

  return (
    <div className="p-4 space-y-6">
      <div className="border-b border-[#222c42] pb-3">
        <h1 className="font-bebas text-3xl text-slate-100">PANNELLO ADMIN</h1>
        <p className="text-xs text-slate-400">Gestione sondaggi, convocazioni e modifiche attributi</p>
      </div>

      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-3">
        <h2 className="font-bebas text-xl text-lime-400">NUOVO SONDAGGIO PARTITA</h2>
        <div>
          <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Data Partita</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full bg-[#0b0e14] border border-[#222c42] rounded-lg p-2.5 text-sm text-slate-100"
          />
        </div>
        <button
          disabled={!targetDate || createPollMutation.isPending}
          onClick={() => createPollMutation.mutate()}
          className="w-full py-2.5 bg-lime-400 text-black font-bebas text-lg rounded-xl disabled:opacity-50"
        >
          {createPollMutation.isPending ? 'Creazione...' : 'APRI SONDAGGIO'}
        </button>
      </div>

      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-3">
        <h2 className="font-bebas text-xl text-amber-400">CARD UPDATE (AGGIORNA STATS)</h2>
        <div>
          <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Giocatore</label>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="w-full bg-[#0b0e14] border border-[#222c42] rounded-lg p-2.5 text-xs text-slate-100"
          >
            <option value="">-- Seleziona Membro --</option>
            {members?.map((m: any) => (
              <option key={m.id} value={m.id}>{m.profiles?.nickname || 'Membro'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">Delta Attributi</label>
          <div className="flex gap-2">
            {[-2, -1, 1, 2].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setCardModifier(val)}
                className={`flex-1 py-1.5 rounded-lg font-bebas text-lg border ${
                  cardModifier === val ? 'bg-amber-400 text-black border-amber-400' : 'bg-[#0b0e14] text-slate-300 border-[#222c42]'
                }`}
              >
                {val > 0 ? `+${val}` : val}
              </button>
            ))}
          </div>
        </div>
        <button
          disabled={!selectedMember || cardModifierMutation.isPending}
          onClick={() => cardModifierMutation.mutate()}
          className="w-full py-2.5 bg-amber-400 text-black font-bebas text-lg rounded-xl disabled:opacity-50"
        >
          APPLICA MODIFICATORE CARTA
        </button>
      </div>
    </div>
  );
}
