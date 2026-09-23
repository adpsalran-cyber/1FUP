import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches',
  component: MatchesPage,
});

// Componente SVG puro per renderizzare stella piena, mezza o vuota senza glitch di font
function StarIcon({ type }: { type: 'full' | 'half' | 'empty' }) {
  if (type === 'empty') {
    return (
      <svg className="w-6 h-6 text-slate-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    );
  }

  if (type === 'half') {
    return (
      <div className="relative w-6 h-6">
        {/* Sagoma di base vuota */}
        <svg className="w-6 h-6 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        {/* Metà sinistra riempita in oro */}
        <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden">
          <svg className="w-6 h-6 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <svg className="w-6 h-6 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

// Componente StarRating con aree touch ottimizzate per mobile
function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange?: (val: number) => void;
  disabled?: boolean;
}) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-1 select-none py-1">
      {stars.map((starIndex) => {
        const fullVal = starIndex;
        const halfVal = starIndex - 0.5;
        const isFull = value >= fullVal;
        const isHalf = !isFull && value >= halfVal;

        const starType: 'full' | 'half' | 'empty' = isFull ? 'full' : isHalf ? 'half' : 'empty';

        return (
          <div
            key={starIndex}
            className={`relative flex items-center justify-center p-0.5 cursor-pointer touch-manipulation active:scale-95 transition-transform ${
              disabled ? 'pointer-events-none opacity-80' : ''
            }`}
          >
            {/* Metà sinistra (0.5) */}
            <button
              type="button"
              aria-label={`${halfVal} stelle`}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled && onChange) {
                  onChange(value === halfVal ? fullVal : halfVal);
                }
              }}
              className="absolute left-0 top-0 w-1/2 h-full z-10"
            />

            {/* Metà destra (1.0) */}
            <button
              type="button"
              aria-label={`${fullVal} stelle`}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled && onChange) {
                  onChange(value === fullVal ? halfVal : fullVal);
                }
              }}
              className="absolute right-0 top-0 w-1/2 h-full z-10"
            />

            {/* Icona SVG */}
            <StarIcon type={starType} />
          </div>
        );
      })}

      {/* Voto numerico visualizzato accanto */}
      <span className="text-xs font-mono text-amber-400 font-bold ml-1.5 min-w-[20px]">
        {value > 0 ? (value * 2).toFixed(0) : '-'}
      </span>
    </div>
  );
}

function MatchesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'scheduled' | 'completed'>('completed');
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  // Form inserimento punteggio
  const [scoreTeam1, setScoreTeam1] = useState<number>(0);
  const [scoreTeam2, setScoreTeam2] = useState<number>(0);
  const [savingScore, setSavingScore] = useState(false);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);

  // Stato Voti Locali per la partita selezionata
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});
  const [selectedMvp, setSelectedMvp] = useState<string | null>(null);
  const [submittingVotes, setSubmittingVotes] = useState(false);

  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  // 1. Recupera l'utente corrente da Supabase Auth
  const { data: currentUser } = useQuery({
    queryKey: ['current_user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // 2. Recupera i dettagli della lega per determinare chi è l'effettivo creatore/proprietario
  const { data: currentLeague } = useQuery({
    queryKey: ['current_league_details', activeLeagueId],
    enabled: !!activeLeagueId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', activeLeagueId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  // CONTROLLO PRIVILEGI ADMIN
  const isLeagueAdmin = typeof window !== 'undefined' && Boolean(
    (currentUser?.id && currentLeague?.created_by === currentUser.id) ||
    localStorage.getItem('alci_is_admin') === 'true' ||
    localStorage.getItem('alci_admin_logged') === 'true' ||
    localStorage.getItem('alci_user_role') === 'admin' ||
    localStorage.getItem('user_role') === 'admin' ||
    localStorage.getItem('league_admin') === 'true' ||
    sessionStorage.getItem('alci_admin') === 'true' ||
    (localStorage.getItem('alci_username') && localStorage.getItem('alci_username') !== 'ospite')
  );

  // 3. Recupera partite della lega
  const { data: matches, isLoading } = useQuery({
    queryKey: ['matches_list', activeLeagueId],
    queryFn: async () => {
      let query = supabase.from('matches').select('*').order('created_at', { ascending: false });
      if (activeLeagueId) {
        query = query.or(`league_id.eq.${activeLeagueId},league_id.is.null`);
      }
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    },
  });

  // 4. Recupera voti già dati dall'utente per la partita selezionata
  const { data: existingVotes, refetch: refetchVotes } = useQuery({
    queryKey: ['match_votes', selectedMatch?.id, currentUser?.id],
    enabled: !!selectedMatch?.id && !!currentUser?.id,
    queryFn: async () => {
      const { data: ratings } = await supabase
        .from('match_ratings')
        .select('rated_player_id, stars')
        .eq('match_id', selectedMatch.id)
        .eq('voter_user_id', currentUser.id);

      const { data: mvpVote } = await supabase
        .from('match_mvp_votes')
        .select('voted_player_id')
        .eq('match_id', selectedMatch.id)
        .eq('voter_user_id', currentUser.id)
        .maybeSingle();

      const ratingMap: Record<string, number> = {};
      ratings?.forEach((r: any) => {
        ratingMap[r.rated_player_id] = Number(r.stars);
      });

      setUserRatings(ratingMap);
      if (mvpVote?.voted_player_id) {
        setSelectedMvp(mvpVote.voted_player_id);
      }

      return { ratingMap, mvp: mvpVote?.voted_player_id };
    },
  });

  // 5. Calcolo medie voti e conteggio MVP per la partita selezionata
  const { data: summaryVotes } = useQuery({
    queryKey: ['summary_votes', selectedMatch?.id],
    enabled: !!selectedMatch?.id,
    queryFn: async () => {
      const { data: allRatings } = await supabase
        .from('match_ratings')
        .select('rated_player_id, stars')
        .eq('match_id', selectedMatch.id);

      const { data: allMvpVotes } = await supabase
        .from('match_mvp_votes')
        .select('voted_player_id')
        .eq('match_id', selectedMatch.id);

      const averages: Record<string, { avg: number; count: number }> = {};
      allRatings?.forEach((r: any) => {
        if (!averages[r.rated_player_id]) {
          averages[r.rated_player_id] = { avg: 0, count: 0 };
        }
        averages[r.rated_player_id].avg += Number(r.stars) * 2;
        averages[r.rated_player_id].count += 1;
      });

      Object.keys(averages).forEach((pId) => {
        averages[pId].avg = Number((averages[pId].avg / averages[pId].count).toFixed(1));
      });

      const mvpCounts: Record<string, number> = {};
      allMvpVotes?.forEach((m: any) => {
        mvpCounts[m.voted_player_id] = (mvpCounts[m.voted_player_id] || 0) + 1;
      });

      return { averages, mvpCounts };
    },
  });

  const scheduledMatches = (matches || []).filter((m: any) => m.status !== 'completed');
  const completedMatches = (matches || []).filter((m: any) => m.status === 'completed');

  // Inserimento Risultato e Aggiornamento Classifica
  const handleSaveResult = async (match: any) => {
    if (scoreTeam1 < 0 || scoreTeam2 < 0) {
      alert('I punteggi non possono essere negativi.');
      return;
    }

    setSavingScore(true);
    try {
      const now = new Date();
      const deadline = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

      const { error: matchError } = await supabase
        .from('matches')
        .update({
          score_team1: Number(scoreTeam1),
          score_team2: Number(scoreTeam2),
          status: 'completed',
          voting_deadline: deadline,
        })
        .eq('id', match.id);

      if (matchError) throw matchError;

      alert('Risultato salvato! Classifica aggiornata. Votazioni aperte per 2 ore.');
      queryClient.invalidateQueries({ queryKey: ['matches_list'] });
      queryClient.invalidateQueries({ queryKey: ['standings_table'] });
      setSelectedMatch(null);
      setTab('completed');
    } catch (err: any) {
      alert(`Errore salvataggio risultato: ${err.message}`);
    } finally {
      setSavingScore(false);
    }
  };

  // Eliminazione partita (riservata ad Admin) con ricalcolo immediato
  const handleDeleteMatch = async (matchId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const confirmed = window.confirm(
      'Sei sicuro di voler eliminare questa partita? Verranno ricalcolati immediatamente punti, presenze e gol nella classifica.'
    );
    if (!confirmed) return;

    setDeletingMatchId(matchId);
    try {
      await supabase.from('match_ratings').delete().eq('match_id', matchId);
      await supabase.from('match_mvp_votes').delete().eq('match_id', matchId);

      const { error } = await supabase.from('matches').delete().eq('id', matchId);
      if (error) throw error;

      alert('Partita eliminata. La classifica è stata ricalcolata.');
      queryClient.invalidateQueries({ queryKey: ['matches_list'] });
      queryClient.invalidateQueries({ queryKey: ['standings_table'] });

      if (selectedMatch?.id === matchId) {
        setSelectedMatch(null);
      }
    } catch (err: any) {
      alert(`Errore durante l'eliminazione: ${err.message}`);
    } finally {
      setDeletingMatchId(null);
    }
  };

  // Invio voti con stelle e MVP
  const handleSubmitVotes = async () => {
    if (!selectedMatch?.id) return;
    setSubmittingVotes(true);

    const voterId = currentUser?.id || localStorage.getItem('alci_user_id') || 'local_user';

    try {
      for (const [playerId, stars] of Object.entries(userRatings)) {
        await supabase.from('match_ratings').upsert(
          {
            match_id: selectedMatch.id,
            voter_user_id: voterId,
            rated_player_id: playerId,
            stars: stars,
          },
          { onConflict: 'match_id,voter_user_id,rated_player_id' }
        );
      }

      if (selectedMvp) {
        await supabase.from('match_mvp_votes').upsert(
          {
            match_id: selectedMatch.id,
            voter_user_id: voterId,
            voted_player_id: selectedMvp,
          },
          { onConflict: 'match_id,voter_user_id' }
        );

        const { data: mvpVotes } = await supabase
          .from('match_mvp_votes')
          .select('voted_player_id')
          .eq('match_id', selectedMatch.id);

        const counts: Record<string, number> = {};
        mvpVotes?.forEach((v: any) => {
          counts[v.voted_player_id] = (counts[v.voted_player_id] || 0) + 1;
        });

        let topPlayerId = null;
        let maxVotes = 0;
        for (const [pId, cnt] of Object.entries(counts)) {
          if (cnt > maxVotes) {
            maxVotes = cnt;
            topPlayerId = pId;
          }
        }

        if (topPlayerId) {
          await supabase
            .from('matches')
            .update({ mvp_player_id: topPlayerId })
            .eq('id', selectedMatch.id);
        }
      }

      alert('Voti registrati con successo!');
      refetchVotes();
      queryClient.invalidateQueries({ queryKey: ['summary_votes'] });
      queryClient.invalidateQueries({ queryKey: ['standings_table'] });
    } catch (err: any) {
      alert(`Errore invio voti: ${err.message}`);
    } finally {
      setSubmittingVotes(false);
    }
  };

  const isVotingOpen = (match: any) => {
    if (!match?.voting_deadline) return false;
    return new Date(match.voting_deadline).getTime() > Date.now();
  };

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3">
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
          ALCI FUTSAL
        </span>
        <h1 className="font-bebas text-4xl text-white tracking-wider">PARTITE</h1>
      </div>

      {/* Switch Tab: IN PROGRAMMA / GIOCATE */}
      <div className="grid grid-cols-2 bg-[#121721] p-1 rounded-2xl border border-slate-800 text-xs font-bebas">
        <button
          type="button"
          onClick={() => {
            setTab('scheduled');
            setSelectedMatch(null);
          }}
          className={`py-2 rounded-xl transition tracking-wider ${
            tab === 'scheduled'
              ? 'bg-amber-400 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          IN PROGRAMMA ({scheduledMatches.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('completed');
            setSelectedMatch(null);
          }}
          className={`py-2 rounded-xl transition tracking-wider ${
            tab === 'completed'
              ? 'bg-amber-400 text-slate-950 font-bold shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          GIOCATE ({completedMatches.length})
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-amber-400 font-bebas text-xl animate-pulse">
          CARICAMENTO PARTITE...
        </div>
      )}

      {/* LISTA: IN PROGRAMMA */}
      {tab === 'scheduled' && !selectedMatch && (
        <div className="space-y-4">
          {scheduledMatches.length === 0 ? (
            <div className="text-center py-10 bg-[#131926] border border-slate-800 rounded-2xl text-slate-500 text-xs italic">
              Nessuna partita in programma al momento.
            </div>
          ) : (
            scheduledMatches.map((m: any) => (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedMatch(m);
                  setScoreTeam1(m.score_team1 || 0);
                  setScoreTeam2(m.score_team2 || 0);
                }}
                className="bg-[#131926] border border-[#20293d] rounded-2xl p-5 shadow-xl hover:border-amber-400 transition cursor-pointer space-y-3"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono text-slate-400">
                    {new Date(m.created_at).toLocaleDateString('it-IT')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded">
                      DA GIOCARE
                    </span>
                    {isLeagueAdmin && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteMatch(m.id, e)}
                        disabled={deletingMatchId === m.id}
                        className="text-rose-400 hover:text-white px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 text-[10px] font-bold transition flex items-center gap-1 active:scale-95"
                        title="Elimina partita"
                      >
                        {deletingMatchId === m.id ? '...' : '🗑️ ELIMINA'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 px-4 bg-[#0b0e14] rounded-xl border border-slate-800 text-center">
                  <div className="flex-1">
                    <span className="font-bold text-white block text-sm">Squadra 1</span>
                    <span className="text-[10px] text-slate-400">
                      {m.team1_players?.length || 5} giocatori
                    </span>
                  </div>
                  <span className="font-bebas text-2xl text-amber-400 px-3">VS</span>
                  <div className="flex-1">
                    <span className="font-bold text-white block text-sm">Squadra 2</span>
                    <span className="text-[10px] text-slate-400">
                      {m.team2_players?.length || 5} giocatori
                    </span>
                  </div>
                </div>

                <div className="text-center text-[11px] text-amber-400 font-bold uppercase pt-1">
                  👉 Tocca per inserire il risultato finale
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SCHERMATA DETTAGLIO: INSERISCI RISULTATO */}
      {tab === 'scheduled' && selectedMatch && (
        <div className="bg-[#131926] border border-[#20293d] rounded-2xl p-5 shadow-2xl space-y-5">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h2 className="font-bebas text-2xl text-white">INSERISCI RISULTATO</h2>
            <button
              onClick={() => setSelectedMatch(null)}
              className="text-slate-400 hover:text-white text-xs underline"
            >
              Indietro
            </button>
          </div>

          <div className="grid grid-cols-3 items-center gap-3 bg-[#0b0e14] border border-slate-800 p-4 rounded-xl text-center">
            <div>
              <span className="font-bold text-white text-xs block mb-1">Squadra 1</span>
              <input
                type="number"
                min="0"
                value={scoreTeam1}
                onChange={(e) => setScoreTeam1(Number(e.target.value))}
                className="w-16 h-12 mx-auto text-center font-bebas text-3xl bg-[#141a27] border border-slate-700 text-white rounded-xl focus:border-amber-400 outline-none"
              />
            </div>

            <span className="font-bebas text-2xl text-slate-500">-</span>

            <div>
              <span className="font-bold text-white text-xs block mb-1">Squadra 2</span>
              <input
                type="number"
                min="0"
                value={scoreTeam2}
                onChange={(e) => setScoreTeam2(Number(e.target.value))}
                className="w-16 h-12 mx-auto text-center font-bebas text-3xl bg-[#141a27] border border-slate-700 text-white rounded-xl focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={savingScore}
              onClick={() => handleSaveResult(selectedMatch)}
              className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-lg rounded-xl font-bold transition shadow"
            >
              {savingScore ? 'SALVATAGGIO IN CORSO...' : 'CONFERMA E APRI VOTAZIONI (2 ORE)'}
            </button>

            {isLeagueAdmin && (
              <button
                type="button"
                onClick={() => handleDeleteMatch(selectedMatch.id)}
                disabled={deletingMatchId === selectedMatch.id}
                className="px-4 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-bebas text-sm rounded-xl transition"
                title="Elimina partita"
              >
                ELIMINA
              </button>
            )}
          </div>
        </div>
      )}

      {/* LISTA: GIOCATE */}
      {tab === 'completed' && !selectedMatch && (
        <div className="space-y-4">
          {completedMatches.length === 0 ? (
            <div className="text-center py-10 bg-[#131926] border border-slate-800 rounded-2xl text-slate-500 text-xs italic">
              Nessuna partita giocata registrata finora.
            </div>
          ) : (
            completedMatches.map((m: any) => {
              const votingActive = isVotingOpen(m);

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMatch(m)}
                  className="bg-[#131926] border border-[#20293d] rounded-2xl p-5 shadow-xl hover:border-slate-600 transition cursor-pointer space-y-3"
                >
                  {/* BOX VISIVO DI DEBUG */}
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-1 text-[9px] font-mono text-red-300 truncate">
                    ADMIN: {String(isLeagueAdmin)} | KEYS: {typeof window !== 'undefined' ? Object.keys(localStorage).join(', ') : ''}
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-slate-400">
                      {new Date(m.created_at).toLocaleDateString('it-IT')}
                    </span>
                    <div className="flex items-center gap-2">
                      {votingActive ? (
                        <span className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
                          VOTAZIONI ATTIVE
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded">
                          CONCLUSA
                        </span>
                      )}

                      {/* Tasto elimina: mostrato solo se sei l'admin */}
                      {isLeagueAdmin && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteMatch(m.id, e)}
                          disabled={deletingMatchId === m.id}
                          className="text-rose-400 hover:text-white px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/30 border border-rose-500/30 text-[10px] font-bold transition flex items-center gap-1 active:scale-95"
                          title="Elimina partita e aggiorna classifica"
                        >
                          {deletingMatchId === m.id ? '...' : '🗑️ ELIMINA'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-3 px-4 bg-[#0b0e14] rounded-xl border border-slate-800 text-center">
                    <div className="flex-1 font-bold text-white text-sm">Squadra 1</div>
                    <div className="font-bebas text-3xl text-amber-400 px-4">
                      {m.score_team1} - {m.score_team2}
                    </div>
                    <div className="flex-1 font-bold text-white text-sm">Squadra 2</div>
                  </div>

                  <div className="text-center text-[11px] text-slate-400 pt-1">
                    Tocca per visualizzare formazioni, pagelle e MVP
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* RESOCONTO PARTITA GIOCATA */}
      {tab === 'completed' && selectedMatch && (
        <div className="space-y-6">
          <div className="bg-[#131926] border border-[#20293d] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="font-bebas text-2xl text-white">RESOCONTO PARTITA</h2>
              <div className="flex items-center gap-3">
                {isLeagueAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMatch(selectedMatch.id)}
                    disabled={deletingMatchId === selectedMatch.id}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold uppercase px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/30 transition"
                  >
                    {deletingMatchId === selectedMatch.id ? 'ELIMINAZIONE...' : '🗑️ ELIMINA PARTITA'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="text-slate-400 hover:text-white text-xs underline"
                >
                  Indietro
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 px-4 bg-[#0b0e14] rounded-xl border border-slate-800 text-center">
              <span className="flex-1 font-bold text-white text-sm">Squadra 1</span>
              <span className="font-bebas text-4xl text-amber-400 px-4">
                {selectedMatch.score_team1} - {selectedMatch.score_team2}
              </span>
              <span className="flex-1 font-bold text-white text-sm">Squadra 2</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-[#0b0e14] p-3 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Squadra 1
                </span>
                {selectedMatch.team1_players?.map((p: any) => (
                  <div key={p.id} className="text-white font-medium truncate">
                    • {p.name}
                  </div>
                ))}
              </div>

              <div className="bg-[#0b0e14] p-3 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Squadra 2
                </span>
                {selectedMatch.team2_players?.map((p: any) => (
                  <div key={p.id} className="text-white font-medium truncate">
                    • {p.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BOX VOTAZIONI PARTECIPANTI (STELLE + MVP) */}
          <div className="bg-[#131926] border border-[#20293d] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div>
                <h3 className="font-bebas text-2xl text-white">PAGELLE & MVP</h3>
                <span className="text-[11px] text-slate-400">
                  {isVotingOpen(selectedMatch)
                    ? '⭐ Vota a stelle ogni giocatore e scegli il tuo MVP'
                    : '🔒 Votazioni chiuse (Medie ufficiali)'}
                </span>
              </div>

              {isVotingOpen(selectedMatch) && (
                <span className="bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[10px] font-bold px-2 py-1 rounded">
                  2 ORE ATTIVE
                </span>
              )}
            </div>

            <div className="space-y-3">
              {[
                ...(selectedMatch.team1_players || []),
                ...(selectedMatch.team2_players || []),
              ]
                .filter((p: any) => !p.is_dummy && !p.is_bot)
                .map((player: any) => {
                  const ratingVal = userRatings[player.id] || 0;
                  const isMvpSelected = selectedMvp === player.id;
                  const avgData = summaryVotes?.averages?.[player.id];

                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between bg-[#0b0e14] border border-slate-800/80 p-3 rounded-xl"
                    >
                      <div className="w-1/3 truncate">
                        <span className="font-bold text-white text-sm block truncate">
                          {player.name}
                        </span>
                        {avgData && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            Media: {avgData.avg}/10 ({avgData.count})
                          </span>
                        )}
                      </div>

                      <div className="flex-1 flex justify-center">
                        <StarRating
                          value={ratingVal}
                          onChange={(newVal) =>
                            setUserRatings((prev) => ({ ...prev, [player.id]: newVal }))
                          }
                          disabled={!isVotingOpen(selectedMatch)}
                        />
                      </div>

                      <div className="w-16 flex justify-end">
                        <button
                          type="button"
                          disabled={!isVotingOpen(selectedMatch)}
                          onClick={() => setSelectedMvp(player.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bebas tracking-wider transition ${
                            isMvpSelected
                              ? 'bg-amber-400 text-slate-950 font-bold shadow-md'
                              : 'bg-[#151c28] text-slate-400 hover:text-white border border-slate-700'
                          }`}
                        >
                          MVP
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {isVotingOpen(selectedMatch) && (
              <button
                type="button"
                disabled={submittingVotes}
                onClick={handleSubmitVotes}
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-lg rounded-xl font-bold transition shadow mt-3"
              >
                {submittingVotes ? 'INVIO DEI VOTI...' : 'SALVA LE MIE VALUTAZIONI'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
