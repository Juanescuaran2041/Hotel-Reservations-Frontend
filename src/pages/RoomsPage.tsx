import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarCheck,
  Check,
  LayoutGrid,
  Leaf,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { formatDate, ROOMS } from '../domain/hotel';
import { RoomCard } from '../components/RoomCard';
import { SearchForm } from '../components/SearchForm';
import { EmptyState, Loading } from '../components/common';
import type { Reservation, Room, RoomType, SearchCriteria } from '../types';

export function RoomsPage({
  rooms,
  reservations,
  criteria,
  loading,
  onSearch,
  onSelect,
  mode,
}: {
  rooms: Room[];
  reservations: Reservation[];
  criteria: SearchCriteria;
  loading: boolean;
  onSearch: (criteria: SearchCriteria) => Promise<void>;
  onSelect: (room: Room) => void;
  mode: 'demo' | 'api';
}): ReactNode {
  const [type, setType] = useState<RoomType | 'all'>('all');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState('recommended');
  const filtered = rooms
    .filter((room) => type === 'all' || room.type === type)
    .sort((a, b) =>
      sort === 'price'
        ? a.basePrice - b.basePrice
        : sort === 'capacity'
          ? b.capacity - a.capacity
          : a.id.localeCompare(b.id),
    );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 6));
  const safePage = Math.min(page, pageCount - 1);
  const active = reservations.filter((r) => r.status === 'checked_in').length;
  return (
    <>
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">
            <span className="tiny-line" />
            EL ARTE DE SENTIRSE EN CASA
          </span>
          <h1>
            Las buenas estancias
            <br />
            comienzan <em>aquí.</em>
          </h1>
          <p>Encuentra el espacio perfecto. Nosotros cuidamos los detalles.</p>
        </div>
        <div className="banner-illustration" aria-hidden="true">
          <div className="arch-window">
            <Leaf className="large-leaf" strokeWidth={0.65} />
            <span>
              una pausa
              <br />
              <em>bien merecida.</em>
            </span>
          </div>
          <span className="banner-coordinates">04°42′ N &nbsp; 74°04′ O</span>
        </div>
      </section>
      <div className="search-panel">
        <SearchForm
          initial={criteria}
          loading={loading}
          onSearch={async (next) => {
            setType('all');
            setPage(0);
            await onSearch(next);
          }}
        />
        <div className="search-caption">
          <span>
            <Check size={13} />
            Disponibilidad para tus fechas
          </span>
          <span>Tarifas en USD · Sin cargos ocultos</span>
        </div>
      </div>
      <section className="stats-grid" aria-label="Resumen del hotel">
        <div className="stat">
          <span className="stat-icon neutral">
            <BedDouble />
          </span>
          <div>
            <span>{mode === 'demo' ? 'Habitaciones del hotel' : 'Habitaciones encontradas'}</span>
            <strong>
              {mode === 'demo' ? ROOMS.length : rooms.length}
              <small>espacios únicos</small>
            </strong>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon green">
            <LayoutGrid />
          </span>
          <div>
            <span>Disponibles en tus fechas</span>
            <strong>
              {rooms.length.toString().padStart(2, '0')}
              <small className="green-text">listas para reservar</small>
            </strong>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon gold">
            <CalendarCheck />
          </span>
          <div>
            <span>Reservas confirmadas</span>
            <strong>
              {reservations
                .filter((r) => r.status === 'confirmed')
                .length.toString()
                .padStart(2, '0')}
              <small>por recibir</small>
            </strong>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon peach">
            <Sparkles />
          </span>
          <div>
            <span>Huéspedes en estancia</span>
            <strong>
              {active.toString().padStart(2, '0')}
              <small>reservas con check-in</small>
            </strong>
          </div>
        </div>
      </section>
      <section className="room-results">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ESPACIOS CON PERSONALIDAD</span>
            <h2>Encuentra tu habitación</h2>
          </div>
          <label className="sort-control">
            <SlidersHorizontal size={15} />
            <span className="sr-only">Ordenar habitaciones</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(0);
              }}
            >
              <option value="recommended">Recomendadas</option>
              <option value="price">Menor precio</option>
              <option value="capacity">Mayor capacidad</option>
            </select>
          </label>
        </div>
        <div className="results-toolbar">
          <div className="type-tabs" role="group" aria-label="Tipo de habitación">
            {(['all', 'single', 'double', 'suite'] as const).map((value) => (
              <button
                key={value}
                className={type === value ? 'active' : ''}
                aria-pressed={type === value}
                onClick={() => {
                  setType(value);
                  setPage(0);
                }}
              >
                {{ all: 'Todas', single: 'Sencillas', double: 'Dobles', suite: 'Suites' }[value]}
                <span>{rooms.filter((room) => value === 'all' || room.type === value).length}</span>
              </button>
            ))}
          </div>
          <p>
            {formatDate(criteria.start)} — {formatDate(criteria.end)}
            <span> · {filtered.length} disponibles</span>
          </p>
        </div>
        {loading ? (
          <Loading label="Buscando tu próxima estancia…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Una nueva búsqueda, nuevas posibilidades"
            description="No hay habitaciones disponibles con estos filtros. Prueba otras fechas, menos huéspedes o un tipo diferente."
            action={
              <button className="button secondary" onClick={() => setType('all')}>
                Ver todos los tipos
              </button>
            }
          />
        ) : (
          <div className="rooms-grid">
            {filtered.slice(safePage * 6, safePage * 6 + 6).map((room) => (
              <RoomCard key={room.id} room={room} criteria={criteria} onSelect={onSelect} />
            ))}
          </div>
        )}
        {filtered.length > 6 && !loading && (
          <div className="pagination">
            <span>
              Mostrando {safePage * 6 + 1}–{Math.min((safePage + 1) * 6, filtered.length)} de{' '}
              {filtered.length} habitaciones
            </span>
            <div>
              <button
                className="icon-button"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                aria-label="Página anterior"
              >
                <ArrowLeft size={17} />
              </button>
              <span>
                {safePage + 1} / {pageCount}
              </span>
              <button
                className="icon-button"
                disabled={safePage + 1 === pageCount}
                onClick={() => setPage(safePage + 1)}
                aria-label="Página siguiente"
              >
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
        <div className="hospitality-note">
          <Leaf size={20} strokeWidth={1.4} />
          <p>Menos preocupaciones. Más momentos que recordar.</p>
          <span>BIENVENIDO A OLIVA</span>
        </div>
      </section>
    </>
  );
}
