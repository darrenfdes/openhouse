// One outline set, 16px, 1.5px stroke, drawn in currentColor.
import type { ReactNode } from 'react';

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export const IconPlan = () => (
  <Icon>
    <path d="M2 13.5h12M3 13.5V7l5-4 5 4v6.5" />
    <path d="M6.5 13.5v-3a1.5 1.5 0 0 1 3 0v3" />
  </Icon>
);
export const IconDetails = () => (
  <Icon>
    <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
    <circle cx="5" cy="4" r="1.2" fill="currentColor" />
    <circle cx="10.5" cy="8" r="1.2" fill="currentColor" />
    <circle cx="7" cy="12" r="1.2" fill="currentColor" />
  </Icon>
);
export const IconCompare = () => (
  <Icon>
    <path d="M2 13 6 8l3 2.5L14 4" />
    <path d="M2 13l4-2.5 3 1L14 8" strokeDasharray="1.5 2" />
  </Icon>
);
export const IconImport = () => (
  <Icon>
    <path d="M8 2v8M5 7l3 3 3-3" />
    <path d="M2.5 11v2.5h11V11" />
  </Icon>
);
export const IconMenu = () => (
  <Icon>
    <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
  </Icon>
);
export const IconClose = () => (
  <Icon>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Icon>
);
export const IconTheme = () => (
  <Icon>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 2.5v11a5.5 5.5 0 0 0 0-11z" fill="currentColor" />
  </Icon>
);

/** The Open House mark: an arched Indo-Portuguese doorway in laterite. */
export const Mark = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="1" y="1" width="22" height="22" rx="5" fill="var(--accent)" />
    <path d="M7 20V11a5 5 0 0 1 10 0v9" fill="none" stroke="var(--surface)" strokeWidth="2" />
    <path d="M10.5 20v-5.5a1.5 1.5 0 0 1 3 0V20" fill="var(--surface)" />
  </svg>
);
