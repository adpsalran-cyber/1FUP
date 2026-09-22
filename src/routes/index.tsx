import React from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { fetchNextMatchWidgetData, queryKeys, supabase } from '../lib/actions';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

function HomePage() {
  const LEAGUE_ID = '00000000-0000-0000-0000-000000000001';

  const { data: widgetData, isLoading: widgetLoading } = useQuery({
    queryKey: queryKeys.nextMatchWidget(LEAGUE_ID),
    queryFn: () => fetchNextMatchWidgetData(LEAGUE_ID),
  });

  const { data: recentMatches } = useQuery({
    queryKey: queryKeys.matches(LEAGUE_ID),
    queryFn: async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('league_id', LEAGUE_ID)
        .order('played_at', { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  return (
    <div className="p-4 space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1b2537] to-[#111722] border border-[#222c42] p-5 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bebas text-xs tracking-wider text-lime-400 uppercase bg-lime-400/10 px-2.5 py-1 rounded-full border border-lime-400/20">
            PROSSIMA SFIDA
          </span>
          <span className="text-xs text-slate-400 font-semibold">
            {widgetData?.targetDate ? new Date(widgetData.targetDate).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }) : 'In attesa'}
          </span>
        </div>

        {widgetLoading ? (
          <div className="py-6 text-center text-sm text-slate-400">Caricamento stato convocazioni...</div>
        ) : widgetData?.pollId ? (
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Fascia Oraria Più Votata</p>
                <p className="font-bebas text-3xl text-slate-100">{widgetData.winningSlot || 'Da definire'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Confermati</p>
                <p className="font-bebas text-3xl text-lime-400">
                  {widgetData.confirmedCount} <span className="text-lg text-slate-500">/ {widgetData.maxSlots}</span>
                </p>
              </div>
            </div>

            <div className="w-full bg-[#0b0e14] h-2.5 rounded-full overflow-hidden border border-[#222c42]">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  widgetData.isRosterFull ? 'bg-amber-400' : 'bg-lime-400'
                }`}
                style={{ width: `${Math.min(100, (widgetData.confirmedCount / widgetData.maxSlots) * 100)}%` }}
              />
            </div>

            <div className="pt-2">
              <Link
                to="/polls"
                className="w-full block py-3 bg-lime-400 hover:bg-lime-300 text-black font-bebas text-xl text-center rounded-xl shadow-lg transition-transform active:scale-[0.98]"
              >
                VOTA O REGISTRA PRESENZA
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-slate-400 mb-3">Nessun sondaggio attivo al momento.</p>
            <Link to="/polls" className="inline-block px-4 py-2 bg-[#222c42] text-xs font-bold rounded-lg text-slate-200">
              Apri Sezione Sondaggi
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="font-bebas text-xl text-slate-200 tracking-wide">ACCESSO RAPIDO</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/standings"
            className="p-4 rounded-xl bg-[#151b28] border border-[#222c42] hover:border-lime-400/40 transition-colors flex flex-col items-center text-center space-y-2"
          >
            <span className="text-3xl">🏆</span>
            <span className="font-bebas text-lg text-slate-100">CLASSIFICHE</span>
            <span className="text-[11px] text-slate-400">Ufficiale & Generale</span>
          </Link>
          <Link
            to="/players"
            className="p-4 rounded-xl bg-[#151b28] border border-[#222c42] hover:border-lime-400/40 transition-colors flex flex-col items-center text-center space-y-2"
          >
            <span className="text-3xl">🎴</span>
            <span className="font-bebas text-lg text-slate-100">CARTE GIOCATORI</span>
            <span className="text-[11px] text-slate-400">Valutazioni & Ruoli</span>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bebas text-xl text-slate-200 tracking-wide px-1">ULTIME SFIDE</h2>
        {recentMatches && recentMatches.length > 0 ? (
          <div className="space-y-2">
            {recentMatches.map((m: any) => (
              <Link
                key={m.id}
                to="/matches/$matchId"
                params={{ matchId: m.id }}
                className="block p-3.5 rounded-xl bg-[#151b28] border border-[#222c42] hover:border-slate-600 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">
                    {new Date(m.played_at).toLocaleDateString('it-IT')}
                  </span>
                  <span className="font-bebas text-lg text-lime-400">
                    SQUADRA A {m.score_a} - {m.score_b} SQUADRA B
                  </span>
                </div>
              </Link>
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
