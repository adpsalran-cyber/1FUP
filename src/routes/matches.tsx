import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { supabase } from '../lib/actions';

export function MatchesPage() {
  const [activeTab, setActiveTab] = useState<'giocate' | 'programmate' | 'storico'>('giocate');
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  const leagueId = typeof window !== 'undefined'
    ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
    : null;

  const { data: matches, isLoading } = useQuery({
    queryKey: ['league_matches', leagueId],
    queryFn: async () => {
      let query = supabase
        .from('matches')
        .select(`
          id,
          played_at,
          scheduled_at,
          status,
          home_score,
          away_score,
          match_mvp_id,
          match_summary,
          league_id
        `)
        .order('played_at', { ascending: false });

      if (leagueId) {
        query = query.eq('league_id', leagueId);
      }

      const res = await query;
      if (res.error) throw new Error(res.error.message);
      return res.data || [];
    },
  });

  const matchesList = matches || [];

  const filteredMatches = matchesList.filter((m: any) => {
    if (activeTab === 'giocate') return m.status === 'completed';
    if (activeTab === 'programmate') return m.status === 'scheduled';
    return true;
  });

  return (
    <div className="p-4 space-y-4 pb-24 max-w-lg mx-auto">
      <div className="border-b border-[#222c42] pb-3 flex justify-between items-center">
        <div>
          <h1 className="font-bebas text-3xl text-slate-100">PARTITE</h1>
          <p className="text-xs text-slate-400">Resoconti, convocazioni e archivio</p>
        </div>
      </div>

      <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('giocate')}
          className={`flex-1 py-2 rounded-lg transition uppercase ${
            activeTab === 'giocate' ? 'bg-amber-400 text-slate-950 shadow font-bold' : 'text-slate-400'
          }`}
        >
          Giocate
        </button>
        <button
          onClick={() => setActiveTab('programmate')}
          className={`flex-1 py-2 rounded-lg transition uppercase ${
            activeTab === 'programmate' ? 'bg-amber-400 text-slate-950 shadow font-bold' : 'text-slate-400'
          }`}
        >
          Prossime
        </button>
        <button
          onClick={() => setActiveTab('storico')}
          className={`flex-1 py-2 rounded-lg transition uppercase ${
            activeTab === 'storico' ? 'bg-amber-400 text-slate-950 shadow font-bold' : 'text-slate-400'
          }`}
        >
          Tutte
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-amber-400 font-bebas text-lg animate-pulse">
          CARICAMENTO PARTITE...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="bg-[#151b28] border border-[#222c42] rounded-xl p-8 text-center space-y-2">
          <p className="font-bebas text-xl text-slate-300">NESSUNA PARTITA IN QUESTA SEZIONE</p>
          <p className="text-xs text-slate-400">
            {activeTab === 'giocate'
              ? 'Nessuna partita disputata registrata.'
              : activeTab === 'programmate'
              ? 'Nessuna gara in programma.'
              : 'Nessuna partita presente a sistema.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((match: any) => {
            const isCompleted = match.status === 'completed';
            const dateStr = match.played_at || match.scheduled_at;
            const formattedDate = dateStr
              ? new Date(dateStr).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
              : 'Data non definita';

            return (
              <div
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className="bg-[#151b28] border border-[#222c42] hover:border-amber-400/40 rounded-xl p-4 transition cursor-pointer space-y-3"
              >
                <div className="flex justify-between items-center text-[11px] text-slate-400 border-b border-[#222c42]/60 pb-2">
                  <span className="flex items-center gap-1 font-medium">
                    📅 {formattedDate}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isCompleted ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800' : 'bg-amber-950/70 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {isCompleted ? 'Conclusa' : 'In Programma'}
                  </span>
                </div>

                <div className="flex items-center justify-between px-2 py-1">
                  <span className="font-bebas text-lg text-slate-200">SQUADRA A</span>
                  <div className="flex items-center gap-2 bg-[#0b0e14] px-3 py-1 rounded-lg border border-[#222c42]">
                    <span className="font-bebas text-2xl text-amber-400">
                      {match.home_score ?? '-'}
                    </span>
                    <span className="text-slate-500 font-bold">:</span>
                    <span className="font-bebas text-2xl text-amber-400">
                      {match.away_score ?? '-'}
                    </span>
                  </div>
                  <span className="font-bebas text-lg text-slate-200">SQUADRA B</span>
                </div>

                {isCompleted && match.match_summary && (
                  <p className="text-xs text-slate-400 line-clamp-2 bg-[#0b0e14]/50 p-2 rounded-lg italic">
                    "{match.match_summary}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedMatch && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedMatch(null)}
        >
          <div
            className="bg-[#151b28] border border-[#222c42] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-[#222c42] pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  RESOCONTO GARA
                </span>
                <h3 className="font-bebas text-2xl text-slate-100">
                  {selectedMatch.home_score !== null ? `${selectedMatch.home_score} - ${selectedMatch.away_score}` : 'In programma'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="w-7 h-7 rounded-full bg-[#0b0e14] text-slate-400 flex items-center justify-center hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block uppercase text-[10px]">Data e Ora</span>
                <span className="text-slate-200">
                  {selectedMatch.played_at || selectedMatch.scheduled_at
                    ? new Date(selectedMatch.played_at || selectedMatch.scheduled_at).toLocaleString('it-IT')
                    : 'Non specificata'}
                </span>
              </div>

              {selectedMatch.match_summary && (
                <div>
                  <span className="text-slate-500 font-semibold block uppercase text-[10px]">Cronaca Partita</span>
                  <div className="bg-[#0b0e14] p-3 rounded-xl border border-[#222c42] text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selectedMatch.match_summary}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedMatch(null)}
              className="w-full py-2.5 bg-[#0b0e14] hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl transition"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matches',
  component: MatchesPage,
});
