import React, { useEffect, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { supabase } from '../lib/engine';
import { AuthModal } from './AuthModal';
import { LeagueModal } from './LeagueModal';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leagueId, setLeagueId] = useState<string | null>(localStorage.getItem('alci_league_id'));
  const [leagueName, setLeagueName] = useState<string>('');
  const [needsProfile, setNeedsProfile] = useState(false);

  const checkUserStatus = async (user: any) => {
    if (!user) {
      setSession(null);
      setLoading(false);
      return;
    }

    setSession(user);

    // Verifica se l'utente appartiene a una lega
    const { data: membership } = await supabase
      .from('league_members')
      .select('league_id, role, leagues(name, invite_code)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (membership && membership.league_id) {
      const lid = membership.league_id;
      setLeagueId(lid);
      localStorage.setItem('alci_league_id', lid);
      const lName = (membership.leagues as any)?.name || 'La Mia Lega';
      setLeagueName(lName);

      // Verifica se ha già un profilo giocatore in questa lega
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('league_id', lid)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!player) {
        setNeedsProfile(true);
      } else {
        setNeedsProfile(false);
      }
    } else {
      setLeagueId(null);
      setNeedsProfile(true);
    }

    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUserStatus(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUserStatus(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('alci_league_id');
    setSession(null);
    setLeagueId(null);
    setNeedsProfile(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0e14] text-amber-400 font-bebas text-2xl tracking-widest">
        CARICAMENTO ALCI FUTSAL...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0e14] text-slate-100 font-sans pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-800/80 bg-[#121721]/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-bebas text-2xl tracking-wider text-amber-400">ALCI</span>
          {leagueName && (
            <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-amber-400 border border-amber-400/20">
              {leagueName}
            </span>
          )}
        </div>
        {session && (
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-red-950/40 hover:text-red-400 hover:border-red-800 transition"
          >
            Esci
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Auth Modal se non loggato */}
      {!session && (
        <AuthModal
          onSuccess={() => {
            supabase.auth.getUser().then(({ data: { user } }) => checkUserStatus(user));
          }}
        />
      )}

      {/* League & Profile Modal se loggato ma senza lega o profilo configurato */}
      {session && (!leagueId || needsProfile) && (
        <LeagueModal
          userId={session.id}
          onLeagueSelected={(lid) => {
            localStorage.setItem('alci_league_id', lid);
            setLeagueId(lid);
            setNeedsProfile(false);
            supabase.auth.getUser().then(({ data: { user } }) => checkUserStatus(user));
          }}
        />
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/80 bg-[#121721]/95 backdrop-blur-md py-2">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 text-[11px] font-medium tracking-wide uppercase transition ${
              currentPath === '/' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">⚽</span>
            Home
          </Link>
          <Link
            to="/polls"
            className={`flex flex-col items-center gap-1 text-[11px] font-medium tracking-wide uppercase transition ${
              currentPath === '/polls' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">⭐</span>
            Pagelle
          </Link>
          <Link
            to="/standings"
            className={`flex flex-col items-center gap-1 text-[11px] font-medium tracking-wide uppercase transition ${
              currentPath === '/standings' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">🏆</span>
            Classifica
          </Link>
          <Link
            to="/players"
            className={`flex flex-col items-center gap-1 text-[11px] font-medium tracking-wide uppercase transition ${
              currentPath === '/players' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">👤</span>
            Rosa
          </Link>
          <Link
            to="/admin"
            className={`flex flex-col items-center gap-1 text-[11px] font-medium tracking-wide uppercase transition ${
              currentPath === '/admin' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">⚙️</span>
            Admin
          </Link>
        </div>
      </nav>
    </div>
  );
};
