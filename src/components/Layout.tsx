import React from 'react';
import { Link, useRouterState } from '@tanstack/react-router';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const navItems = [
    { label: 'HOME', path: '/', icon: '⚽' },
    { label: 'SONDAGGI', path: '/polls', icon: '📅' },
    { label: 'CLASSIFICA', path: '/standings', icon: '🏆' },
    { label: 'CARTE', path: '/players', icon: '🎴' },
    { label: 'PARTITE', path: '/matches', icon: '⏱️' },
    { label: 'PROFILO', path: '/profile', icon: '👤' },
    { label: 'ADMIN', path: '/admin', icon: '⚙️' },
  ];

  return (
    <div className="flex justify-center min-h-screen bg-[#0b0e14] text-slate-100 font-inter antialiased selection:bg-lime-400 selection:text-black">
      <div className="w-full max-w-md min-h-screen flex flex-col bg-[#0b0e14] border-x border-[#222c42] relative shadow-2xl">
        <header className="sticky top-0 z-40 bg-[#0b0e14]/90 backdrop-blur-md border-b border-[#222c42] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bebas text-2xl tracking-wider text-lime-400">ALCI</span>
            <span className="font-bebas text-2xl tracking-wider text-slate-100">FUTSAL HUB</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-lime-400/10 text-lime-400 border border-lime-400/20">
              5v5 LIVE
            </span>
          </div>
        </header>

        <main className="flex-1 pb-24 overflow-y-auto">
          {children}
        </main>

        <nav className="fixed bottom-0 z-50 w-full max-w-md bg-[#151b28]/95 backdrop-blur-lg border-t border-[#222c42] px-1 py-1">
          <ul className="flex justify-between items-center list-none m-0 p-0">
            {navItems.map((item) => {
              const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
              return (
                <li key={item.path} className="flex-1">
                  <Link
                    to={item.path}
                    className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg transition-colors ${
                      isActive
                        ? 'text-lime-400 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-base leading-none mb-1">{item.icon}</span>
                    <span className="font-bebas text-[10px] tracking-tight leading-none text-center">
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
};
