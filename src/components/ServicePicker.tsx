import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Coffee, Flower2, Car, Plus } from 'lucide-react';
import { SERVICES, money, nightsBetween } from '../domain/hotel';
import { ErrorMessage, SubmitButton } from './common';
import { errorText } from '../hooks/useHotel';
import type { HotelFacade } from '../services/hotel-facade';
import type { Reservation, ServiceType } from '../types';

export const serviceIcons = { spa: Flower2, breakfast: Coffee, transfer: Car };
export function ServicePicker({
  reservation,
  facade,
  onAdded,
  defaultType = 'spa',
}: {
  reservation: Reservation;
  facade: HotelFacade;
  onAdded: (reservation: Reservation) => void;
  defaultType?: ServiceType;
}): ReactNode {
  const [type, setType] = useState<ServiceType>(defaultType);
  const stayNights = nightsBetween(reservation.start, reservation.end);
  const [quantity, setQuantity] = useState(
    facade.mode === 'api' && defaultType === 'breakfast' ? stayNights : 1,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const max =
    type === 'breakfast' ? (facade.mode === 'api' ? stayNights : Math.min(20, stayNights)) : 20;
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      onAdded(await facade.addService(reservation.id, type, quantity));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="service-picker" onSubmit={(event) => void submit(event)}>
      <div className="service-options">
        {(Object.keys(SERVICES) as ServiceType[]).map((value) => {
          const Icon = serviceIcons[value];
          return (
            <button
              type="button"
              key={value}
              className={value === type ? 'selected' : ''}
              aria-pressed={value === type}
              onClick={() => {
                setType(value);
                setQuantity(facade.mode === 'api' && value === 'breakfast' ? stayNights : 1);
              }}
            >
              <Icon size={22} strokeWidth={1.4} />
              <span>
                {SERVICES[value].name}
                <small>
                  {money(SERVICES[value].price)} · {SERVICES[value].unit}
                </small>
              </span>
              <i>{value === type ? '✓' : <Plus size={14} />}</i>
            </button>
          );
        })}
      </div>
      <div className="quantity-row">
        <label>
          {type === 'breakfast' ? 'Días de desayuno' : 'Cantidad'}
          <input
            type="number"
            min={1}
            max={max}
            required
            readOnly={facade.mode === 'api'}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>
        <div>
          <small>Se agregará a la reserva</small>
          <strong>
            {money(SERVICES[type].price * (Number.isFinite(quantity) ? quantity : 0))}
          </strong>
        </div>
      </div>
      <p className="muted small">
        El desayuno se cobra por día de estancia, no por persona. Los demás servicios se cobran por
        unidad.
        {facade.mode === 'api' &&
          ' El servidor agrega una unidad de spa/traslado, o desayuno para todas las noches, por solicitud.'}
      </p>
      <ErrorMessage message={error} />
      <SubmitButton busy={busy}>{busy ? 'Agregando…' : 'Agregar a la estancia'}</SubmitButton>
    </form>
  );
}
