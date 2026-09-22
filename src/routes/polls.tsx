import React, { useState, useEffect } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/polls',
  component: PollsPage,
});

function PollsPage() {
  const queryClient = useQueryClient();
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(
    typeof window !== 'undefined'
      ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
      : null
  );

  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  useEffect(() => {
    if (!activeLeagueId) {
      supabase.from('leagues').select('id').limit(1).maybeSingle().then(({ data }) => {
        if (data?.id) {
          setActiveLeagueId(data.id);
          localStorage.setItem('alci_league_id', data.id);
          localStorage.setItem('active_league_id', data.id);
        }
      });
    }
  }, [activeLeagueId]);

  // Recupera il sondaggio aperto più recente
  const { data: poll, isLoading: pollLoading, refetch: refetchPoll } = useQuery({
    queryKey: ['active_poll', activeLeagueId],
    queryFn: async () => {
      let query = supabase
        .from('polls')
        .select('*')
        .eq('is_closed', false);

      if (activeLeagueId) {
        query = query.or(`league_id.eq.${activeLeagueId},league_id.is.null`);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data;
    },
  });

  // Recupera i giocatori registrati nella lega per il menu a tendina
  const { data: players } = useQuery({
    queryKey: ['poll_players', activeLeagueId],
    queryFn: async () => {
      let query = supabase.from('players').select('id, name, role');
      if (activeLeagueId) {
        query = query.or(`league_id.eq.${activeLeagueId},league_id.is.null`);
      }
      const { data } = await query.order('name');
      return data || [];
    },
  });

  // Recupera i voti espressi per questo sondaggio
  const { data: votes, refetch: refetchVotes } = useQuery({
    queryKey: ['poll_votes', poll?.id],
    enabled: Boolean(poll?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('poll_votes')
        .select('*, players(name, role)')
        .eq('poll_id', poll!.id)
        .order('created_at', { ascending: true });

      if (error) return [];
      return data || [];
    },
  });

  // Mutazione per votare o cambiare voto
  const voteMutation = useMutation({
    mutationFn: async () => {
      if (!poll?.id || !selectedPlayerId) throw new Error('Seleziona il tuo nome');
      if (selectedSlots.length === 0) throw new Error('Seleziona almeno una fascia oraria');

      const currentVotes = votes || [];
      const isAlreadyConfirmed = currentVotes.some((v: any) => v.player_id === selectedPlayerId && v.is_confirmed);
      const isConfirmed = isAlreadyConfirmed || currentVotes.filter((v: any) => v.is_confirmed).length < 10;
      const queuePosition = isConfirmed ? null : currentVotes.filter((v: any) => !v.is_confirmed).length + 1;

      const { error } = await supabase
        .from('poll_votes')
        .upsert(
          {
            poll_id: poll.id,
            player_id: selectedPlayerId,
            selected_slots: selectedSlots,
            is_confirmed: isConfirmed,
            queue_position: queuePosition,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'poll_id,player_id' }
        );

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Presenza e preferenze registrate!');
      refetchVotes();
      queryClient.invalidateQueries({ queryKey: ['home_poll_responses'] });
      queryClient.invalidateQueries({ queryKey: ['home_latest_poll'] });
    },
    onError: (err: any) => alert(`Errore salvataggio voto: ${err.message}`),
  });

  // Ritiro della presenza
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!poll?.id || !selectedPlayerId) return;
      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', poll.id)
        .eq('player_id', selectedPlayerId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Presenza ritirata.');
      setSelectedSlots([]);
      refetchVotes();
      queryClient.invalidateQueries({ queryKey: ['home_poll_responses'] });
      queryClient.invalidateQueries({ queryKey: ['home_latest_poll'] });
    },
    onError: (err: any) => alert(`Errore ritiro: ${err.message}`),
  });

  const toggleSlot = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const confirmedVotes = votes?.filter((v: any) => v.is_confirmed) || [];
  const waitingVotes = votes?.filter((v: any) => !v.is_confirmed) || [];

  if (pollLoading) {
    return <div className="p-8 text-center text-slate-400 font-bebas text-xl animate-pulse">CARICAMENTO SONDAGGIO...</div>;
  }

  if (!poll) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="border-b border-[#222c42] pb-3">
          <h1 className="font-bebas text-3xl text-slate-100">SONDAGGI CONVOCAZIONI</h1>
        </div>
        <div className="bg-[#151b28] border border-[#222c42] rounded-xl p-8 text-center space-y-2">
          <p className="font-bebas text-xl text-slate-300">NESSUN SONDAGGIO APERTO</p>
          <p className="text-xs text-slate-400">L'amministratore non ha ancora aperto le convocazioni per la prossima partita.</p>
        </div>
      </div>
    );
  }

  const availableSlots: string[] = poll.time_slots && poll.time_slots.length > 0
    ? poll.time_slots
    : ['19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];

  return (
    <div className="p-4 space-y-5 pb-24 max-w-lg mx-auto">
      <div className="border-b border-[#222c42] pb-3 flex justify-between items-end">
        <div>
          <h1 className="font-bebas text-3xl text-slate-100">SONDAGGIO PARTITA</h1>
          <p className="text-xs text-slate-400">
            {poll.title || 'Partita di Calcetto'} • Data: <strong className="text-lime-400">{poll.target_date}</strong>
          </p>
        </div>
        <button
          onClick={() => { refetchPoll(); refetchVotes(); }}
          className="text-xs text-slate-400 hover:text-white underline"
        >
          Aggiorna
        </button>
      </div>

      {/* SELETTORE NOME & SLOT ORARI */}
      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-4 shadow-xl">
        <div>
          <label className="block text-xs uppercase text-slate-400 font-semibold mb-1">
            Chi Sei? (Seleziona il tuo Profilo)
          </label>
          <select
            value={selectedPlayerId}
            onChange={(e) => {
              const pid = e.target.value;
              setSelectedPlayerId(pid);
              const existing = votes?.find((v: any) => v.player_id === pid);
              if (existing?.selected_slots) {
                setSelectedSlots(existing.selected_slots);
              }
            }}
            className="w-full bg-[#0b0e14] border border-[#222c42] rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-lime-400 font-semibold"
          >
            <option value="">-- Seleziona il tuo Nome --</option>
            {players?.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.role || 'ATT'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs uppercase text-slate-400 font-semibold">
              Orari in cui sei Disponibile (Scelta Multipla)
            </label>
            <span className="text-[10px] text-lime-400 font-mono">
              {selectedSlots.length} selezionati
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableSlots.map((slot) => {
              const isSelected = selectedSlots.includes(slot);
              return (
                <button
                  type="button"
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  className={`py-2 px-1 rounded-lg font-bebas text-lg border transition ${
                    isSelected
                      ? 'bg-lime-400 text-slate-950 border-lime-400 font-bold shadow'
                      : 'bg-[#0b0e14] text-slate-300 border-[#222c42] hover:border-slate-600'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-[#222c42]">
          <button
            type="button"
            disabled={!selectedPlayerId || selectedSlots.length === 0 || voteMutation.isPending}
            onClick={() => voteMutation.mutate()}
            className="flex-1 py-3 bg-lime-400 disabled:opacity-40 text-slate-950 font-bebas text-xl rounded-xl transition font-bold shadow-md"
          >
            {voteMutation.isPending ? 'Salvataggio...' : 'CONFERMA PRESENZA'}
          </button>
          <button
            type="button"
            disabled={!selectedPlayerId || cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
            className="px-4 py-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 disabled:opacity-40 font-bebas text-lg rounded-xl hover:bg-rose-500/30 transition"
          >
            RITIRA
          </button>
        </div>
      </div>

      {/* LISTA CONVOCATI */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-bebas text-xl text-lime-400 tracking-wide">
              CONFERMATI IN SQUADRA ({confirmedVotes.length}/10)
            </h2>
            {confirmedVotes.length >= 10 && (
              <span className="text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded">
                Rosa al Completo
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            {confirmedVotes.map((v: any, index: number) => (
              <div
                key={v.id}
                className="flex justify-between items-center p-2.5 rounded-xl bg-[#151b28] border border-[#222c42]"
              >
                <div className="flex items-center space-x-2">
                  <span className="font-bebas text-lime-400 w-5 text-sm">{index + 1}.</span>
                  <div>
                    <span className="text-sm font-semibold text-slate-100 block leading-tight">
                      {v.players?.name || 'Giocatore'}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {v.players?.role || 'ATT'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {v.selected_slots?.map((s: string) => (
                    <span
                      key={s}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#0b0e14] text-slate-300 border border-[#222c42]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {confirmedVotes.length === 0 && (
              <p className="text-xs text-slate-500 italic p-3 text-center bg-[#151b28]/50 rounded-xl border border-[#222c42]">
                Ancora nessun giocatore confermato. Sii il primo a registrarti!
              </p>
            )}
          </div>
        </div>

        {/* LISTA D'ATTESA */}
        {waitingVotes.length > 0 && (
          <div>
            <h2 className="font-bebas text-xl text-amber-400 tracking-wide mb-2">
              LISTA D'ATTESA / RISERVE ({waitingVotes.length})
            </h2>
            <div className="space-y-1.5">
              {waitingVotes.map((v: any) => (
                <div
                  key={v.id}
                  className="flex justify-between items-center p-2.5 rounded-xl bg-[#151b28]/60 border border-amber-500/20"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-bebas text-amber-400 w-6 text-sm">+{v.queue_position}</span>
                    <span className="text-sm text-slate-300">{v.players?.name || 'Giocatore'}</span>
                  </div>
                  <span className="text-[11px] text-amber-400/80 font-semibold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    Riserva
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
