import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { TERMS, type TermKey } from '../lib/glossary';

/** A term with its plain-English explanation on hover, focus or tap. */
export function Term({ k, children }: { k: TermKey; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', close);
    };
  }, [open]);
  return (
    <span className="term" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="term-btn" aria-describedby={open ? id : undefined} aria-expanded={open} onClick={() => setOpen((o) => !o)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
        {children}
      </button>
      {open && (
        <span role="tooltip" id={id} className="term-pop">
          {TERMS[k]}
        </span>
      )}
    </span>
  );
}
