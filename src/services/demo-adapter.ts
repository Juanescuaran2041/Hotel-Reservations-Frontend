import type {
  Reservation,
  ReservationAdapter,
  ReservationRequest,
  SearchCriteria,
  ServiceType,
} from '../types/index';
import {
  ROOMS,
  today,
  addDays,
  validateDates,
  validateGuest,
  quote,
  isAvailable,
  serviceItem,
  invoiceFor,
} from '../domain/hotel.js';
import { LocalRepository } from './repository.js';

export class DemoAdapter implements ReservationAdapter {
  constructor(
    private repository = new LocalRepository(),
    seed = true,
  ) {
    if (!this.repository.read())
      this.repository.write({ reservations: seed ? this.examples() : [] });
  }
  examples(): Reservation[] {
    const start = today();
    return [
      {
        roomId: '202',
        offset: -1,
        duration: 3,
        status: 'checked_in' as const,
        name: 'Valentina Torres',
        email: 'valentina@example.com',
      },
      {
        roomId: '103',
        offset: 0,
        duration: 2,
        status: 'confirmed' as const,
        name: 'Daniel Ruiz',
        email: 'daniel@example.com',
      },
      {
        roomId: '304',
        offset: 1,
        duration: 3,
        status: 'confirmed' as const,
        name: 'Camila Rojas',
        email: 'camila@example.com',
      },
    ].map((example) => {
      const room = ROOMS.find((r) => r.id === example.roomId)!;
      const entry = addDays(start, example.offset);
      const end = addDays(entry, example.duration);
      return {
        id: crypto.randomUUID(),
        roomId: room.id,
        room,
        start: entry,
        end,
        guest: {
          name: example.name,
          email: example.email,
          phone: '+57 300 000 0000',
          document: 'DEMO12345',
          count: 1,
        },
        status: example.status,
        services: [],
        quote: quote(room, entry, end),
        key: example.status === 'checked_in' ? crypto.randomUUID() : null,
        keyActive: example.status === 'checked_in',
        createdAt: new Date().toISOString(),
        example: true,
      };
    });
  }
  list(): Reservation[] {
    return this.repository.read()!.reservations;
  }
  async reservations(): Promise<Reservation[]> {
    return this.list();
  }
  async availability({
    start,
    end,
    type = 'all',
    guests = 1,
  }: SearchCriteria): Promise<import('../types/index').Room[]> {
    validateDates(start, end);
    return ROOMS.filter(
      (room) =>
        (type === 'all' || room.type === type) &&
        room.capacity >= guests &&
        isAvailable(room.id, start, end, this.list()),
    );
  }
  async get(id: string): Promise<Reservation> {
    const item = this.list().find((r) => r.id === id);
    if (!item) throw new Error('No se encontró una reserva con ese identificador.');
    return item;
  }
  save(item: Reservation): Reservation {
    const items = this.list();
    const index = items.findIndex((r) => r.id === item.id);
    if (index < 0) items.unshift(item);
    else items[index] = item;
    this.repository.write({ reservations: items });
    return structuredClone(item);
  }
  async create({ roomId, start, end, guest }: ReservationRequest): Promise<Reservation> {
    validateDates(start, end);
    const room = ROOMS.find((r) => r.id === roomId);
    if (!room) throw new Error('La habitación no existe.');
    const cleanGuest = validateGuest(guest, room.capacity);
    if (!isAvailable(roomId, start, end, this.list()))
      throw new Error(
        'Esta habitación ya fue reservada para esas fechas. Busca disponibilidad de nuevo.',
      );
    return this.save({
      id: crypto.randomUUID(),
      roomId,
      room,
      start,
      end,
      guest: cleanGuest,
      status: 'confirmed',
      services: [],
      quote: quote(room, start, end),
      key: null,
      keyActive: false,
      createdAt: new Date().toISOString(),
    });
  }
  async addService(id: string, type: ServiceType, quantity: number): Promise<Reservation> {
    const reservation = await this.get(id);
    if (reservation.status === 'checked_out') throw new Error('La estancia ya está cerrada.');
    reservation.services.push(serviceItem(type, quantity, reservation));
    return this.save(reservation);
  }
  async checkIn(id: string): Promise<Reservation> {
    const reservation = await this.get(id);
    if (reservation.status !== 'confirmed')
      throw new Error('Solo puedes hacer check-in de una reserva confirmada.');
    if (today() < reservation.start || today() >= reservation.end)
      throw new Error(
        'El check-in solo está disponible entre el día de llegada y el día anterior a la salida.',
      );
    return this.save({
      ...reservation,
      status: 'checked_in',
      key: crypto.randomUUID(),
      keyActive: true,
      checkedInAt: new Date().toISOString(),
    });
  }
  async checkOut(id: string): Promise<Reservation> {
    const reservation = await this.get(id);
    if (reservation.status !== 'checked_in')
      throw new Error('Debes hacer check-in antes de finalizar la estancia.');
    return this.save({
      ...reservation,
      status: 'checked_out',
      keyActive: false,
      checkedOutAt: new Date().toISOString(),
      invoice: invoiceFor(reservation),
    });
  }
}
