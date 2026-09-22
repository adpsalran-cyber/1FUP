import React, { useState, useEffect, useMemo } from 'react';
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(
    typeof window !== 'undefined'
      ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
      : null
  );

  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [targetPlayerId, setTargetPlayerId] = useState<string>('');

  // 1. Recupera utente autenticato e ruolo admin
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        const storedRole = localStorage.getItem('alci_user_role');
        setIsAdmin(storedRole === 'admin');
      }
    });
  }, []);

  // 2. Recupera il sondaggio attivo
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

  // 3. Recupera tutti i giocatori registrati nella lega
  const { data: leaguePlayers } = useQuery({
    queryKey: ['poll_players', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return [];
      const { data, error } = await supabase
        .from('players')
        .select('id, name, role, user_id, is_dummy')
        .eq('league_id', activeLeagueId)
        .order('name');
      if (error) return [];
      return data || [];
    },
  });

  // 4. Trova in automatico il profilo del giocatore collegato all'utente loggato
  const myPlayer = useMemo(() => {
    if (!leaguePlayers || !currentUserId) return null;
    return leaguePlayers.find((p: any) => p.user_id === currentUserId) || null;
  }, [leaguePlayers, currentUserId]);

  // Pre-seleziona subito il proprio giocatore all'apertura
  useEffect(() => {
    if (!targetPlayerId && myPlayer) {
      setTargetPlayerId(myPlayer.id);
    }
  }, [myPlayer, targetPlayerId]);

  // 5. Recupera tutti i voti (giocatori + guest)
  const { data: votes, refetch: refetchVotes } = useQuery({
    queryKey: ['poll_votes', poll?.id],
    enabled: Boolean(poll?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('poll_votes')
        .select('*, players(id, name, role, is_dummy)')
        .eq('poll_id', poll!.id)
        .order('created_at', { ascending: true });

      if (error) return [];
      return data || [];
    },
  });

  // Carica le preferenze già registrate per il giocatore selezionato
  useEffect(() => {
    if (targetPlayerId && votes) {
      const existing = votes.find((v: any) => v.player_id === targetPlayerId);
      if (existing?.selected_slots) {
        setSelectedSlots(existing.selected_slots);
      } else {
        setSelectedSlots([]);
      }
    }
  }, [targetPlayerId, votes]);

  // Fasce orarie disponibili
  const availableSlots: string[] =
    poll?.time_slots && poll.time_slots.length > 0
      ? poll.time_slots
      : ['19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];

  const confirmedVotes = votes?.filter((v: any) => v.is_confirmed) || [];
  const waitingVotes = votes?.filter((v: any) => !v.is_confirmed) || [];
  const hasGuestVotes = votes?.some((v: any) => v.guest_name) || false;

  // Calcolo dell'orario preferito per i guest
  const bestSlot = useMemo(() => {
    if (!votes || votes.length === 0) return availableSlots[0] || '20:30';
    const counts: Record<string, number> = {};
    votes.forEach((v: any) => {
      v.selected_slots?.forEach((s: string) => {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    let top = availableSlots[0] || '20:30';
    let max = 0;
    Object.entries(counts).forEach(([slot, c]) => {
      if (c > max) {
        max = c;
        top = slot;
      }
    });
    return top;
  }, [votes, availableSlots]);
      // Controlla se il giocatore ha già un voto registrato per questo sondaggio
      const existingVote = votes?.find((v: any) => v.player_id === targetPlayerId);

      let error;
      if (existingVote) {
        const res = await supabase
          .from('poll_votes')
          .update({
            selected_slots: selectedSlots,
            is_confirmed: isConfirmed,
            queue_position: queuePosition,
          })
          .eq('id', existingVote.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('poll_votes')
          .insert({
            poll_id: poll.id,
            player_id: targetPlayerId,
            guest_name: null,
            selected_slots: selectedSlots,
            is_confirmed: isConfirmed,
            queue_position: queuePosition,
            created_at: new Date().toISOString(),
          });
        error = res.error;
      }

  // Mutazione: Voto per il giocatore
  const voteMutation = useMutation({
    mutationFn: async () => {
      if (!poll?.id || !targetPlayerId) {
        throw new Error('Seleziona il calciatore per cui votare.');
      }
      if (selectedSlots.length === 0) {
        throw new Error('Seleziona almeno un orario disponibile.');
      }

      const currentVotes = votes || [];
      const isAlreadyConfirmed = currentVotes.some(
        (v: any) => v.player_id === targetPlayerId && v.is_confirmed
      );
      const isConfirmed =
        isAlreadyConfirmed || currentVotes.filter((v: any) => v.is_confirmed).length < 10;
      const queuePosition = isConfirmed
        ? null
        : currentVotes.filter((v: any) => !v.is_confirmed).length + 1;

      const { error } = await supabase.from('poll_votes').upsert(


      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Presenza e orari registrati!');
      refetchVotes();
      queryClient.invalidateQueries({ queryKey: ['home_poll_responses'] });
      queryClient.invalidateQueries({ queryKey: ['home_latest_poll'] });
    },
    onError: (err: any) => alert(`Errore: ${err.message}`),
  });

  // Mutazione: Ritiro presenza giocatore
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!poll?.id || !targetPlayerId) return;
      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', poll.id)
        .eq('player_id', targetPlayerId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Presenza ritirata.');
      setSelectedSlots([]);
      refetchVotes();
      queryClient.invalidateQueries({ queryKey: ['home_poll_responses'] });
      queryClient.invalidateQueries({ queryKey: ['home_latest_poll'] });
    },
    onError: (err: any) => alert(`Errore: ${err.message}`),
  });

  // Mutazione: RIEMPI CON GUEST (fino a 10)
  const fillWithGuestsMutation = useMutation({
    mutationFn: async () => {
      if (!poll?.id) return;
      const currentConfirmed = confirmedVotes.length;
      const needed = 10 - currentConfirmed;

      if (needed <= 0) {
        throw new Error('Ci sono già 10 o più confermati in squadra!');
      }

      const existingGuestsCount = votes?.filter((v: any) => v.guest_name)?.length || 0;
      const guestRows = [];

      for (let i = 1; i <= needed; i++) {
        guestRows.push({
          poll_id: poll.id,
          player_id: null,
          guest_name: `Guest ${existingGuestsCount + i}`,
          selected_slots: [bestSlot],
          is_confirmed: true,
          queue_position: null,
          created_at: new Date().toISOString(),
        });
      }

      const { error } = await supabase.from('poll_votes').insert(guestRows);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Squadra completata con i Guest mancanti!');
      refetchVotes();
      queryClient.invalidateQueries({ queryKey: ['home_poll_responses'] });
      queryClient.invalidateQueries({ queryKey: ['home_latest_poll'] });
    },
    onError: (err: any) => alert(`Errore riempimento guest: ${err.message}`),
  });

  // Mutazione: Rimuovi tutti i Guest
  const clearGuestsMutation = useMutation({
    mutationFn: async () => {
      if (!poll?.id) return;
      const { error } = await supabase
        .from('poll_votes')
        .delete()
        .eq('poll_id', poll.id)
        .not('guest_name', 'is', null);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alert('Tutti i Guest sono stati rimossi dal sondaggio.');
      refetchVotes();
      queryClient.invalidateQueries({ queryKey: ['home_poll_responses'] });
      queryClient.invalidateQueries({ queryKey: ['home_latest_poll'] });
    },
    onError: (err: any) => alert(`Errore: ${err.message}`),
  });

  // Rimuovi singolo Guest
  const deleteSingleGuest = async (voteId: string) => {
    const { error } = await supabase.from('poll_votes').delete().eq('id', voteId);
    if (!error) refetchVotes();
  };

  const toggleSlot = (slot: string) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  if (pollLoading) {
    return (
      <div className="p-8 text-center text-slate-400 font-bebas text-xl animate-pulse">
        CARICAMENTO SONDAGGIO...
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="border-b border-[#222c42] pb-3">
          <h1 className="font-bebas text-3xl text-slate-100">SONDAGGI CONVOCAZIONI</h1>
        </div>
        <div className="bg-[#151b28] border border-[#222c42] rounded-xl p-8 text-center space-y-2">
          <p className="font-bebas text-xl text-slate-300">NESSUN SONDAGGIO APERTO</p>
          <p className="text-xs text-slate-400">
            L'amministratore non ha ancora aperto le convocazioni per la prossima partita.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="border-b border-[#222c42] pb-3 flex justify-between items-end">
        <div>
          <h1 className="font-bebas text-3xl text-slate-100">SONDAGGIO PARTITA</h1>
          <p className="text-xs text-slate-400">
            {poll.title || 'Partita di Calcetto'} • Data:{' '}
            <strong className="text-lime-400">{poll.target_date}</strong>
          </p>
        </div>
        <button
          onClick={() => {
            refetchPoll();
            refetchVotes();
          }}
          className="text-xs text-slate-400 hover:text-white underline"
        >
          Aggiorna
        </button>
      </div>

      {/* SEZIONE VOTAZIONE */}
      <div className="bg-[#151b28] p-4 rounded-xl border border-[#222c42] space-y-4 shadow-xl">
        {/* Selettore Profilo (Preimpostato sul proprio utente) */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs uppercase text-slate-400 font-semibold">
              Chi sta votando?
            </label>
            {targetPlayerId === myPlayer?.id && myPlayer && (
              <span className="text-[10px] font-bold text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded border border-lime-400/20">
                IL TUO PROFILO
              </span>
            )}
          </div>
          <select
            value={targetPlayerId}
            onChange={(e) => setTargetPlayerId(e.target.value)}
            className="w-full bg-[#0b0e14] border border-[#222c42] rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-lime-400 font-semibold"
          >
            <option value="">-- Seleziona Calciatore --</option>
            {leaguePlayers?.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.id === myPlayer?.id ? ' (Tu)' : ''} {p.is_dummy ? ' [Fittizio]' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Selezione Orari */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs uppercase text-slate-400 font-semibold">
              Orari Disponibili (Scelta Multipla)
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

        {/* Pulsanti Azione */}
        <div className="flex gap-2 pt-2 border-t border-[#222c42]">
          <button
            type="button"
            disabled={!targetPlayerId || selectedSlots.length === 0 || voteMutation.isPending}
            onClick={() => voteMutation.mutate()}
            className="flex-1 py-3 bg-lime-400 disabled:opacity-40 text-slate-950 font-bebas text-xl rounded-xl transition font-bold shadow-md"
          >
            {voteMutation.isPending ? 'Salvataggio...' : 'CONFERMA PRESENZA'}
          </button>
          <button
            type="button"
            disabled={!targetPlayerId || cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}
            className="px-4 py-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 disabled:opacity-40 font-bebas text-lg rounded-xl hover:bg-rose-500/30 transition"
          >
            RITIRA
          </button>
        </div>
      </div>

      {/* AZIONI SPECIALI GUEST (Solo Admin o per chiudere a 10) */}
      <div className="bg-[#111722] p-3 rounded-xl border border-[#222c42] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <span className="font-bebas text-base text-slate-200 block">GESTIONE GUEST VOLANTI</span>
          <span className="text-[11px] text-slate-400">
            Segnaposto temporanei per arrivare a 10 senza toccare le statistiche.
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {confirmedVotes.length < 10 && (
            <button
              type="button"
              disabled={fillWithGuestsMutation.isPending}
              onClick={() => fillWithGuestsMutation.mutate()}
              className="flex-1 sm:flex-none px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm rounded-lg font-bold shadow transition"
            >
              + RIEMPI A 10 CON GUEST ({10 - confirmedVotes.length})
            </button>
          )}

          {hasGuestVotes && (
            <button
              type="button"
              disabled={clearGuestsMutation.isPending}
              onClick={() => clearGuestsMutation.mutate()}
              className="px-3 py-2 bg-rose-950/60 border border-rose-800 text-rose-300 font-bebas text-sm rounded-lg hover:bg-rose-900 transition"
            >
              RIMUOVI GUEST
            </button>
          )}
        </div>
      </div>

      {/* LISTA CONFERMATI (10 POSTI) */}
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
            {confirmedVotes.map((v: any, index: number) => {
              const isGuest = Boolean(v.guest_name);
              const isMe = v.player_id === myPlayer?.id;
              const displayName = isGuest ? v.guest_name : v.players?.name || 'Giocatore';

              return (
                <div
                  key={v.id}
                  className={`flex justify-between items-center p-2.5 rounded-xl border ${
                    isGuest
                      ? 'bg-amber-400/5 border-amber-400/30'
                      : isMe
                      ? 'bg-lime-400/10 border-lime-400/50'
                      : 'bg-[#151b28] border-[#222c42]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-bebas text-lime-400 w-5 text-sm">{index + 1}.</span>
                    <div>
                      <span className="text-sm font-semibold text-slate-100 block leading-tight flex items-center gap-1.5">
                        {displayName}
                        {isMe && (
                          <span className="text-[9px] bg-lime-400 text-slate-950 font-bold px-1 rounded">
                            TU
                          </span>
                        )}
                        {isGuest && (
                          <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold px-1 rounded">
                            GUEST
                          </span>
                        )}
                        {v.players?.is_dummy && (
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded">
                            FITTIZIO
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {isGuest ? 'Ospite Esterno' : v.players?.role || 'ATT'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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

                    {isGuest && (
                      <button
                        type="button"
                        onClick={() => deleteSingleGuest(v.id)}
                        className="text-rose-400 hover:text-rose-300 px-1.5 py-0.5 text-xs font-bold"
                        title="Rimuovi questo guest"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {confirmedVotes.length === 0 && (
              <p className="text-xs text-slate-500 italic p-3 text-center bg-[#151b28]/50 rounded-xl border border-[#222c42]">
                Ancora nessun giocatore confermato. Registrati o riempi con Guest per completare la rosa!
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
                    <span className="font-bebas text-amber-400 w-6 text-sm">
                      +{v.queue_position}
                    </span>
                    <span className="text-sm text-slate-300">
                      {v.guest_name || v.players?.name || 'Giocatore'}
                    </span>
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
