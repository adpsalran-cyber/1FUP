import { createRouter } from '@tanstack/react-router';
import { Route as rootRoute } from './routes/__root';
import { Route as indexRoute } from './routes/index';
import { Route as matchesRoute } from './routes/matches';
import { Route as standingsRoute } from './routes/standings';
import { Route as playersRoute } from './routes/players';
import { Route as pollsRoute } from './routes/polls';
import { Route as adminRoute } from './routes/admin';

const routeTree = rootRoute.addChildren([
  indexRoute,
  matchesRoute,
  standingsRoute,
  playersRoute,
  pollsRoute,
  adminRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
