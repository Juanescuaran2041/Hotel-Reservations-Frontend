import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  DoorOpen,
  KeyRound,
  LogOut,
  Mail,
  Phone,
  Plus,
  ReceiptText,
  Search,
  UserRound,
} from 'lucide-react';
import { formatDate, money, today } from '../domain/hotel';
import { EmptyState, ErrorMessage, Modal, StatusBadge, SubmitButton } from '../components/common';
import { ServicePicker } from '../components/ServicePicker';
import { InvoiceView } from '../components/InvoiceView';
import { errorText } from '../hooks/useHotel';
import type { HotelFacade } from '../services/hotel-facade';
import type { Reservation, ReservationStatus } from '../types';

interface Props {
  reservations: Reservation[];
  selectedId: string;
  facade: HotelFacade;
  onSelect: (id: string) => void;
  onUpdate: (reservation: Reservation) => void;
  onNew: () => void;
  onAccess: (id: string) => void;
  notify: (message: string) => void;
}
export function ReservationsPage(props: Props): ReactNode {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ReservationStatus | 'all'>('all');
  const [lookup, setLookup] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [busy, setBusy] = useState(false);
  const reservation = props.reservations.find((r) => r.id === props.selectedId);
  async function find(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setLookupError('');
    try {
      const found = await props.facade.getReservation(lookup.trim());
      props.onUpdate(found);
      props.onSelect(found.id);
    } catch (cause) {
      setLookupError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }
  if (reservation)
    return <ReservationDetail key={reservation.id} reservation={reservation} {...props} />;
  const filtered = props.reservations.filter(
    (r) =>
      (status === 'all' || r.status === status) &&
      `${r.guest.name} ${r.id} ${r.roomId}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">CADA ESTANCIA, EN SU LUGAR</span>
        <h1>Reservas & huéspedes</h1>
        <p>Una bienvenida sin pendientes. Gestiona cada detalle desde aquí.</p>
      </div>
      <div className="panel">
        <div className="panel-heading">
          <h3>
            Tus reservas <span className="count-pill">{props.reservations.length}</span>
          </h3>
          <button className="button primary" onClick={props.onNew}>
            <Plus size={17} />
            Nueva reserva
          </button>
        </div>
        <div className="table-toolbar">
          <label className="search-input">
            <Search size={17} />
            <span className="sr-only">Buscar reserva</span>
            <input
              placeholder="Buscar por huésped, habitación o ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filtrar estado</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ReservationStatus | 'all')}
            >
              <option value="all">Todos los estados</option>
              <option value="confirmed">Confirmadas</option>
              <option value="checked_in">En estancia</option>
              <option value="checked_out">Finalizadas</option>
            </select>
          </label>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table className="reservation-table">
              <thead>
                <tr>
                  <th>Huésped</th>
                  <th>Habitación</th>
                  <th>Estancia</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="guest-cell">
                        <span className="avatar">
                          {r.guest.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        <div>
                          <strong>{r.guest.name}</strong>
                          <small>
                            {r.id.slice(0, 8).toUpperCase()}
                            {r.example ? ' · ejemplo' : ''}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{r.roomId}</strong>
                      <small>{r.room.name}</small>
                    </td>
                    <td>
                      {formatDate(r.start)} — {formatDate(r.end)}
                      <small>
                        {r.quote.nights} noches
                        {props.facade.mode === 'demo' ? ` · ${r.guest.count} huésped(es)` : ''}
                      </small>
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="table-total">
                      {money(r.quote.total + r.services.reduce((sum, item) => sum + item.total, 0))}
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Gestionar reserva de ${r.guest.name}`}
                        onClick={() => props.onSelect(r.id)}
                      >
                        <ArrowRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Aquí comienzan tus próximas historias"
            description="No hay reservas que coincidan con tu búsqueda. Crea una nueva reserva o cambia el filtro."
            action={
              <button className="button secondary" onClick={props.onNew}>
                Buscar una habitación
              </button>
            }
          />
        )}
      </div>
      <div className="lookup-panel">
        <div>
          <KeyRound size={20} />
          <h3>¿Ya tienes un número de reserva?</h3>
          <p>
            {props.facade.mode === 'api'
              ? 'Consulta una reserva del servidor por su ID para agregarla a este navegador.'
              : 'Introduce el ID completo que aparece en el detalle de tu reserva.'}
          </p>
        </div>
        <form onSubmit={(event) => void find(event)}>
          <input
            aria-label="Identificador de reserva"
            required
            placeholder="ID completo de la reserva"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
          />
          <button className="button secondary" disabled={busy}>
            {busy ? 'Consultando…' : 'Consultar'}
          </button>
        </form>
        <ErrorMessage message={lookupError} />
      </div>
    </>
  );
}
function ReservationDetail({
  reservation: r,
  facade,
  onSelect,
  onUpdate,
  onAccess,
  notify,
}: Props & { reservation: Reservation }): ReactNode {
  const [serviceOpen, setServiceOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const extras = r.services.reduce((sum, item) => sum + item.total, 0);
  const canCheckIn = r.status === 'confirmed' && today() >= r.start && today() < r.end;
  async function transition(type: 'in' | 'out'): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await (type === 'in' ? facade.checkIn(r.id) : facade.checkOut(r.id));
      onUpdate(updated);
      setCheckoutOpen(false);
      notify(
        type === 'in'
          ? 'Check-in realizado. Tu llave digital está lista.'
          : 'Estancia finalizada. La llave fue invalidada y la factura está lista.',
      );
      if (type === 'out') setTab('invoice');
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(r.id);
      notify('Identificador de reserva copiado.');
    } catch {
      setError('No se pudo copiar. Selecciona el identificador y cópialo manualmente.');
    }
  }
  return (
    <>
      <button className="back-link" onClick={() => onSelect('')}>
        <ArrowLeft size={16} />
        Todas las reservas
      </button>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">TU ESTANCIA EN OLIVA</span>
          <h1>Hola, {r.guest.name.split(' ')[0]}.</h1>
          <p>
            Todo listo para sentirte en casa. <StatusBadge status={r.status} />
          </p>
        </div>
        <div className="detail-actions">
          {r.status === 'confirmed' && (
            <button
              className="button primary"
              disabled={busy || !canCheckIn}
              onClick={() => void transition('in')}
            >
              <DoorOpen size={17} />
              {busy ? 'Procesando…' : 'Hacer check-in'}
            </button>
          )}
          {r.status === 'checked_in' && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => setCheckoutOpen(true)}
            >
              <LogOut size={17} />
              Hacer check-out
            </button>
          )}
        </div>
      </div>
      {r.example && (
        <div className="info-message">
          Esta es una reserva de ejemplo. Puedes utilizarla para explorar la demostración.
        </div>
      )}
      {r.status === 'confirmed' && !canCheckIn && (
        <div className="info-message">
          {today() < r.start
            ? `El check-in se habilita el ${formatDate(r.start, { year: 'numeric' })}.`
            : 'La fecha de check-in de esta reserva ya pasó.'}{' '}
          Puedes gestionar los servicios y el resumen.
        </div>
      )}
      <ErrorMessage message={error} dismiss={() => setError('')} />
      <div className="detail-tabs">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          Resumen de la estancia
        </button>
        <button
          className={tab === 'invoice' ? 'active' : ''}
          onClick={() => setTab('invoice')}
          disabled={!r.invoice}
        >
          <ReceiptText size={15} />
          Factura final
        </button>
      </div>
      {tab === 'invoice' && r.invoice ? (
        <InvoiceView reservation={r} mode={facade.mode} />
      ) : (
        <div className="detail-grid">
          <div>
            <section className="panel stay-card">
              <img src={r.room.image} alt="Imagen de referencia de la habitación reservada" />
              <div>
                <span className="eyebrow">HABITACIÓN {r.roomId}</span>
                <h2>{r.room.name}</h2>
                <p>{r.room.description}</p>
                <div className="stay-dates">
                  <div>
                    <CalendarDays size={17} />
                    <span>
                      Llegada<strong>{formatDate(r.start, { year: 'numeric' })}</strong>
                    </span>
                  </div>
                  <div>
                    <CalendarDays size={17} />
                    <span>
                      Salida<strong>{formatDate(r.end, { year: 'numeric' })}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </section>
            <section className="panel guest-panel">
              <h3>
                <UserRound size={18} />
                Datos del huésped
              </h3>
              <div className="guest-details">
                <p>
                  <strong>{r.guest.name}</strong>
                  {r.guest.document && <span>Documento: {r.guest.document}</span>}
                </p>
                <p>
                  <Mail size={15} />
                  {r.guest.email}
                </p>
                <p>
                  <Phone size={15} />
                  {r.guest.phone}
                </p>
              </div>
              <button className="copy-id" onClick={() => void copy()} title="Copiar ID completo">
                <span>Reserva: {r.id}</span>
                <Copy size={14} />
              </button>
            </section>
            <section className="panel extras-panel">
              <div className="panel-heading">
                <h3>Pequeños extras, grandes momentos</h3>
                <button
                  className="text-button"
                  disabled={r.status === 'checked_out'}
                  onClick={() => setServiceOpen(true)}
                >
                  <Plus size={15} />
                  Agregar servicio
                </button>
              </div>
              {r.services.length ? (
                <ul className="extras-list">
                  {r.services.map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.name}
                        <small>
                          {item.quantity} × {money(item.unitPrice)}
                        </small>
                      </span>
                      <strong>{money(item.total)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="extras-empty">
                  Tu estancia todavía no tiene servicios adicionales.
                  <br />
                  <span>Un desayuno, una pausa en el spa… tú eliges.</span>
                </div>
              )}
            </section>
          </div>
          <aside>
            <section className="panel cost-panel">
              <span className="eyebrow">TODO, CON CLARIDAD</span>
              <h3>Resumen de tu reserva</h3>
              <div className="summary-row">
                <span>Alojamiento · {r.quote.nights} noches</span>
                <strong>{money(r.quote.total)}</strong>
              </div>
              <div className="summary-row">
                <span>Servicios adicionales</span>
                <strong>{money(extras)}</strong>
              </div>
              <div className="summary-total">
                <span>
                  Total de la estancia
                  <small>
                    USD ·{' '}
                    {r.status === 'checked_out' ? 'estancia cerrada' : 'por facturar al salir'}
                  </small>
                </span>
                <strong>{money(r.quote.total + extras)}</strong>
              </div>
              <details className="nightly-details">
                <summary>Ver tarifas por noche</summary>
                {r.quote.lines.map((line) => (
                  <div key={line.date}>
                    <span>
                      {line.label ??
                        `${formatDate(line.date)} · ${line.season === 'high' ? 'alta ×1,5' : 'baja'}`}
                    </span>
                    <span>{money(line.amount)}</span>
                  </div>
                ))}
              </details>
            </section>
            <section className="key-prompt">
              <KeyRound size={27} strokeWidth={1.2} />
              <h3>Tu llave, siempre contigo</h3>
              <p>
                {r.status === 'checked_in'
                  ? 'Tu llave digital está disponible. Prueba el acceso a tu habitación.'
                  : r.status === 'checked_out'
                    ? 'Estancia cerrada. Tu llave digital ya no permite el acceso.'
                    : 'Después del check-in encontrarás aquí el acceso a tu habitación.'}
              </p>
              <button className="button secondary" onClick={() => onAccess(r.id)}>
                Ver acceso digital
                <ArrowRight size={16} />
              </button>
            </section>
          </aside>
        </div>
      )}
      {serviceOpen && (
        <Modal
          title="Haz tu estancia más tuya"
          subtitle="Agrega un detalle especial a tu reserva."
          onClose={() => setServiceOpen(false)}
        >
          <ServicePicker
            reservation={r}
            facade={facade}
            onAdded={(updated) => {
              onUpdate(updated);
              setServiceOpen(false);
              notify('Servicio agregado a tu reserva.');
            }}
          />
        </Modal>
      )}
      {checkoutOpen && (
        <Modal
          title="¿Todo listo para despedirnos?"
          subtitle="Al confirmar, se cerrará la estancia y se generará la factura final."
          onClose={() => setCheckoutOpen(false)}
          busy={busy}
        >
          <div className="checkout-summary">
            <Check size={30} />
            <h3>
              {money(r.quote.total + extras)} <small>USD</small>
            </h3>
            <p>
              Incluye todas las noches reservadas y los servicios agregados. La habitación quedará
              libre y tu llave digital será invalidada.
            </p>
            <p className="muted small">Este proceso no cobra dinero ni confirma un pago real.</p>
            <ErrorMessage message={error} />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void transition('out');
              }}
            >
              <SubmitButton busy={busy}>
                {busy ? 'Finalizando…' : 'Confirmar check-out'}
              </SubmitButton>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}
