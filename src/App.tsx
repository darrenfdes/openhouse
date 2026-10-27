import { useEffect, useState } from 'react';
import { IconClose, IconCompare, IconDetails, IconImport, IconMenu, IconPlan, IconTheme, Mark } from './components/Icons';
import { planFromHash } from './lib/share';
import { ROUTES, navigate, useRoute, type Route } from './lib/route';
import { Compare } from './pages/Compare';
import { Dashboard } from './pages/Dashboard';
import { Details } from './pages/Details';
import { Import } from './pages/Import';
import { StoreProvider, reducer, useSelected, useStore, type State } from './state/store';

const NAV: { route: Route; label: string; icon: () => React.ReactElement }[] = [
  { route: 'plan', label: 'Plan', icon: IconPlan },
  { route: 'details', label: 'All settings', icon: IconDetails },
  { route: 'compare', label: 'Compare', icon: IconCompare },
  { route: 'import', label: 'Import and share', icon: IconImport },
];

// A share link is read once, at load, outside React: StrictMode runs state initialisers twice.
const shared = planFromHash(window.location.hash);
if (shared.plan || shared.errors.length) window.history.replaceState(null, '', window.location.pathname);
if (shared.errors.length) window.setTimeout(() => window.alert(`This share link could not be opened.\n\n${shared.errors.join('\n')}`));

/** A plan arriving in a share link joins the saved plans and is selected. */
function withSharedPlan(state: State): State {
  return shared.plan ? reducer(state, { type: 'add', plan: shared.plan }) : state;
}

const THEME_KEY = 'openhouse:theme';
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(() => {
    try {
      return (localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null) ?? null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    try {
      if (theme) localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Private window: the choice lasts for this visit.
    }
  }, [theme]);
  const dark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { dark, toggle: () => setTheme(dark ? 'light' : 'dark') };
}

function Shell() {
  const route = useRoute();
  const { state, dispatch } = useStore();
  const { id, plan } = useSelected();
  const [menu, setMenu] = useState(false);
  const theme = useTheme();
  const go = (r: Route) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu(false);
    navigate(r);
  };
  useEffect(() => {
    document.title = `${route === 'plan' ? plan.name : NAV.find((n) => n.route === route)!.label} · Open House`;
  }, [route, plan.name]);

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand" style={{ padding: 0 }}><Mark size={22} /></span>
        <span className="topbar-title">{route === 'plan' ? plan.name : NAV.find((n) => n.route === route)!.label}</span>
        <button type="button" className="btn ghost" aria-label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}><IconMenu /></button>
      </header>
      <nav className={`sidebar${menu ? ' open' : ''}`} aria-label="Main">
        <div className="brand">
          <Mark />
          <span>Open House</span>
          {menu && <button type="button" className="btn ghost" style={{ marginLeft: 'auto' }} aria-label="Close menu" onClick={() => setMenu(false)}><IconClose /></button>}
        </div>
        <label className="visually-hidden" htmlFor="switcher">Plan</label>
        <select id="switcher" className="switcher" value={id} onChange={(e) => dispatch({ type: 'select', id: e.target.value })}>
          {state.plans.map((p) => <option key={p.id} value={p.id}>{p.plan.name}</option>)}
        </select>
        <div className="side-label">Velsao, South Goa</div>
        <div className="nav">
          {NAV.map((n) => (
            <a key={n.route} href={ROUTES[n.route]} onClick={go(n.route)} aria-current={route === n.route ? 'page' : undefined}>
              <n.icon />
              {n.label}
            </a>
          ))}
        </div>
        <div className="side-foot nav">
          <button type="button" className="navlink" onClick={theme.toggle}><IconTheme />{theme.dark ? 'Light mode' : 'Dark mode'}</button>
          <button type="button" className="navlink" onClick={() => window.confirm('Put back Plans A, B, C and the StayVista plan, and delete every change and plan you made?') && dispatch({ type: 'reset' })}>Start over</button>
        </div>
      </nav>
      <main className="canvas">
        {route === 'plan' && <Dashboard />}
        {route === 'details' && <Details />}
        {route === 'compare' && <Compare />}
        {route === 'import' && <Import />}
      </main>
    </div>
  );
}

export function App() {
  return (
    <StoreProvider init={withSharedPlan}>
      <Shell />
    </StoreProvider>
  );
}
