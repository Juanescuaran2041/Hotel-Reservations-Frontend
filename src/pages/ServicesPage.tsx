import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { SERVICES, money } from '../domain/hotel';
import { EmptyState, Modal } from '../components/common';
import { ServicePicker, serviceIcons } from '../components/ServicePicker';
import type { HotelFacade } from '../services/hotel-facade';
import type { Reservation, ServiceType } from '../types';

export function ServicesPage({
  reservations,
  facade,
  onUpdate,
  onNew,
  notify,
}: {
  reservations: Reservation[];
  facade: HotelFacade;
  onUpdate: (r: Reservation) => void;
  onNew: () => void;
  notify: (text: string) => void;
}): ReactNode {
  const active = reservations.filter((r) => ['confirmed', 'checked_in'].includes(r.status));
  const [selectedId, setSelectedId] = useState('');
  const [type, setType] = useState<ServiceType | null>(null);
  const selected = active.find((r) => r.id === selectedId) || active[0];
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">EL PLACER ESTÁ EN LOS DETALLES</span>
        <h1>Un poco más de Oliva.</h1>
        <p>Experiencias para hacer de tu estancia algo que quieras repetir.</p>
      </div>
      <div className="service-banner">
        <Sparkles size={32} strokeWidth={1.2} />
        <div>
          <h3>Tu tiempo aquí merece disfrutarse.</h3>
          <p>
            Elige una reserva y agrega tu próxima experiencia. Los cargos aparecerán en la factura
            final.
          </p>
        </div>
      </div>
      {active.length > 0 && (
        <div className="reservation-selector">
          <label>
            Agregar servicios a
            <select value={selected?.id || ''} onChange={(e) => setSelectedId(e.target.value)}>
              {active.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.guest.name} · Habitación {r.roomId}
                </option>
              ))}
            </select>
          </label>
          <span>Solo reservas confirmadas o en estancia</span>
        </div>
      )}
      <div className="service-catalog">
        {(Object.keys(SERVICES) as ServiceType[]).map((value) => {
          const Icon = serviceIcons[value];
          const service = SERVICES[value];
          return (
            <article className={`service-card service-${value}`} key={value}>
              <div className="service-art">
                <Icon strokeWidth={0.8} />
                <span>OLIVA EXPERIENCES</span>
              </div>
              <div>
                <span className="eyebrow">
                  {value === 'spa'
                    ? 'BIENESTAR'
                    : value === 'breakfast'
                      ? 'SABORES DE CASA'
                      : 'VIAJA CON CALMA'}
                </span>
                <h2>{service.name}</h2>
                <p>{service.description}</p>
                <div className="service-card-bottom">
                  <span>
                    <strong>{money(service.price)}</strong>
                    <small>{service.unit} · USD</small>
                  </span>
                  <button
                    className="room-select"
                    disabled={!selected}
                    onClick={() => setType(value)}
                    aria-label={`Agregar ${service.name}`}
                  >
                    <ArrowUpRight size={21} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!active.length && (
        <EmptyState
          title="Primero, un lugar para quedarte"
          description="Necesitas una reserva activa para agregar servicios a tu estancia."
          action={
            <button className="button primary" onClick={onNew}>
              Encontrar habitación
            </button>
          }
        />
      )}
      {type && selected && (
        <Modal
          title={SERVICES[type].name}
          subtitle={`${selected.guest.name} · Habitación ${selected.roomId}`}
          onClose={() => setType(null)}
        >
          <ServicePicker
            key={type}
            reservation={selected}
            defaultType={type}
            facade={facade}
            onAdded={(r) => {
              onUpdate(r);
              setType(null);
              notify('Tu experiencia fue agregada a la reserva.');
            }}
          />
        </Modal>
      )}
    </>
  );
}
