import { useCallback, useEffect, useRef, useState } from 'react';
import { HotelFacade } from '../services/hotel-facade';
import { today, addDays } from '../domain/hotel';
import type { Reservation, Room, SearchCriteria } from '../types';

export const initialCriteria: SearchCriteria = {
  start: today(),
  end: addDays(today(), 2),
  type: 'all',
  guests: 1,
};
export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

/** Coordinates asynchronous facade calls and suppresses outdated search responses. */
export function useHotel() {
  const [facade] = useState(() => HotelFacade.getInstance());
  const [user, setUser] = useState(() => facade.getCurrentUser());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [criteria, setCriteria] = useState(initialCriteria);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const search = useCallback(
    async (next: SearchCriteria): Promise<void> => {
      const id = ++requestId.current;
      setLoading(true);
      setError('');
      try {
        const available = await facade.searchRooms(next);
        if (id === requestId.current) {
          setRooms(available);
          setCriteria(next);
        }
      } catch (cause) {
        if (id === requestId.current) setError(errorText(cause));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [facade],
  );
  const reloadReservations = useCallback(async (): Promise<void> => {
    try {
      setReservations(await facade.listReservations());
    } catch (cause) {
      setError(errorText(cause));
    }
  }, [facade]);
  useEffect(() => {
    const syncUser = (): void => {
      setUser(facade.getCurrentUser());
    };
    window.addEventListener('oliva-auth-changed', syncUser);
    return () => window.removeEventListener('oliva-auth-changed', syncUser);
  }, [facade]);
  useEffect(() => {
    if (facade.mode === 'api' && !user) {
      setReservations([]);
      setRooms([]);
      setLoading(false);
      return;
    }
    void search(initialCriteria);
    void reloadReservations();
    const sync = (): void => {
      void reloadReservations();
      void search(initialCriteria);
    };
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('storage', sync);
    };
  }, [search, reloadReservations, facade, user]);
  const remember = useCallback((item: Reservation): void => {
    setReservations((previous) => [item, ...previous.filter((r) => r.id !== item.id)]);
  }, []);
  return {
    facade,
    user,
    reservations,
    rooms,
    criteria,
    loading,
    error,
    setError,
    search,
    remember,
    reloadReservations,
  };
}
