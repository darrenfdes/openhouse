// Import, export and share. A plan comes in only when it passes `validate`.
import { useState } from 'react';
import { downloadJson, downloadText } from '../lib/download';
import { EXAMPLE, FORMAT_GUIDE, PROMPT } from '../lib/importPrompt';
import { navigate } from '../lib/route';
import { validate, type Validation } from '../schema/validate';
import { useSelected, useStore } from '../state/store';
import { PlanActions } from './PlanActions';

/** Parses pasted text, accepting the code fences a chat assistant wraps JSON in. */
export function parsePlanText(text: string): { value?: unknown; error?: string } {
  const body = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  if (!body) return { error: 'Paste a plan or drop a file first.' };
  try {
    return { value: JSON.parse(body) };
  } catch (e) {
    return { error: `This is not valid JSON, so nothing can be read from it. ${(e as Error).message}` };
  }
}

export function Import() {
  const { dispatch } = useStore();
  const selected = useSelected();
  const [text, setText] = useState('');
  const [check, setCheck] = useState<Validation | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = (t: string) => {
    setText(t);
    const p = parsePlanText(t);
    setParseError(p.error ?? null);
    setCheck(p.error ? null : validate(p.value));
  };
  const readFile = (f: File | undefined) => f && f.text().then(run);
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(PROMPT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      window.prompt('Copy this prompt', PROMPT);
    }
  };

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Import and share</h1>
          <p className="finding">Bring in a plan as openhouse/v1 JSON, or send this one to a friend. Plans stay in this browser and in the links you share.</p>
        </div>
      </div>
      <div className="stack">
        <div className="pair">
          <section className="card stack" aria-labelledby="ai-h">
            <div className="card-head" style={{ marginBottom: 0 }}>
              <h2 id="ai-h">Write a plan with ChatGPT or Claude</h2>
            </div>
            <p className="card-note" style={{ margin: 0 }}>
              Copy this prompt into the assistant you use, add your own notes at the end, then paste its answer here. Open House never sends anything to an AI itself.
            </p>
            <pre className="prompt">{PROMPT.slice(0, 900)}…</pre>
            <div className="actions" style={{ justifyContent: 'flex-start' }}>
              <button type="button" className="btn primary" onClick={copyPrompt}>{copied ? 'Prompt copied' : 'Copy prompt'}</button>
              <button type="button" className="btn" onClick={() => downloadText('openhouse-v1-format.md', FORMAT_GUIDE, 'text/markdown')}>Download format</button>
              <button type="button" className="btn" onClick={() => downloadJson('velsao-stayvista.openhouse.json', EXAMPLE)}>Download Velsao example</button>
            </div>
          </section>

          <section className="card stack" aria-labelledby="paste-h">
            <div className="card-head" style={{ marginBottom: 0 }}>
              <h2 id="paste-h">Paste or drop a plan</h2>
            </div>
            <div
              className={`drop${over ? ' over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); readFile(e.dataTransfer.files[0]); }}
            >
              <label className="field-label" htmlFor="paste">Plan JSON</label>
              <textarea id="paste" className="input num" rows={8} value={text} placeholder='{ "format": "openhouse/v1", "name": … }' onChange={(e) => { setText(e.target.value); setCheck(null); setParseError(null); }} />
              <div className="actions" style={{ justifyContent: 'flex-start' }}>
                <button type="button" className="btn primary" onClick={() => run(text)}>Check plan</button>
                <label className="btn">
                  Choose a file
                  <input type="file" accept=".json,application/json" className="visually-hidden" onChange={(e) => readFile(e.target.files?.[0])} />
                </label>
              </div>
            </div>
            <div aria-live="polite" className="stack">
              {parseError && <p className="neg" style={{ margin: 0 }}>{parseError}</p>}
              {check && !check.ok && (
                <div>
                  <p style={{ margin: '0 0 6px' }}><strong>Fix {check.errors.length === 1 ? 'this' : `these ${check.errors.length}`} before the plan can load:</strong></p>
                  <ul className="errors">
                    {check.errors.map((e) => <li key={e.path + e.message}>{e.path && <span className="num">{e.path}: </span>}{e.message}</li>)}
                  </ul>
                </div>
              )}
              {check?.ok && check.plan && (
                <div className="stack">
                  <p style={{ margin: 0 }}><strong>{check.plan.name}</strong> is ready to load.</p>
                  {check.filled.length > 0 && <p className="card-note" style={{ margin: 0 }}>Filled from defaults: {check.filled.join(', ')}.</p>}
                  <div><button type="button" className="btn primary" onClick={() => { dispatch({ type: 'add', plan: check.plan! }); navigate('plan'); }}>Load plan</button></div>
                </div>
              )}
              {check && check.warnings.length > 0 && (
                <ul className="card-note" style={{ margin: 0, paddingLeft: 18 }}>
                  {check.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              )}
            </div>
          </section>
        </div>

        <section className="card" aria-labelledby="share-h">
          <div className="card-head">
            <h2 id="share-h">Share {selected.plan.name}</h2>
          </div>
          <div className="title-row" style={{ marginBottom: 0, alignItems: 'center' }}>
            <p className="card-note" style={{ margin: 0 }}>The link holds the whole plan, compressed. Anyone who opens it gets their own copy to change.</p>
            <PlanActions plan={selected.plan} id={selected.id} />
          </div>
        </section>
      </div>
    </>
  );
}
