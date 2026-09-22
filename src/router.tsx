import React from 'react';
import { createRouter, createRoute } from '@tanstack/react-router';
import { Route as rootRoute } from './routes/__root';
import { Route as indexRoute } from './routes/index';
import { Route as pollsRoute } from './routes/polls';
import { Route as standingsRoute } from './routes/standings';
import { Route as playersRoute } from './routes/players';
import { Route as matchDetailRoute } from './routes/matches.$matchId';
import { Route as adminRoute } from './routes/admin';
import { Route as matchesRoute } from './routes/matches';

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: () => (
    <div className="p-6 text-center font-bebas text-slate-400">
      Scheda Profilo Giocatore
    </div>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  pollsRoute,
  standingsRoute,
  playersRoute,
  matchesRoute,
  matchDetailRoute,
  adminRoute,
  profileRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
