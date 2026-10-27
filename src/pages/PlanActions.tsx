import { useState } from 'react';
import { downloadJson, fileName } from '../lib/download';
import { shareHash } from '../lib/share';
import type { Plan } from '../schema/plan';
import { useStore } from '../state/store';

/** Share (the main action), download and copy for the selected plan. On a phone the last two fold into "More". */
export function PlanActions({ plan, id }: { plan: Plan; id: string }) {
  const { dispatch } = useStore();
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}/${shareHash(plan)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      window.prompt('Copy this link', url);
    }
  };
  const copy = () => dispatch({ type: 'duplicate', id });
  const download = () => downloadJson(fileName(plan.name), plan);
  return (
    <div className="actions">
      <button type="button" className="btn wide-only" onClick={copy}>Make a copy</button>
      <button type="button" className="btn wide-only" onClick={download}>Download JSON</button>
      <button type="button" className="btn primary" onClick={share}>{copied ? 'Link copied' : 'Copy share link'}</button>
      <details className="more">
        <summary className="btn">More</summary>
        <div className="more-menu">
          <button type="button" className="btn" onClick={copy}>Make a copy</button>
          <button type="button" className="btn" onClick={download}>Download JSON</button>
        </div>
      </details>
      <span className="visually-hidden" aria-live="polite">{copied ? 'Share link copied' : ''}</span>
    </div>
  );
}
