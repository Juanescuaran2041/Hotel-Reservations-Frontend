import type { ReactNode } from 'react';
import { ArrowUpRight, BedDouble, Maximize, Users, Wifi } from 'lucide-react';
import { money, quote, TYPES } from '../domain/hotel';
import type { Room, SearchCriteria } from '../types';

export function RoomCard({
  room,
  criteria,
  onSelect,
}: {
  room: Room;
  criteria: SearchCriteria;
  onSelect: (room: Room) => void;
}): ReactNode {
  const price = room.preview ?? quote(room, criteria.start, criteria.end);
  return (
    <article className="room-card">
      <div className="room-image">
        <img
          src={room.image}
          alt={`Imagen de referencia de la habitación ${TYPES[room.type]}`}
          loading="lazy"
        />
        <span className="image-badge">{TYPES[room.type]}</span>
        <span className="room-number">N.º {room.id}</span>
        {room.type === 'suite' && <span className="suite-tag">OLIVA COLLECTION</span>}
      </div>
      <div className="room-body">
        <div className="room-title">
          <h3>{room.name}</h3>
          <Wifi size={17} aria-label="Wi-Fi incluido" />
        </div>
        <p>{room.view} · Un espacio para desconectar</p>
        <div className="room-features">
          <span>
            <Users size={14} />
            {room.capacity} {room.capacity === 1 ? 'persona' : 'personas'}
          </span>
          <span>
            <Maximize size={13} />
            {room.size} m²
          </span>
          <span>
            <BedDouble size={15} />
            {room.bed}
          </span>
        </div>
        <div className="room-price">
          <div>
            <strong>{money(price.total / price.nights)}</strong>
            <span> / noche · USD</span>
            <small>
              {money(price.total)} por {price.nights} noches
              {price.highNights > 0 ? ' · tarifa de temporada' : ''}
            </small>
          </div>
          <button
            className="room-select"
            onClick={() => onSelect(room)}
            aria-label={`Reservar habitación ${room.id}`}
          >
            <ArrowUpRight size={22} />
          </button>
        </div>
      </div>
    </article>
  );
}
