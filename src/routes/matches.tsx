import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Trophy, 
  Calendar, 
  Star, 
  Clock, 
  ChevronRight, 
  X, 
  Award, 
  Users 
} from 'lucide-react';

interface Match {
  id: string;
  league_id: string;
  played_at: string;
  score_a: number | null;
  score_b: number | null;
  team_a_name: string;
  team_b_name: string;
  is_completed: boolean;
  is_all_star: boolean;
  mvp_member_id: string | null;
}

interface PlayerParticipation {
  id: string;
  match_id: string;
  team: 'A' | 'B';
  goals: number;
  assists: number;
  player_name?: string;
}

export const MatchesRoute: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'completed' | 'scheduled' | 'all_star'>('completed');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [participants, setParticipants] = useState<PlayerParticipation[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('played_at', { ascending: false });

    if (!error && data) {
      setMatches(data as Match[]);
    }
    setLoading(false);
  };

  const handleOpenDetails = async (match: Match) => {
    setSelectedMatch(match);
    setLoadingDetails(true);

    const { data } = await supabase
      .from('match_participations')
      .select(`
        id,
        match_id,
        team,
        goals,
        assists,
        league_members (
          profiles (
            full_name,
            nickname
          )
        )
      `)
      .eq('match_id', match.id);

    if (data) {
      const formatted = (data as any[]).map((p) => ({
        id: p.id,
        match_id: p.match_id,
        team: p.team,
        goals: p.goals || 0,
        assists: p.assists || 0,
        player_name: p.league_members?.profiles?.nickname || p.league_members?.profiles?.full_name || 'Giocatore',
      }));
      setParticipants(formatted);
    } else {
      setParticipants([]);
    }
    setLoadingDetails(false);
  };

  const filteredMatches = matches.filter((m) => {
    if (activeTab === 'all_star') return m.is_all_star;
    if (activeTab === 'completed') return m.is_completed && !m.is_all_star;
    return !m.is_completed && !m.is_all_star;
  });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 text-white pb-24">
      {/* Intestazione */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black italic tracking-wider text-yellow-400">PARTITE</h1>
          <p className="text-xs text-zinc-400">Risultati, calendario e All-Star Game</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex rounded-xl bg-zinc-900 p-1 mb-6 border border-zinc-800">
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'completed'
              ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Trophy size={14} />
          Giocate
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'scheduled'
              ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Calendar size={14} />
          In programma
        </button>
        <button
          onClick={() => setActiveTab('all_star')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'all_star'
              ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Star size={14} />
          All-Star
        </button>
      </div>

      {/* Lista Partite */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <Clock className="mx-auto mb-2 text-zinc-600" size={32} />
          <p className="text-sm font-medium text-zinc-400">Nessuna partita trovata in questa sezione.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((match) => {
            const dateStr = new Date(match.played_at).toLocaleDateString('it-IT', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={match.id}
                onClick={() => handleOpenDetails(match)}
                className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 transition-all hover:border-yellow-400/50 hover:bg-zinc-850"
              >
                <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-yellow-400" />
                    {dateStr}
                  </span>
                  {match.is_all_star && (
                    <span className="flex items-center gap-1 rounded bg-yellow-400/10 px-2 py-0.5 font-bold text-yellow-400">
                      <Star size={10} fill="currentColor" /> ALL-STAR
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  {/* Squadra Casa */}
                  <div className="flex-1 text-right">
                    <span className="text-sm font-black tracking-wide text-zinc-100">
                      {match.team_a_name || 'Squadra A'}
                    </span>
                  </div>

                  {/* Punteggio o Orario */}
                  <div className="flex min-w-[70px] items-center justify-center">
                    {match.is_completed ? (
                      <span className="rounded-lg bg-zinc-800 px-3 py-1 text-base font-black italic tracking-widest text-yellow-400 border border-zinc-700">
                        {match.score_a ?? 0} - {match.score_b ?? 0}
                      </span>
                    ) : (
                      <span className="rounded-lg bg-zinc-800/60 px-2.5 py-1 text-[11px] font-bold text-zinc-400">
                        DA GIOCARE
                      </span>
                    )}
                  </div>

                  {/* Squadra Trasferta */}
                  <div className="flex-1 text-left flex items-center justify-between">
                    <span className="text-sm font-black tracking-wide text-zinc-100">
                      {match.team_b_name || 'Squadra B'}
                    </span>
                    <ChevronRight size={16} className="text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-yellow-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE DETTAGLIO PARTITA */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            {/* Pulsante Chiusura */}
            <button
              onClick={() => setSelectedMatch(null)}
              className="absolute right-4 top-4 rounded-full bg-zinc-900 p-1.5 text-zinc-400 hover:text-white"
            >
              <X size={18} />
            </button>

            {/* Titolo Modale */}
            <div className="mb-4 text-center">
              <span className="text-[11px] uppercase tracking-wider text-yellow-400 font-bold">
                Resoconto Partita
              </span>
              <h3 className="text-lg font-black italic tracking-wide text-zinc-100">
                {selectedMatch.team_a_name || 'Squadra A'} vs {selectedMatch.team_b_name || 'Squadra B'}
              </h3>
              <p className="text-xs text-zinc-400">
                {new Date(selectedMatch.played_at).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            {/* Punteggio Grande */}
            <div className="mb-6 flex items-center justify-center gap-6 rounded-xl bg-zinc-900/60 p-4 border border-zinc-800">
              <div className="text-center flex-1">
                <p className="text-xs font-bold text-zinc-400">{selectedMatch.team_a_name || 'Squadra A'}</p>
                <p className="text-3xl font-black text-yellow-400">{selectedMatch.score_a ?? '-'}</p>
              </div>
              <span className="text-xl font-black text-zinc-600">:</span>
              <div className="text-center flex-1">
                <p className="text-xs font-bold text-zinc-400">{selectedMatch.team_b_name || 'Squadra B'}</p>
                <p className="text-3xl font-black text-yellow-400">{selectedMatch.score_b ?? '-'}</p>
              </div>
            </div>

            {/* Partecipanti & Marcatori */}
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <Users size={14} className="text-yellow-400" /> Formazioni & Gol
              </div>

              {loadingDetails ? (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
                </div>
              ) : participants.length === 0 ? (
                <p className="py-4 text-center text-xs text-zinc-500">
                  Nessuna formazione registrata per questo match.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                  {/* Formazione A */}
                  <div className="rounded-lg bg-zinc-900/50 p-2.5 border border-zinc-850">
                    <p className="text-[11px] font-black text-yellow-400 mb-2 truncate">
                      {selectedMatch.team_a_name}
                    </p>
                    {participants.filter(p => p.team === 'A').map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-zinc-850/50">
                        <span className="truncate text-zinc-300">{p.player_name}</span>
                        {p.goals > 0 && (
                          <span className="text-[10px] font-bold bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded">
                            ⚽ {p.goals}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Formazione B */}
                  <div className="rounded-lg bg-zinc-900/50 p-2.5 border border-zinc-850">
                    <p className="text-[11px] font-black text-yellow-400 mb-2 truncate">
                      {selectedMatch.team_b_name}
                    </p>
                    {participants.filter(p => p.team === 'B').map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-zinc-850/50">
                        <span className="truncate text-zinc-300">{p.player_name}</span>
                        {p.goals > 0 && (
                          <span className="text-[10px] font-bold bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded">
                            ⚽ {p.goals}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedMatch(null)}
              className="mt-6 w-full rounded-xl bg-zinc-800 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
