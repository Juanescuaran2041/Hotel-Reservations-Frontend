import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Check, LockKeyhole, Moon, ShieldCheck } from 'lucide-react';
import { formatDate, money, quote } from '../domain/hotel';
import { ErrorMessage, Modal, SubmitButton } from './common';
import { errorText } from '../hooks/useHotel';
import type { Guest, Reservation, Room, SearchCriteria } from '../types';
import type { HotelFacade } from '../services/hotel-facade';

export function BookingModal({
  room,
  criteria,
  facade,
  onClose,
  onBooked,
}: {
  room: Room;
  criteria: SearchCriteria;
  facade: HotelFacade;
  onClose: () => void;
  onBooked: (reservation: Reservation) => void;
}): ReactNode {
  const [guest, setGuest] = useState<Guest>({
    name: '',
    email: '',
    document: '',
    phone: '',
    count: criteria.guests,
  });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const price = room.preview ?? quote(room, criteria.start, criteria.end);
  function field(key: keyof Guest, value: string | number): void {
    setGuest((previous) => ({ ...previous, [key]: value }));
  }
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const reservation = await facade.createReservation(
        { roomId: room.id, start: criteria.start, end: criteria.end, guest },
        room,
      );
      onBooked(reservation);
    } catch (cause) {
      setError(errorText(cause));
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Tu próxima estancia"
      subtitle="Solo faltan unos detalles para darte la bienvenida."
      onClose={onClose}
      wide
      busy={busy}
    >
      <form className="booking-layout" onSubmit={(event) => void submit(event)}>
        <div className="booking-fields">
          <div className="step-label">
            <span>01</span>
            <h3>Datos del huésped</h3>
          </div>
          <label>
            Nombre completo
            <input
              required
              minLength={3}
              maxLength={100}
              autoComplete="name"
              value={guest.name}
              onChange={(e) => field('name', e.target.value)}
              placeholder="Como aparece en tu documento"
            />
          </label>
          <div className="form-row">
            <label>
              Correo electrónico
              <input
                required
                type="email"
                autoComplete="email"
                maxLength={150}
                value={guest.email}
                onChange={(e) => field('email', e.target.value)}
                placeholder="nombre@correo.com"
              />
            </label>
            <label>
              Teléfono
              <input
                required
                type="tel"
                autoComplete="tel"
                minLength={7}
                maxLength={25}
                value={guest.phone}
                onChange={(e) => field('phone', e.target.value)}
                placeholder="+57 300 123 4567"
              />
            </label>
          </div>
          <div className="form-row">
            {facade.mode === 'demo' && (
              <label>
                Documento de identidad
                <input
                  required
                  minLength={4}
                  maxLength={25}
                  value={guest.document}
                  onChange={(e) => field('document', e.target.value)}
                  placeholder="Cédula o pasaporte"
                />
              </label>
            )}
            <label>
              Número de huéspedes
              <select value={guest.count} onChange={(e) => field('count', Number(e.target.value))}>
                {Array.from({ length: room.capacity }, (_, index) => (
                  <option key={index} value={index + 1}>
                    {index + 1} {index === 0 ? 'persona' : 'personas'}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="notice">
            <LockKeyhole size={19} />
            <div>
              <strong>Una llave para tu estancia</strong>
              <p>
                Se generará tu llave digital simulada al hacer check-in. Podrás probarla en el panel
                de acceso.
                {facade.mode === 'api' &&
                  ' El backend reserva por categoría y asigna el número disponible. No almacena documento ni número de huéspedes.'}
              </p>
            </div>
          </div>
          <label className="checkbox-field">
            <input
              required
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              He revisado las fechas y el total. La reserva no realiza un cobro ni procesa pagos
              reales.
            </span>
          </label>
          <ErrorMessage message={error} />
          <SubmitButton busy={busy}>{busy ? 'Confirmando…' : 'Confirmar reserva'}</SubmitButton>
          <small className="form-footnote">
            <ShieldCheck size={13} />
            {facade.mode === 'demo'
              ? 'Demostración local · usa datos de prueba'
              : 'La disponibilidad final será validada por el servidor'}
          </small>
        </div>
        <aside className="booking-summary">
          <img src={room.image} alt="Imagen de referencia de la habitación elegida" />
          <div>
            <span className="eyebrow">
              {facade.mode === 'api' ? 'HABITACIÓN DE REFERENCIA' : 'HABITACIÓN'} {room.id}
            </span>
            <h3>{room.name}</h3>
            <p>
              {formatDate(criteria.start)} <span>→</span>{' '}
              {formatDate(criteria.end, { year: 'numeric' })}
            </p>
            <span className="summary-nights">
              <Moon size={14} />
              {price.nights} noches · {guest.count} huésped(es)
            </span>
            <hr />
            <div className="summary-row">
              <span>Tarifa base por noche</span>
              <span>{money(room.basePrice)}</span>
            </div>
            {price.highNights > 0 && (
              <div className="summary-row">
                <span>Temporada alta ×1,5</span>
                <span>{price.highNights} noche(s)</span>
              </div>
            )}
            <div className="summary-row">
              <span>Alojamiento</span>
              <strong>{money(price.total)}</strong>
            </div>
            <div className="summary-total">
              <span>
                Total de la reserva <small>USD · sin cargos añadidos</small>
              </span>
              <strong>{money(price.total)}</strong>
            </div>
            <p className="summary-note">
              <Check size={14} /> Wi-Fi y atención de recepción incluidos
            </p>
          </div>
        </aside>
      </form>
    </Modal>
  );
}
