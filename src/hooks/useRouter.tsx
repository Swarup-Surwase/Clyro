/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type AppRoute =
  | '/'
  | '/app'
  | '/app/handover'
  | '/app/audit'
  | '/app/how-it-works'
  | '/app/privacy'
  | '/app/settings';

const KNOWN_ROUTES: readonly AppRoute[] = [
  '/',
  '/app',
  '/app/handover',
  '/app/audit',
  '/app/how-it-works',
  '/app/privacy',
  '/app/settings',
];

function normalizePath(pathname: string): AppRoute {
  const clean = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if ((KNOWN_ROUTES as readonly string[]).includes(clean)) {
    return clean as AppRoute;
  }
  if (clean.startsWith('/app')) {
    return '/app';
  }
  return '/';
}

type RouterContextValue = {
  route: AppRoute;
  navigate: (to: AppRoute, hash?: string) => void;
};

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<AppRoute>(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => {
      setRoute(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: AppRoute, hash?: string) => {
    const nextPath = to;
    if (window.location.pathname !== nextPath || hash) {
      window.history.pushState({}, '', hash ? `${nextPath}#${hash}` : nextPath);
    }
    setRoute(nextPath);

    if (hash) {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  return <RouterContext.Provider value={{ route, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error('useRouter must be used inside RouterProvider');
  }
  return ctx;
}
