import { useEffect, useId, useRef } from 'react';
import { Icon } from './ui';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Accessible modal: focus trap, Escape to close, restores focus, locks background scroll. */
export default function Modal({ title, onClose, children, footer, busy = false }) {
  const ref = useRef(null);
  const titleId = useId();
  const prev = useRef(null);

  useEffect(() => {
    prev.current = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = ref.current && ref.current.querySelector('input,select,textarea,button:not(.modal-x)');
    (first || ref.current).focus();
    return () => {
      document.body.style.overflow = overflow;
      if (prev.current && prev.current.focus) prev.current.focus();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && !busy) {
      e.stopPropagation();
      onClose();
    }
    if (e.key === 'Tab' && ref.current) {
      const items = [...ref.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1} onKeyDown={onKeyDown}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn modal-x" onClick={onClose} disabled={busy} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
