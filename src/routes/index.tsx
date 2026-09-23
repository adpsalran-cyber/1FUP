import React, { useState } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

function HomePage() {
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);

  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  // 1. Partita con votazioni MVP attive
  const { data: activeVotingMatch } = useQuery({
    queryKey: ['active_voting_match', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return null;
      try {
        const now = new Date().toISOString();
        const { data } = await supabase
          .from('matches')
          .select('*')
          .eq('league_id', activeLeagueId)
          .eq('status', 'completed')
          .gt('voting_deadline', now)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return data || null;
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
  });

  // 2. Sondaggi: query protetta da polls
  const { data: activePolls = [] } = useQuery({
    queryKey: ['active_polls_home', activeLeagueId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('polls')
          .select('*')
          .eq('is_closed', false);

        if (error || !Array.isArray(data)) return [];

        if (activeLeagueId) {
          return data.filter(
            (p: any) => !p.league_id || p.league_id === activeLeagueId
          );
        }
        return data;
      } catch {
        return [];
      }
    },
  });

  // 3. Prossima partita in programma
  const { data: upcomingMatch } = useQuery({
    queryKey: ['upcoming_match_home', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return null;
      try {
        const { data } = await supabase
          .from('matches')
          .select('*')
          .eq('league_id', activeLeagueId)
          .eq('status', 'scheduled')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return data || null;
      } catch {
        return null;
      }
    },
  });

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      {/* Banner Titolo con colore di test ciano */}
      <div className="border-b border-slate-800 pb-3">
        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
          CENTRO SPORTIVO
        </span>
        <h1 className="font-bebas text-4xl text-white tracking-wider">HUB PRINCIPALE</h1>
      </div>

      {/* WIDGET PRIORITARIO: VOTAZIONI ATTIVE PER 2 ORE */}
      {activeVotingMatch && (
        <div className="bg-gradient-to-r from-amber-500/20 via-[#151c28] to-amber-500/10 border border-amber-400/60 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              VOTAZIONI ATTIVE (2 ORE)
            </span>
            <span className="text-xs font-mono text-slate-300">
              Scade alle: {new Date(activeVotingMatch.voting_deadline).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div>
            <h2 className="font-bebas text-2xl text-white tracking-wide">
              PAGELLE & MVP: {activeVotingMatch.score_team1} - {activeVotingMatch.score_team2}
            </h2>
            <p className="text-xs text-slate-300">
              Inserisci i tuoi voti a stelle e vota il migliore in campo della partita appena conclusa.
            </p>
          </div>

          <Link
            to="/matches"
            className="inline-block w-full text-center py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-base rounded-xl font-bold transition shadow"
          >
            VOTA ORA LE PAGELLE & MVP ➔
          </Link>
        </div>
      )}

      {/* CARD UNICA COMPATTA: CONVOCAZIONI & SONDAGGI */}
      {Array.isArray(activePolls) && activePolls.length > 0 && (
        <div className="bg-[#131926] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                CONVOCAZIONI & DISPONIBILITÀ
              </span>
              <h2 className="font-bebas text-2xl text-white tracking-wide">
                CALENDARIO SONDAGGI
              </h2>
            </div>
            <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              {activePolls.length} {activePolls.length === 1 ? 'GIORNO' : 'GIORNI'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Tocca un giorno per selezionare gli orari e confermare la tua presenza:
          </p>

          <div className="space-y-2">
            {activePolls.map((poll: any, index: number) => {
              const isSelected = selectedPollId === poll?.id;
              const slots: string[] = Array.isArray(poll?.time_slots) && poll.time_slots.length > 0
                ? poll.time_slots
                : ['19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];

              return (
                <div
                  key={poll?.id || `poll-${index}`}
                  className={`border rounded-xl transition-all overflow-hidden ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-400 shadow-md'
                      : 'bg-[#182132] border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPollId(isSelected ? null : poll?.id)}
                    className="w-full flex items-center justify-between p-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                      <div>
                        <div className="font-bebas text-lg tracking-wide text-white capitalize leading-tight">
                          {poll?.title || 'Partita di Calcetto'}
                        </div>
                        {poll?.target_date && (
                          <div className="text-[11px] text-slate-400 font-sans">
                            Data: <span className="text-emerald-400 font-mono font-semibold">{String(poll.target_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md transition ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {isSelected ? 'Chiudi ▲' : 'Prenotati ▼'}
                    </span>
                  </button>

                  {/* Espansione orari */}
                  {isSelected && (
                    <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-700/60 space-y-3 bg-[#121824]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                          Orari Disponibili:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {slots.map((slot) => (
                            <span
                              key={slot}
                              className="px-2 py-0.5 rounded text-xs font-mono bg-[#0b0e14] text-amber-400 border border-[#222c42]"
                            >
                              {slot}
                            </span>
                          ))}
                        </div>
                      </div>

                      <Link
                        to="/polls"
                        className="inline-block w-full text-center py-2 bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 font-bebas text-sm rounded-lg font-bold tracking-wider transition hover:brightness-105 shadow"
                      >
                        VAI AL SONDAGGIO & CONFERMA ➔
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WIDGET PROSSIMA PARTITA IN PROGRAMMA */}
      {upcomingMatch && (
        <div className="bg-[#131926] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            IN PROGRAMMA
          </span>
          <div className="flex justify-between items-center py-2 text-center">
            <span className="font-bold text-white text-sm">Squadra 1</span>
            <span className="font-bebas text-2xl text-amber-400">VS</span>
            <span className="font-bold text-white text-sm">Squadra 2</span>
          </div>
          <Link
            to="/matches"
            className="inline-block w-full text-center py-2 bg-[#0b0e14] hover:bg-slate-800 text-slate-200 font-bebas text-xs rounded-xl font-semibold transition border border-slate-800"
          >
            DETTAGLI FORMAZIONI ➔
          </Link>
        </div>
      )}
    </div>
  );
}
