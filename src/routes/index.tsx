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
      try {
        const now = new Date().toISOString();
        let query = supabase
          .from('matches')
          .select('*')
          .eq('status', 'completed')
          .gt('voting_deadline', now)
          .order('created_at', { ascending: false })
          .limit(1);

        if (activeLeagueId) {
          query = query.eq('league_id', activeLeagueId);
        }

        const { data } = await query.maybeSingle();
        return data || null;
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
  });

  // 2. Prossima partita in programma (evento confermato)
  const { data: upcomingMatch } = useQuery({
    queryKey: ['upcoming_match_home', activeLeagueId],
    queryFn: async () => {
      try {
        let query = supabase
          .from('matches')
          .select('*')
          .eq('status', 'scheduled')
          .order('created_at', { ascending: false })
          .limit(1);

        if (activeLeagueId) {
          query = query.eq('league_id', activeLeagueId);
        }

        const { data } = await query.maybeSingle();
        return data || null;
      } catch {
        return null;
      }
    },
  });

  // 3. Sondaggi attivi (is_closed: false)
  const { data: activePolls = [] } = useQuery({
    queryKey: ['active_polls_home', activeLeagueId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('polls')
          .select('*')
          .eq('is_closed', false);

        if (error || !Array.isArray(data)) return [];

        // Filtro flessibile su lega (se il sondaggio non ha lega o corrisponde)
        let list = data;
        if (activeLeagueId) {
          const matchLeague = data.filter((p: any) => p.league_id === activeLeagueId);
          if (matchLeague.length > 0) {
            list = matchLeague;
          }
        }

        return list.sort((a: any, b: any) => {
          const dateA = a.target_date || '';
          const dateB = b.target_date || '';
          return dateA.localeCompare(dateB);
        });
      } catch {
        return [];
      }
    },
  });

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      {/* Banner Titolo */}
      <div className="border-b border-slate-800 pb-3">
        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
          CENTRO SPORTIVO
        </span>
        <h1 className="font-bebas text-4xl text-white tracking-wider">HUB PRINCIPALE</h1>
      </div>

      {/* 1. MASSIMA PRIORITÀ: VOTAZIONI MVP ATTIVE (2 ORE) */}
      {activeVotingMatch && (
        <div className="bg-gradient-to-r from-amber-500/20 via-[#151c28] to-amber-500/10 border border-amber-400/60 rounded-2xl p-5 shadow-2xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              VOTAZIONI ATTIVE (2 ORE)
            </span>
            <span className="text-xs font-mono text-slate-300">
              Scade alle: {activeVotingMatch.voting_deadline ? new Date(activeVotingMatch.voting_deadline).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </span>
          </div>

          <div>
            <h2 className="font-bebas text-2xl text-white tracking-wide">
              PAGELLE & MVP: {activeVotingMatch.score_team1 ?? 0} - {activeVotingMatch.score_team2 ?? 0}
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

      {/* 2. SECONDA PRIORITÀ: PARTITA IN PROGRAMMA (CONVOCAZIONI CONCLUSE) */}
      {upcomingMatch && (
        <div className="bg-[#131926] border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              PARTITA CONFERMATA & IN PROGRAMMA
            </span>
            <span className="text-[11px] font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full">
              FORMAZIONI PRONTE
            </span>
          </div>
          <div className="flex justify-between items-center py-2 text-center">
            <span className="font-bold text-white text-sm">{upcomingMatch.team1_name || 'Squadra 1'}</span>
            <span className="font-bebas text-2xl text-amber-400">VS</span>
            <span className="font-bold text-white text-sm">{upcomingMatch.team2_name || 'Squadra 2'}</span>
          </div>
          <Link
            to="/matches"
            className="inline-block w-full text-center py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bebas text-sm rounded-xl font-bold transition shadow"
          >
            VEDI FORMAZIONI E DETTAGLI ➔
          </Link>
        </div>
      )}

      {/* 3. SONDAGGI CONVOCAZIONI (IN CIMA SE NON C'È PARTITA, O SOTTO DI ESSE) */}
      {Array.isArray(activePolls) && activePolls.length > 0 && (
        <div className="bg-[#131926] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <div>
              <span className="text-[10px] font-bold text-lime-400 uppercase tracking-wider block">
                CONVOCAZIONI & DISPONIBILITÀ
              </span>
              <h2 className="font-bebas text-2xl text-white tracking-wide">
                CALENDARIO SONDAGGI
              </h2>
            </div>
            <span className="text-[11px] font-semibold bg-lime-400/10 text-lime-400 border border-lime-400/30 px-2 py-0.5 rounded-full">
              {activePolls.length} {activePolls.length === 1 ? 'APERTO' : 'APERTI'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Tocca un sondaggio aperto per selezionare gli orari e dare la tua disponibilità:
          </p>

          <div className="space-y-2">
            {activePolls.map((poll: any) => {
              const rawDate = poll?.target_date ? String(poll.target_date).split('T')[0] : '';
              const isSelected = selectedPollId === poll?.id;

              let dayName = poll?.title || 'Sondaggio Partita';
              let formattedDate = rawDate;

              if (rawDate) {
                try {
                  const parts = rawDate.split('-');
                  if (parts.length === 3) {
                    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    if (!isNaN(d.getTime())) {
                      dayName = d.toLocaleDateString('it-IT', { weekday: 'long' });
                      formattedDate = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
                    }
                  }
                } catch {
                  formattedDate = rawDate;
                }
              }

              const slots: string[] = Array.isArray(poll?.time_slots) && poll.time_slots.length > 0
                ? poll.time_slots
                : ['18:30', '19:30', '20:30', '21:00', '21:30', '22:00'];

              return (
                <div
                  key={poll?.id}
                  className={`border rounded-xl transition-all overflow-hidden ${
                    isSelected
                      ? 'bg-slate-800/90 border-lime-400 shadow-md'
                      : 'bg-[#182132] border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPollId(isSelected ? null : poll?.id)}
                    className="w-full flex items-center justify-between p-3.5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.6)]" />
                      <div>
                        <div className="font-bebas text-lg tracking-wide text-white capitalize leading-tight">
                          {dayName} {formattedDate && <span className="text-slate-400 font-sans text-xs font-normal">({formattedDate})</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {poll?.title && poll.title !== dayName ? poll.title : 'Tocca per vedere gli orari'}
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md transition ${
                      isSelected
                        ? 'bg-lime-400 text-slate-950 font-bold'
                        : 'bg-lime-400/20 text-lime-300 border border-lime-400/40'
                    }`}>
                      {isSelected ? 'Chiudi ▲' : 'Vota Orario ▼'}
                    </span>
                  </button>

                  {/* Espansione orari e link */}
                  {isSelected && (
                    <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-700/60 space-y-3 bg-[#121824]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                          Fasce Orarie Disponibili:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {slots.map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded text-xs font-mono bg-[#0b0e14] text-lime-400 border border-slate-700"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <Link
                        to="/polls"
                        className="inline-block w-full text-center py-2 bg-gradient-to-r from-lime-400 to-lime-300 hover:brightness-105 text-slate-950 font-bebas text-base rounded-lg font-bold tracking-wider transition shadow"
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
    </div>
  );
}
