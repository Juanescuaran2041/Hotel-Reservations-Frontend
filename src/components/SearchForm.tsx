import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { CalendarDays, Search, Users } from 'lucide-react';
import { today, addDays } from '../domain/hotel';
import { errorText } from '../hooks/useHotel';
import { ErrorMessage } from './common';
import type { SearchCriteria } from '../types';

export function SearchForm({
  initial,
  loading,
  onSearch,
}: {
  initial: SearchCriteria;
  loading: boolean;
  onSearch: (criteria: SearchCriteria) => Promise<void>;
}): ReactNode {
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [guests, setGuests] = useState(initial.guests);
  const [error, setError] = useState('');
  function submit(event: FormEvent): void {
    event.preventDefault();
    setError('');
    void onSearch({ start, end, guests, type: 'all' }).catch((cause) => setError(errorText(cause)));
  }
  return (
    <>
      <form className="search-form" onSubmit={submit}>
        <label>
          <span>
            <CalendarDays size={15} />
            Llegada
          </span>
          <input
            aria-label="Fecha de llegada"
            type="date"
            required
            min={today()}
            value={start}
            onChange={(event) => {
              const value = event.target.value;
              setStart(value);
              if (value && end <= value) setEnd(addDays(value, 1));
            }}
          />
        </label>
        <label>
          <span>
            <CalendarDays size={15} />
            Salida
          </span>
          <input
            aria-label="Fecha de salida"
            type="date"
            required
            min={start ? addDays(start, 1) : today()}
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
        <label>
          <span>
            <Users size={15} />
            Huéspedes
          </span>
          <select
            aria-label="Número de huéspedes"
            value={guests}
            onChange={(event) => setGuests(Number(event.target.value))}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'huésped' : 'huéspedes'}
              </option>
            ))}
          </select>
        </label>
        <button className="button primary" type="submit" disabled={loading}>
          <Search size={18} />
          {loading ? 'Buscando…' : 'Buscar disponibilidad'}
        </button>
      </form>
      <ErrorMessage message={error} />
    </>
  );
}
