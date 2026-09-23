import React, { useState, useEffect, useMemo } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';
import { balanceTeams, TeamParticipant } from '../lib/engine';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

function HomePage() {
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditingTeams, setIsEditingTeams] = useState(false);
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(
    typeof window !== 'undefined'
      ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
      : null
  );

  useEffect(() => {
    const role = localStorage.getItem('alci_user_role');
    setIsAdmin(role === 'admin');

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

  // 1. Sondaggio aperto
  const { data: activePoll, refetch: refetchPoll } = useQuery({
    queryKey: ['home_latest_poll', activeLeagueId],
    queryFn: async () => {
      let query = supabase.from('polls').select('*').eq('is_closed', false);
      if (activeLeagueId) {
        query = query.or(`league_id.eq.${activeLeagueId},league_id.is.null`);
      }
      const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
      return data || null;
    },
  });

  // 2. Voti espressi (con supporto ai Guest)
  const { data: pollVotes, refetch: refetchVotes } = useQuery({
    queryKey: ['home_poll_responses', activePoll?.id],
    enabled: Boolean(activePoll?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('poll_votes')
        .select('*, players(id, name, role, overall)')
        .eq('poll_id', activePoll!.id)
        .order('created_at', { ascending: true });
      if (error) return [];
      return data || [];
    },
  });

  // 3. Prossima partita programmata
  const { data: upcomingMatch, refetch: refetchMatch } = useQuery({
    queryKey: ['home_upcoming_match', activeLeagueId],
    queryFn: async () => {
      let query = supabase.from('matches').select('*').eq('status', 'scheduled');
      if (activeLeagueId) {
        query = query.eq('league_id', activeLeagueId);
      }
      const { data } = await query.order('match_date', { ascending: true }).limit(1).maybeSingle();
      return data || null;
    },
  });

  const confirmedVotes = useMemo(() => {
    return pollVotes?.filter((v: any) => v.is_confirmed) || [];
  }, [pollVotes]);

  // Fascia oraria vincente
  const bestSlot = useMemo(() => {
    if (!pollVotes || pollVotes.length === 0) return '21:00';
    const counts: Record<string, number> = {};
    pollVotes.forEach((v: any) => {
      v.selected_slots?.forEach((s: string) => {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    let top = '21:00';
    let max = 0;
    Object.entries(counts).forEach(([slot, c]) => {
      if (c > max) {
        max = c;
        top = slot;
      }
    });
    return top;
  }, [pollVotes]);

  // Creazione evento e bilanciamento tramite engine.ts
  const createMatchMutation = useMutation({
    mutationFn: async () => {
      if (!activePoll || confirmedVotes.length < 10) return;

      const participants: TeamParticipant[] = confirmedVotes.slice(0, 10).map((v: any) => {
        const isGuest = Boolean(v.guest_name);
        return {
          id: v.player_id || null,
          name: isGuest ? v.guest_name : v.players?.name || 'Giocatore',
          role: isGuest ? 'GUEST' : v.players?.role || 'UNI',
          overall: isGuest ? 65 : v.players?.overall || 70,
          isGuest,
        };
      });

      const { teamA, teamB } = balanceTeams(participants);

      const { data: newMatch, error: matchErr } = await supabase
        .from('matches')
        .insert({
          league_id: activeLeagueId,
          match_date: activePoll.target_date,
          match_time: bestSlot,
          status: 'scheduled',
          team_a_players: teamA,
          team_b_players: teamB,
          team_a_name: 'Squadra Bianca',
          team_b_name: 'Squadra Nera',
        })
        .select()
        .single();

      if (matchErr) throw matchErr;

      await supabase
        .from('polls')
        .update({ is_closed: true, match_id: newMatch.id })
        .eq('id', activePoll.id);

      return newMatch;
    },
    onSuccess: () => {
      refetchPoll();
      refetchVotes();
      refetchMatch();
      queryClient.invalidateQueries();
    },
    onError: (err: any) => alert(`Errore creazione partita: ${err.message}`),
  });

  // Switch manuale/automatico nel sondaggio attivo
  const toggleAutoCreate = async (enabled: boolean) => {
    if (!activePoll?.id) return;
    await supabase.from('polls').update({ auto_create_match: enabled }).eq('id', activePoll.id);
    refetchPoll();
  };

  // Esecuzione automatica se attiva la spunta e si toccano 10 confermati
  useEffect(() => {
    if (
      activePoll &&
      activePoll.auto_create_match &&
      confirmedVotes.length >= 10 &&
      !createMatchMutation.isPending &&
      !activePoll.is_closed
    ) {
      createMatchMutation.mutate();
    }
  }, [activePoll, confirmedVotes.length]);

  // Sposta o scambia un giocatore tra le squadre
  const movePlayerBetweenTeams = async (fromTeam: 'A' | 'B', index: number) => {
    if (!upcomingMatch) return;
    const currentA = [...(upcomingMatch.team_a_players || [])];
    const currentB = [...(upcomingMatch.team_b_players || [])];

    if (fromTeam === 'A') {
      const [moved] = currentA.splice(index, 1);
      if (moved) currentB.push(moved);
    } else {
      const [moved] = currentB.splice(index, 1);
      if (moved) currentA.push(moved);
    }

    const { error } = await supabase
      .from('matches')
      .update({ team_a_players: currentA, team_b_players: currentB })
      .eq('id', upcomingMatch.id);

    if (!error) refetchMatch();
  };

  const avgTeamA = useMemo(() => {
    const players = upcomingMatch?.team_a_players || [];
    if (!players.length) return 0;
    const sum = players.reduce((acc: number, p: any) => acc + (p.overall || 65), 0);
    return Math.round((sum / players.length) * 10) / 10;
  }, [upcomingMatch]);

  const avgTeamB = useMemo(() => {
    const players = upcomingMatch?.team_b_players || [];
    if (!players.length) return 0;
    const sum = players.reduce((acc: number, p: any) => acc + (p.overall || 65), 0);
    return Math.round((sum / players.length) * 10) / 10;
  }, [upcomingMatch]);

  return (
    <div className="space-y-6">
      {/* 1. CARD EVENTO CREATO (PARTITA PROGRAMMATA) */}
      {upcomingMatch && (
        <div className="bg-[#121721] border border-amber-400/40 rounded-2xl p-5 shadow-2xl space-y-4">
          <div className="flex justify-between items-start border-b border-slate-800 pb-3">
            <div>
              <span className="bg-amber-400/20 text-amber-400 border border-amber-400/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider inline-block mb-1">
                EVENTO CONFERMATO
              </span>
              <h2 className="font-bebas text-3xl text-slate-100">MATCH DI CALCETTO</h2>
            </div>
            <div className="text-right">
              <span className="block font-bebas text-2xl text-lime-400 tracking-wider">
                {upcomingMatch.match_time || '21:00'}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {upcomingMatch.match_date}
              </span>
            </div>
          </div>

          {/* Formazioni con Medie Overall */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-2">
                <h3 className="font-bebas text-lg text-slate-200">
                  {upcomingMatch.team_a_name || 'Squadra A'}
                </h3>
                <span className="text-[11px] font-mono text-lime-400 font-bold">OVR {avgTeamA}</span>
              </div>
              <ul className="space-y-1.5 text-xs">
                {upcomingMatch.team_a_players?.map((p: any, idx: number) => (
                  <li key={idx} className="flex justify-between items-center text-slate-300">
                    <span className="truncate pr-1">
                      {p.name} {p.isGuest ? '(Guest)' : ''}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-amber-400 font-bold">{p.overall}</span>
                      {isAdmin && isEditingTeams && (
                        <button
                          type="button"
                          onClick={() => movePlayerBetweenTeams('A', idx)}
                          className="bg-slate-800 text-amber-400 hover:text-white px-1.5 py-0.5 rounded text-[10px]"
                          title="Sposta nell'altra squadra"
                        >
                          →
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#0b0e14] border border-slate-800 rounded-xl p-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1 mb-2">
                <h3 className="font-bebas text-lg text-slate-200">
                  {upcomingMatch.team_b_name || 'Squadra B'}
                </h3>
                <span className="text-[11px] font-mono text-lime-400 font-bold">OVR {avgTeamB}</span>
              </div>
              <ul className="space-y-1.5 text-xs">
                {upcomingMatch.team_b_players?.map((p: any, idx: number) => (
                  <li key={idx} className="flex justify-between items-center text-slate-300">
                    <span className="truncate pr-1">
                      {p.name} {p.isGuest ? '(Guest)' : ''}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-amber-400 font-bold">{p.overall}</span>
                      {isAdmin && isEditingTeams && (
                        <button
                          type="button"
                          onClick={() => movePlayerBetweenTeams('B', idx)}
                          className="bg-slate-800 text-amber-400 hover:text-white px-1.5 py-0.5 rounded text-[10px]"
                          title="Sposta nell'altra squadra"
                        >
                          ←
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Azioni Admin Formazione */}
          {isAdmin && (
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditingTeams(!isEditingTeams)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 rounded-lg transition"
              >
                {isEditingTeams ? 'Salva Formazioni' : 'Modifica Formazioni'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. WIDGET SONDAGGIO IN CORSO */}
      {activePoll && (
        <div className="bg-[#121721] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="bg-lime-400/10 text-lime-400 border border-lime-400/20 text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-wider">
                SONDAGGIO IN CORSO
              </span>
              <h2 className="font-bebas text-2xl text-slate-100 mt-1">
                {activePoll.title || 'Prossima Partita'}
              </h2>
              <p className="text-xs text-slate-400">
                Data proposta: <strong className="text-lime-400">{activePoll.target_date}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="font-bebas text-3xl text-lime-400 leading-none">
                {confirmedVotes.length}/10
              </span>
              <span className="block text-[10px] uppercase font-bold text-slate-400">
                Confermati
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className="bg-lime-400 h-2.5 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, (confirmedVotes.length / 10) * 100)}%` }}
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">
              Lista Presenze ({confirmedVotes.length}):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {confirmedVotes.map((v: any, idx: number) => (
                <span
                  key={v.id || idx}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                >
                  <strong className="text-lime-400 font-bebas text-sm">#{idx + 1}</strong>
                  {v.guest_name || v.players?.name || 'Giocatore'}
                </span>
              ))}
              {confirmedVotes.length === 0 && (
                <span className="text-xs text-slate-500 italic">Nessun voto registrato ancora.</span>
              )}
            </div>
          </div>

          {/* CONTROLLI ADMIN */}
          {isAdmin && (
            <div className="bg-[#0b0e14] border border-slate-800 p-3 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Crea partita automatica a 10
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Genera e bilancia subito l'evento appena si tocca quota 10
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(activePoll.auto_create_match)}
                  onChange={(e) => toggleAutoCreate(e.target.checked)}
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </div>

              {confirmedVotes.length >= 10 && (
                <button
                  type="button"
                  disabled={createMatchMutation.isPending}
                  onClick={() => createMatchMutation.mutate()}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-lg rounded-xl font-bold shadow transition tracking-wider"
                >
                  {createMatchMutation.isPending ? 'BILANCIAMENTO IN CORSO...' : 'CONFERMA CONVOCAZIONI E GENERA SQUADRE'}
                </button>
              )}
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Orario preferito: <strong className="text-lime-400 font-mono">{bestSlot}</strong>
            </span>
            <Link
              to="/polls"
              className="bg-lime-400 hover:bg-lime-300 text-slate-950 font-bebas text-base px-4 py-1.5 rounded-xl font-bold transition shadow"
            >
              VOTA / DETTAGLI →
            </Link>
          </div>
        </div>
      )}

      {/* 3. NESSUN EVENTO O SONDAGGIO */}
      {!activePoll && !upcomingMatch && (
        <div className="bg-[#121721] border border-slate-800 rounded-2xl p-6 text-center space-y-3">
          <p className="font-bebas text-2xl text-slate-300">NESSUNA PARTITA IN PROGRAMMA</p>
          <p className="text-xs text-slate-400">
            Non ci sono sondaggi aperti o partite pianificate al momento.
          </p>
        </div>
      )}
    </div>
  );
}
