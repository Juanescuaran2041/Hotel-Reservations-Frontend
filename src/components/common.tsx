import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Check, CircleAlert, Leaf, LoaderCircle, X } from 'lucide-react';
import type { ReservationStatus } from '../types';

export function Brand({ compact = false }: { compact?: boolean }): ReactNode {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`}>
      <span className="brand-mark">
        <Leaf size={27} strokeWidth={1.4} />
      </span>
      <div>
        <span className="brand-name">
          oliva<span>.</span>
        </span>
        <small>HOTEL & LIVING</small>
      </div>
    </div>
  );
}
export function StatusBadge({ status }: { status: ReservationStatus }): ReactNode {
  const labels = {
    confirmed: 'Confirmada',
    checked_in: 'En estancia',
    checked_out: 'Finalizada',
    cancelled: 'Cancelada',
  };
  return (
    <span className={`badge status-${status}`}>
      <i />
      {labels[status]}
    </span>
  );
}
export function ErrorMessage({
  message,
  dismiss,
}: {
  message: string;
  dismiss?: () => void;
}): ReactNode {
  if (!message) return null;
  return (
    <div role="alert" className="error-message">
      <CircleAlert size={18} />
      <span>{message}</span>
      {dismiss && (
        <button className="icon-button" aria-label="Cerrar aviso" onClick={dismiss}>
          <X size={17} />
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}): ReactNode {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Leaf size={30} strokeWidth={1.2} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading({ label = 'Cargando información…' }: { label?: string }): ReactNode {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={24} />
      {label}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  busy = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  busy?: boolean;
}): ReactNode {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`modal ${wide ? 'wide' : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">OLIVA · CADA DETALLE CUENTA</span>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label="Cerrar ventana"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SubmitButton({
  busy,
  children,
}: {
  busy: boolean;
  children: ReactNode;
}): ReactNode {
  return (
    <button className="button primary" type="submit" disabled={busy}>
      {busy ? <LoaderCircle className="spin" size={17} /> : null}
      {children}
      {busy ? null : <ArrowRight size={17} />}
    </button>
  );
}
export function Toast({ message, clear }: { message: string; clear: () => void }): ReactNode {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(clear, 5500);
      return () => clearTimeout(timer);
    }
  }, [message, clear]);
  return message ? (
    <div role="status" className="toast">
      <Check size={19} />
      <span>{message}</span>
      <button onClick={clear} aria-label="Cerrar notificación">
        <X size={16} />
      </button>
    </div>
  ) : null;
}
