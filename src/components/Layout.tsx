import React, { useEffect, useState } from 'react';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { AuthModal } from './AuthModal';
import { LeagueModal } from './LeagueModal';
import { MyLeaguesModal } from './MyLeaguesModal';
import { ProfileView } from './ProfileView';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const currentPath = routerState.location.pathname;

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [leagueId, setLeagueId] = useState<string | null>(
    typeof window !== 'undefined'
      ? localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id')
      : null
  );
  const [leagueName, setLeagueName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('alci_user_role') || 'member' : 'member'
  );
  const [needsProfile, setNeedsProfile] = useState(false);
  const [showMyLeagues, setShowMyLeagues] = useState(false);

  // 1. Salva l'ultima schermata visitata ogni volta che cambia rotta
  useEffect(() => {
    if (typeof window !== 'undefined' && currentPath) {
      localStorage.setItem('alci_last_path', currentPath);
    }
  }, [currentPath]);

  // 2. Ripristina l'ultima schermata all'avvio se l'utente atterra sulla root '/'
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading && session && leagueId) {
      const savedPath = localStorage.getItem('alci_last_path');
      if (savedPath && savedPath !== '/' && currentPath === '/') {
        navigate({ to: savedPath as any });
      }
    }
  }, [loading, session, leagueId]);

  const checkUserStatus = async (user: any) => {
    if (!user) {
      setSession(null);
      setLoading(false);
      return;
    }

    setSession(user);

    const storedLeagueId = localStorage.getItem('alci_league_id') || localStorage.getItem('active_league_id');

    let membershipQuery = supabase
      .from('league_members')
      .select('league_id, role, leagues(name, invite_code, code)')
      .eq('user_id', user.id);

    if (storedLeagueId) {
      membershipQuery = membershipQuery.eq('league_id', storedLeagueId);
    }

    const { data: membership } = await membershipQuery.limit(1).maybeSingle();

    if (membership && membership.league_id) {
      const lid = membership.league_id;
      const role = membership.role || 'member';
      setLeagueId(lid);
      setUserRole(role);
      localStorage.setItem('alci_league_id', lid);
      localStorage.setItem('active_league_id', lid);
      localStorage.setItem('alci_user_role', role);
      const lName = (membership.leagues as any)?.name || 'La Mia Lega';
      setLeagueName(lName);

      if (role === 'admin') {
        setNeedsProfile(false);
        setLoading(false);
        return;
      }

      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('league_id', lid)
        .eq('user_id', user.id)
        .maybeSingle();

      setNeedsProfile(!player);
    } else {
      const { data: anyMembership } = await supabase
        .from('league_members')
        .select('league_id, role, leagues(name, invite_code, code)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (anyMembership?.league_id) {
        const lid = anyMembership.league_id;
        const role = anyMembership.role || 'member';
        setLeagueId(lid);
        setUserRole(role);
        localStorage.setItem('alci_league_id', lid);
        localStorage.setItem('active_league_id', lid);
        localStorage.setItem('alci_user_role', role);
        setLeagueName((anyMembership.leagues as any)?.name || 'La Mia Lega');
        setNeedsProfile(false);
      } else {
        setLeagueId(null);
        setLeagueName('');
        setNeedsProfile(true);
      }
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
    localStorage.removeItem('active_league_id');
    localStorage.removeItem('alci_user_role');
    localStorage.removeItem('alci_last_path');
    setSession(null);
    setLeagueId(null);
    setLeagueName('');
    setNeedsProfile(false);
  };

  const handleExitCurrentLeague = () => {
    localStorage.removeItem('alci_league_id');
    localStorage.removeItem('active_league_id');
    localStorage.removeItem('alci_user_role');
    localStorage.removeItem('alci_last_path');
    setLeagueId(null);
    setLeagueName('');
    setNeedsProfile(true);
    setShowMyLeagues(false);
  };

  const handleSelectLeague = (lid: string, role: string, name: string) => {
    localStorage.setItem('alci_league_id', lid);
    localStorage.setItem('active_league_id', lid);
    localStorage.setItem('alci_user_role', role);
    setLeagueId(lid);
    setUserRole(role);
    setLeagueName(name);
    setNeedsProfile(false);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0e14] text-amber-400 font-bebas text-2xl tracking-widest">
        CARICAMENTO ALCI FUTSAL...
      </div>
    );
  }

  const isAdmin = userRole === 'admin';

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0e14] text-slate-100 font-sans pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-800/80 bg-[#121721]/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="font-bebas text-2xl tracking-wider text-amber-400">ALCI</span>
          {leagueName && (
            <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-amber-400 border border-amber-400/20 max-w-[130px] truncate">
              {leagueName}
            </span>
          )}
        </div>

        {session && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                className={`p-1.5 rounded-lg border transition flex items-center justify-center ${
                  currentPath === '/admin'
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow'
                    : 'bg-[#151b28] border-slate-700 text-amber-400 hover:border-amber-400'
                }`}
                title="Pannello Amministrazione"
              >
                <span className="text-base leading-none">⚙️</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setShowMyLeagues(true)}
              className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-400 hover:text-slate-950 transition flex items-center gap-1 shadow-sm"
            >
              <span>🏆</span>
              <span>Le mie leghe</span>
            </button>

            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-red-950/40 hover:text-red-400 hover:border-red-800 transition"
            >
              Esci
            </button>
          </div>
        )}
      </header>

      {/* Contenuto principale gestito dal router */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Modale Le Mie Leghe */}
      {session && (
        <MyLeaguesModal
          isOpen={showMyLeagues}
          onClose={() => setShowMyLeagues(false)}
          onSelectLeague={handleSelectLeague}
          onExitCurrentLeague={handleExitCurrentLeague}
        />
      )}

      {/* Auth Modal */}
      {!session && (
        <AuthModal
          onSuccess={() => {
            supabase.auth.getUser().then(({ data: { user } }) => checkUserStatus(user));
          }}
        />
      )}

      {/* Selezione lega se non attiva */}
      {session && (!leagueId || needsProfile) && (
        <LeagueModal
          userId={session.id}
          onLeagueSelected={(lid, role) => {
            localStorage.setItem('alci_league_id', lid);
            localStorage.setItem('active_league_id', lid);
            localStorage.setItem('alci_user_role', role);
            setLeagueId(lid);
            setUserRole(role);
            setNeedsProfile(false);
          }}
        />
      )}

      {/* Barra inferiore fissa a 5 tab */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/80 bg-[#121721]/95 backdrop-blur-md py-2">
        <div className="mx-auto flex max-w-lg items-center justify-around px-2">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 text-[11px] font-medium tracking-wide uppercase transition ${
              currentPath === '/' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">⚽</span>
            Home
          </Link>
          <Link
            to="/matches"
            className={`flex flex-col items-center gap-1 text-[11px] font-medium tracking-wide uppercase transition ${
              currentPath === '/matches' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">⚔️</span>
            Partite
          </Link>
          <Link
            to="/standings"
            className={`flex flex-col items-center gap-1 text-[11px] font-medium tracking-wide uppercase transition ${
              currentPath === '/standings' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">🏆</span>
            Classifica
          </Link>
          <Link
            to="/players"
            className={`flex flex-col items-center gap-1 text-[11px] font-medium tracking-wide uppercase transition ${
              currentPath === '/players' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">🎴</span>
            Players
          </Link>
          <Link
            to="/profile"
            className={`flex flex-col items-center gap-1 text-[11px] font-medium tracking-wide uppercase transition ${
              currentPath === '/profile' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">👤</span>
            Profilo
          </Link>
        </div>
      </nav>
    </div>
  );
};
