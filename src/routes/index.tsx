import React from 'react';
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
  const activeLeagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  // 1. Cerca se c'è una partita completata con votazioni ancora aperte (entro 2 ore)
  const { data: activeVotingMatch } = useQuery({
    queryKey: ['active_voting_match', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return null;
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
    },
    refetchInterval: 30000, // Controlla ogni 30 secondi
  });

  // 2. Cerca eventuale sondaggio presenze aperto
  const { data: activePoll } = useQuery({
    queryKey: ['active_poll_home', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return null;
      const { data } = await supabase
        .from('match_polls')
        .select('*')
        .eq('league_id', activeLeagueId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    },
  });

  // 3. Prossima partita in programma
  const { data: upcomingMatch } = useQuery({
    queryKey: ['upcoming_match_home', activeLeagueId],
    queryFn: async () => {
      if (!activeLeagueId) return null;
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('league_id', activeLeagueId)
        .eq('status', 'scheduled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
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

      {/* WIDGET SECONDARIO: SONDAGGIO CONVOCAZIONI */}
      {!activeVotingMatch && activePoll && (
        <div className="bg-[#131926] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
            CONVOCAZIONI APERTE
          </span>
          <h2 className="font-bebas text-2xl text-white tracking-wide">
            {activePoll.title || 'Prossima Partita'}
          </h2>
          <p className="text-xs text-slate-400">
            Conferma la tua presenza per la generazione delle formazioni.
          </p>
          <Link
            to="/matches"
            className="inline-block w-full text-center py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bebas text-sm rounded-xl font-bold transition border border-slate-700"
          >
            VAI AL SONDAGGIO ➔
          </Link>
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
