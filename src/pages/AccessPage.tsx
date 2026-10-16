import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  DoorClosed,
  DoorOpen,
  KeyRound,
  LockKeyhole,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { formatDate, today } from '../domain/hotel';
import { EmptyState, ErrorMessage } from '../components/common';
import { errorText } from '../hooks/useHotel';
import type { HotelFacade } from '../services/hotel-facade';
import type { Reservation } from '../types';

export function AccessPage({
  reservations,
  selectedId,
  onSelect,
  facade,
  onManage,
  notify,
}: {
  reservations: Reservation[];
  selectedId: string;
  onSelect: (id: string) => void;
  facade: HotelFacade;
  onManage: (id: string) => void;
  notify: (message: string) => void;
}): ReactNode {
  const selected = reservations.find((r) => r.id === selectedId) || reservations[0];
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">MENOS LLAVES. MÁS LIBERTAD.</span>
        <h1>Abre la puerta a tu descanso.</h1>
        <p>Tu llave digital, en un solo lugar. Disponible durante tu estancia.</p>
      </div>
      {!selected ? (
        <EmptyState
          title="Tu llave te espera después del check-in"
          description="Crea una reserva y realiza el check-in para generar una llave digital simulada."
        />
      ) : (
        <>
          <div className="reservation-selector">
            <label>
              Consultar acceso de
              <select value={selected.id} onChange={(event) => onSelect(event.target.value)}>
                {reservations.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.guest.name} · Habitación {r.roomId}
                  </option>
                ))}
              </select>
            </label>
            <span>
              <ShieldCheck size={15} />
              Simulación de una cerradura digital
            </span>
          </div>
          <AccessPanel
            key={selected.id + selected.status}
            reservation={selected}
            facade={facade}
            onManage={onManage}
            notify={notify}
          />
        </>
      )}
      <div className="access-explainer">
        <div>
          <span>01</span>
          <h3>Confirma tu llegada</h3>
          <p>El check-in genera una llave UUID única para tu reserva.</p>
        </div>
        <div>
          <span>02</span>
          <h3>Disfruta tu espacio</h3>
          <p>La llave funciona durante las fechas de tu estancia y solo en tu habitación.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Una salida sin pendientes</h3>
          <p>Al hacer check-out se invalida el acceso, aunque conserves el código.</p>
        </div>
      </div>
    </>
  );
}
function AccessPanel({
  reservation: r,
  facade,
  onManage,
  notify,
}: {
  reservation: Reservation;
  facade: HotelFacade;
  onManage: (id: string) => void;
  notify: (message: string) => void;
}): ReactNode {
  const [code, setCode] = useState('');
  const [roomId, setRoomId] = useState(r.roomId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const active = r.status === 'checked_in' && r.keyActive && today() >= r.start && today() < r.end;
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(r.key || '');
      notify('Llave digital copiada.');
    } catch {
      setError('No se pudo copiar. Puedes seleccionar el código manualmente.');
    }
  }
  async function unlock(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setUnlocked(false);
    try {
      await facade.simulateAccess(r.id, code, roomId);
      setUnlocked(true);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="access-grid">
      <section className={`digital-key ${active ? '' : 'inactive'}`}>
        <div className="key-card-top">
          <span>oliva.</span>
          <span>
            <Radio size={17} /> DIGITAL KEY
          </span>
        </div>
        <div className="key-room">
          <span>TU ESPACIO</span>
          <strong>{r.roomId}</strong>
          <p>{r.room.name}</p>
        </div>
        <div className="key-card-bottom">
          <div>
            <span>HUÉSPED</span>
            <strong>{r.guest.name}</strong>
            <small>
              {formatDate(r.start)} — {formatDate(r.end, { year: 'numeric' })}
            </small>
          </div>
          <KeyRound size={43} strokeWidth={0.9} />
        </div>
        <span className={`key-status ${active ? 'active' : ''}`}>
          <i />
          {active
            ? 'Llave activa'
            : r.status === 'confirmed'
              ? 'Pendiente de check-in'
              : 'Llave inactiva'}
        </span>
      </section>
      <section className="panel lock-panel">
        <span className="eyebrow">PRUEBA TU LLAVE</span>
        <h2>Bienvenido a tu habitación.</h2>
        <p>Introduce la llave y el número de habitación para simular la apertura.</p>
        {r.key ? (
          <div className="key-code">
            <span>UUID de tu llave digital</span>
            <code>{r.key}</code>
            <div>
              <button className="text-button" onClick={() => void copy()}>
                <Copy size={14} />
                Copiar
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setCode(r.key || '');
                  setUnlocked(false);
                  setError('');
                }}
              >
                Usar esta llave
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="notice">
            <LockKeyhole size={22} />
            <p>
              Tu código se generará al hacer check-in.
              <br />
              <button className="text-button" onClick={() => onManage(r.id)}>
                Gestionar reserva
                <ArrowRight size={14} />
              </button>
            </p>
          </div>
        )}
        <form onSubmit={(event) => void unlock(event)}>
          <div className="form-row">
            <label>
              Habitación
              <input
                required
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value);
                  setUnlocked(false);
                }}
                maxLength={20}
              />
            </label>
            <label>
              Llave digital (UUID)
              <input
                required
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setUnlocked(false);
                }}
                placeholder="Pega el código de tu llave"
                maxLength={100}
              />
            </label>
          </div>
          <button className="button primary" disabled={busy}>
            {unlocked ? <DoorOpen size={17} /> : <DoorClosed size={17} />}
            {busy ? 'Validando llave…' : 'Simular apertura'}
          </button>
        </form>
        <ErrorMessage message={error} />
        {unlocked && (
          <div className="unlock-success" role="status">
            <Check size={20} />
            <span>Acceso permitido. Puerta {r.roomId} abierta en la simulación.</span>
          </div>
        )}
        <p className="muted small access-note">
          Esta es una simulación en el navegador. No controla cerraduras físicas ni proporciona
          seguridad real.
        </p>
      </section>
    </div>
  );
}
