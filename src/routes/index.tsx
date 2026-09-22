import React, { useState, useEffect } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { queryKeys, supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

function HomePage() {
  const [activeLeagueId, setActiveLeagueId] = useState<string | null>(
    typeof window !== 'undefined'
      ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
      : null
  );

  // Se non c'è una lega nel localStorage, prende la prima disponibile
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

  // Recupera il sondaggio attivo più recente
  const { data: latestPoll, isLoading: pollLoading } = useQuery({
    queryKey: ['home_latest_poll', activeLeagueId],
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

  // Recupera i voti/conferme del sondaggio
  const { data: pollResponses } = useQuery({
    queryKey: ['home_poll_responses', latestPoll?.id],
    enabled: Boolean(latestPoll?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('poll_responses')
        .select('*')
        .eq('poll_id', latestPoll.id);

      if (error) return [];
      return data || [];
    },
  });

  // Calcolo statistiche sondaggio
  const confirmedCount = pollResponses?.filter((r: any) => r.is_available)?.length || 0;
  const maxSlots = 10;
  const isRosterFull = confirmedCount >= maxSlots;

  // Calcolo orario più votato
  const winningSlot = React.useMemo(() => {
    if (!pollResponses || pollResponses.length === 0) return 'In attesa di voti';
    const counts: Record<string, number> = {};
    pollResponses.forEach((r: any) => {
      if (r.preferred_time) {
        counts[r.preferred_time] = (counts[r.preferred_time] || 0) + 1;
      }
    });
    let topSlot = '';
    let maxVotes = 0;
    Object.entries(counts).forEach(([slot, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        topSlot = slot;
      }
    });
    return topSlot || 'Da definire';
  }, [pollResponses]);

  // Ultime partite archiviate
  const { data: recentMatches } = useQuery({
    queryKey: ['home_recent_matches', activeLeagueId],
    queryFn: async () => {
      let query = supabase.from('matches').select('*');
      if (activeLeagueId) {
        query = query.or(`league_id.eq.${activeLeagueId},league_id.is.null`);
      }
      const { data } = await query
        .order('match_date', { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  return (
    <div className="p-4 space-y-5 pb-24 max-w-lg mx-auto">
      {/* SEZIONE PROSSIMA SFIDA (WIDGET SONDAGGIO) */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1b2537] to-[#111722] border border-[#222c42] p-5 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bebas text-xs tracking-wider text-lime-400 uppercase bg-lime-400/10 px-2.5 py-1 rounded-full border border-lime-400/20">
            PROSSIMA SFIDA
          </span>
          <span className="text-xs text-slate-400 font-semibold">
            {latestPoll?.target_date
              ? new Date(latestPoll.target_date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
              : 'In attesa'}
          </span>
        </div>

        {pollLoading ? (
          <div className="py-6 text-center text-sm text-slate-400 animate-pulse">
            Caricamento stato convocazioni...
          </div>
        ) : latestPoll ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-bebas text-2xl text-slate-100 leading-tight">
                {latestPoll.title || 'PARTITA DI CALCETTO'}
              </h3>
              <p className="text-xs text-slate-400">
                Data: <strong className="text-slate-200">{latestPoll.target_date}</strong>
              </p>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Fascia Oraria Più Votata
                </p>
                <p className="font-bebas text-2xl text-amber-400">{winningSlot}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Confermati
                </p>
                <p className="font-bebas text-3xl text-lime-400">
                  {confirmedCount} <span className="text-lg text-slate-500">/ {maxSlots}</span>
                </p>
              </div>
            </div>

            <div className="w-full bg-[#0b0e14] h-2.5 rounded-full overflow-hidden border border-[#222c42]">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isRosterFull ? 'bg-amber-400' : 'bg-lime-400'
                }`}
                style={{ width: `${Math.min(100, (confirmedCount / maxSlots) * 100)}%` }}
              />
            </div>

            <div className="pt-1">
              <Link
                to="/polls"
                className="w-full block py-3 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bebas text-xl text-center rounded-xl shadow-lg transition-transform active:scale-[0.98] font-bold"
              >
                VOTA O REGISTRA PRESENZA
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center space-y-2">
            <p className="text-sm text-slate-400">Nessun sondaggio attivo al momento.</p>
            <Link
              to="/polls"
              className="inline-block px-4 py-2 bg-[#222c42] text-xs font-bold rounded-lg text-slate-200 hover:text-white"
            >
              Apri Sezione Sondaggi
            </Link>
          </div>
        )}
      </section>

      {/* ACCESSO RAPIDO */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="font-bebas text-xl text-slate-200 tracking-wide">ACCESSO RAPIDO</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/standings"
            className="p-4 rounded-xl bg-[#151b28] border border-[#222c42] hover:border-lime-400/40 transition flex flex-col items-center text-center space-y-2"
          >
            <span className="text-3xl">🏆</span>
            <span className="font-bebas text-lg text-slate-100">CLASSIFICHE</span>
            <span className="text-[11px] text-slate-400">Punti & Statistiche</span>
          </Link>
          <Link
            to="/players"
            className="p-4 rounded-xl bg-[#151b28] border border-[#222c42] hover:border-lime-400/40 transition flex flex-col items-center text-center space-y-2"
          >
            <span className="text-3xl">🎴</span>
            <span className="font-bebas text-lg text-slate-100">CARTE GIOCATORI</span>
            <span className="text-[11px] text-slate-400">Valutazioni & Archetipi</span>
          </Link>
        </div>
      </section>

      {/* ULTIME SFIDE */}
      <section className="space-y-3">
        <h2 className="font-bebas text-xl text-slate-200 tracking-wide px-1">ULTIME SFIDE</h2>
        {recentMatches && recentMatches.length > 0 ? (
          <div className="space-y-2">
            {recentMatches.map((m: any) => (
              <div
                key={m.id}
                className="block p-3.5 rounded-xl bg-[#151b28] border border-[#222c42]"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">
                    {new Date(m.match_date || m.played_at).toLocaleDateString('it-IT')}
                  </span>
                  <span className="font-bebas text-lg text-lime-400">
                    {m.home_score ?? 0} - {m.away_score ?? 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#151b28]/50 border border-[#222c42] text-center text-xs text-slate-400">
            Nessuna partita archiviata di recente.
          </div>
        )}
      </section>
    </div>
  );
}
