import type {
  Reservation,
  ReservationAdapter,
  ReservationRequest,
  Room,
  RoomType,
  SearchCriteria,
  ServiceType,
  PriceBreakdown,
} from '../types';
import { ROOMS, SERVICES } from '../domain/hotel';
import type { AuthClient } from './auth-client';

export interface RateLineDTO {
  season: 'HIGH' | 'LOW';
  nights: number;
  nightlyRate: number;
  subtotal: number;
}
interface AvailableRoomDTO {
  roomNumber: string;
  roomType: 'SINGLE' | 'DOUBLE' | 'SUITE';
  totalPrice: number;
  priceBreakdown: RateLineDTO[];
}
interface ReservationDTO {
  id: string;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT';
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  roomNumber: string;
  roomType: AvailableRoomDTO['roomType'];
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  priceBreakdown: RateLineDTO[];
  roomCost: number;
  services: {
    serviceType: 'SPA' | 'BREAKFAST' | 'TRANSPORT';
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  servicesTotal: number;
  total: number;
  digitalKey?: { code: string; roomNumber: string; issuedAt: string };
  invoice?: {
    invoiceNumber: string;
    issuedAt: string;
    total: number;
    roomLines: InvoiceLineDTO[];
    serviceLines: InvoiceLineDTO[];
  };
}
interface InvoiceLineDTO {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}
const roomTypes: Record<AvailableRoomDTO['roomType'], RoomType> = {
  SINGLE: 'single',
  DOUBLE: 'double',
  SUITE: 'suite',
};
const serviceTypes: Record<ReservationDTO['services'][number]['serviceType'], ServiceType> = {
  SPA: 'spa',
  BREAKFAST: 'breakfast',
  TRANSPORT: 'transfer',
};
const statusMap = {
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
} as const;
function normalizeQuote(lines: RateLineDTO[], total: number): PriceBreakdown {
  if (
    !Array.isArray(lines) ||
    !Number.isFinite(total) ||
    lines.some(
      (l) =>
        !['HIGH', 'LOW'].includes(l.season) ||
        !Number.isFinite(l.nightlyRate) ||
        !Number.isFinite(l.subtotal) ||
        !Number.isInteger(l.nights) ||
        l.nights < 1,
    )
  )
    throw new Error('El servidor devolvió un desglose de tarifas inválido.');
  return {
    nights: lines.reduce((sum, l) => sum + l.nights, 0),
    total,
    highNights: lines.filter((l) => l.season === 'HIGH').reduce((sum, l) => sum + l.nights, 0),
    lines: lines.map((l) => ({
      date: l.season,
      label: `${l.season === 'HIGH' ? 'Alta ×1,5' : 'Baja'} · ${l.nights} noche(s)`,
      season: l.season === 'HIGH' ? 'high' : 'low',
      amount: l.subtotal,
    })),
  };
}
function normalizeRoom(number: string, wireType: AvailableRoomDTO['roomType']): Room {
  const type = roomTypes[wireType];
  const template = ROOMS.find((r) => r.type === type);
  if (!number || !template) throw new Error('El servidor devolvió una habitación inválida.');
  return { ...template, id: number };
}
export function normalizeReservation(r: ReservationDTO): Reservation {
  if (!r?.id || !statusMap[r.status] || !r.guestName || !Array.isArray(r.services))
    throw new Error('La respuesta no coincide con ReservationResponse del backend.');
  const room = normalizeRoom(r.roomNumber, r.roomType);
  return {
    id: r.id,
    roomId: room.id,
    room,
    start: r.checkInDate,
    end: r.checkOutDate,
    guest: {
      name: r.guestName,
      email: r.guestEmail,
      document: '',
      phone: r.guestPhone || '—',
      count: 1,
    },
    status: statusMap[r.status],
    key: r.digitalKey?.code || null,
    keyActive: r.status === 'CHECKED_IN' && Boolean(r.digitalKey?.code),
    quote: normalizeQuote(r.priceBreakdown, r.roomCost),
    services: r.services.map((s, i) => ({
      id: `${r.id}-${i}`,
      type: serviceTypes[s.serviceType],
      name: SERVICES[serviceTypes[s.serviceType]]?.name || s.serviceType,
      quantity: s.quantity,
      unitPrice: s.unitPrice,
      total: s.total,
    })),
    invoice: r.invoice
      ? {
          id: r.invoice.invoiceNumber,
          issuedAt: r.invoice.issuedAt,
          currency: 'USD',
          total: r.invoice.total,
          lines: [...r.invoice.roomLines, ...r.invoice.serviceLines].map((l) => ({
            name: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            total: l.amount,
          })),
        }
      : null,
  };
}

/** Matches the controllers and DTOs in the supplied Spring Boot ZIP. */
export class ApiAdapter implements ReservationAdapter {
  constructor(private client: AuthClient) {}
  private registryKey(): string {
    const id = this.client.getUser()?.id;
    if (!id) throw new Error('Inicia sesión para consultar tus reservas.');
    return `oliva-api-reservation-ids-v2:${id}`;
  }
  private ids(): string[] {
    const ids: unknown = JSON.parse(localStorage.getItem(this.registryKey()) || '[]');
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string'))
      throw new Error('El índice local de reservas no es válido.');
    return ids;
  }
  private remember(id: string): void {
    localStorage.setItem(this.registryKey(), JSON.stringify([...new Set([...this.ids(), id])]));
  }
  async reservations(): Promise<Reservation[]> {
    const results = await Promise.allSettled(this.ids().map((id) => this.get(id)));
    const successful = results
      .filter((r): r is PromiseFulfilledResult<Reservation> => r.status === 'fulfilled')
      .map((r) => r.value);
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed)
      throw new Error(
        'No se pudieron recuperar todas las reservas guardadas. El backend en memoria puede haberse reiniciado. Consulta una reserva por ID.',
        { cause: failed.reason },
      );
    return successful;
  }
  async availability({ start, end, type, guests }: SearchCriteria): Promise<Room[]> {
    const params = new URLSearchParams({ checkInDate: start, checkOutDate: end });
    if (type !== 'all') params.set('roomType', type.toUpperCase());
    const response = await this.client.request<{ rooms: AvailableRoomDTO[] }>(
      `/hotel/disponibilidad?${params}`,
    );
    if (!Array.isArray(response.rooms))
      throw new Error('La API debe devolver AvailabilityResponse.rooms.');
    return response.rooms
      .map((item) => ({
        ...normalizeRoom(item.roomNumber, item.roomType),
        preview: normalizeQuote(item.priceBreakdown, item.totalPrice),
      }))
      .filter((r) => r.capacity >= guests);
  }
  async get(id: string): Promise<Reservation> {
    const result = normalizeReservation(
      await this.client.request<ReservationDTO>(`/hotel/reserva/${encodeURIComponent(id)}`),
    );
    this.remember(result.id);
    return result;
  }
  async create({ roomId, start, end, guest }: ReservationRequest): Promise<Reservation> {
    const room = ROOMS.find((r) => r.id === roomId);
    if (!room) throw new Error('La categoría de habitación no es válida.');
    const result = normalizeReservation(
      await this.client.request<ReservationDTO>('/hotel/reservar', {
        method: 'POST',
        body: JSON.stringify({
          guestName: guest.name.trim(),
          guestEmail: guest.email.trim(),
          guestPhone: guest.phone.trim(),
          roomType: room.type.toUpperCase(),
          checkInDate: start,
          checkOutDate: end,
        }),
      }),
    );
    this.remember(result.id);
    return result;
  }
  async addService(id: string, type: ServiceType, quantity: number): Promise<Reservation> {
    if (!Number.isInteger(quantity) || quantity < 1)
      throw new Error('La cantidad de servicio no es válida.');
    const serviceType = { spa: 'SPA', breakfast: 'BREAKFAST', transfer: 'TRANSPORT' }[type];
    return normalizeReservation(
      await this.client.request<ReservationDTO>(`/hotel/servicios/${encodeURIComponent(id)}`, {
        method: 'POST',
        body: JSON.stringify({ serviceType }),
      }),
    );
  }
  async checkIn(id: string): Promise<Reservation> {
    return normalizeReservation(
      await this.client.request<ReservationDTO>(`/hotel/checkin/${encodeURIComponent(id)}`, {
        method: 'PUT',
      }),
    );
  }
  async checkOut(id: string): Promise<Reservation> {
    return normalizeReservation(
      await this.client.request<ReservationDTO>(`/hotel/checkout/${encodeURIComponent(id)}`, {
        method: 'PUT',
      }),
    );
  }
}
