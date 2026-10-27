import { useEffect, useState } from 'react';

export const ROUTES = { plan: '/', new: '/new', newProject: '/new-project', details: '/details', compare: '/compare', import: '/import' } as const;
export type Route = keyof typeof ROUTES;

function current(): Route {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return (Object.entries(ROUTES).find(([, p]) => p === path)?.[0] as Route) ?? 'plan';
}

export function navigate(route: Route, hash = '') {
  window.history.pushState(null, '', ROUTES[route] + hash);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const on = () => setRoute(current());
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  return route;
}
