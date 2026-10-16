import type {
  Room,
  Guest,
  Reservation,
  PriceBreakdown,
  ServiceType,
  ServiceItem,
  Invoice,
} from '../types/index';
// React-independent domain rules, testable without a browser or server.
export const MONEY = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});
export const money = (value: number): string => MONEY.format(value);
export const TYPES = { single: 'Sencilla', double: 'Doble', suite: 'Suite' };
export const SERVICES = {
  spa: {
    name: 'Ritual de spa',
    price: 50,
    unit: 'por sesión',
    description: 'Una pausa para renovar cuerpo y mente.',
  },
  breakfast: {
    name: 'Desayuno de la casa',
    price: 15,
    unit: 'por día',
    description: 'Sabores frescos para comenzar tu mañana.',
  },
  transfer: {
    name: 'Traslado privado',
    price: 30,
    unit: 'por trayecto',
    description: 'Del aeropuerto al hotel, sin preocupaciones.',
  },
};
export function today(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string): string => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function addDays(value: string, amount: number): string {
  if (!validDate(value)) throw new Error('La fecha no es válida.');
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function nightsBetween(start: string, end: string): number {
  if (!validDate(start) || !validDate(end) || end <= start)
    throw new Error('La salida debe ser posterior a la llegada.');
  return Math.round(
    (new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86400000,
  );
}
export function validateDates(start: string, end: string, now = today()): number {
  const nights = nightsBetween(start, end);
  if (start < now) throw new Error('La llegada no puede ser anterior a hoy.');
  if (nights > 30) throw new Error('Puedes reservar hasta 30 noches por estancia.');
  return nights;
}
export function formatDate(value: string, options: Intl.DateTimeFormatOptions = {}): string {
  return validDate(value)
    ? new Intl.DateTimeFormat('es-CO', {
        day: 'numeric',
        month: 'short',
        ...options,
        timeZone: 'UTC',
      }).format(new Date(`${value}T12:00:00Z`))
    : '—';
}
export function highSeason(date: string): boolean {
  return [1, 6, 7, 12].includes(Number(date.slice(5, 7)));
}

// Strategy: choose the rate calculation for each individual night.
const rateStrategies = {
  high: (base: number): number => Math.round(base * 1.5 * 100) / 100,
  low: (base: number): number => base,
};
export function quote(room: Room, start: string, end: string): PriceBreakdown {
  const nights = nightsBetween(start, end);
  if (nights > 30) throw new Error('Puedes reservar hasta 30 noches por estancia.');
  const lines = Array.from({ length: nights }, (_, i) => {
    const date = addDays(start, i);
    const season: 'high' | 'low' = highSeason(date) ? 'high' : 'low';
    return { date, season, amount: rateStrategies[season](room.basePrice) };
  });
  return {
    nights,
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
    highNights: lines.filter((l) => l.season === 'high').length,
  };
}
export function overlaps(
  a: { start: string; end: string },
  b: { start: string; end: string },
): boolean {
  return a.start < b.end && b.start < a.end;
}
export function isAvailable(
  roomId: string,
  start: string,
  end: string,
  reservations: Reservation[],
): boolean {
  return !reservations.some(
    (r) =>
      r.roomId === roomId &&
      ['confirmed', 'checked_in'].includes(r.status) &&
      overlaps({ start, end }, r),
  );
}
export function validateGuest(guest: Guest, capacity: number, requireDocument = true): Guest {
  const name = String(guest.name || '').trim();
  const email = String(guest.email || '').trim();
  const document = String(guest.document || '').trim();
  const phone = String(guest.phone || '').trim();
  const count = Number(guest.count);
  if (name.length < 3 || name.length > 100)
    throw new Error('Escribe el nombre completo del huésped (3 a 100 caracteres).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 150)
    throw new Error('Escribe un correo electrónico válido.');
  if (requireDocument && !/^[\p{L}\p{N}\- ]{4,25}$/u.test(document))
    throw new Error('El documento debe tener entre 4 y 25 caracteres.');
  if (!/^[+\d()\s-]{7,25}$/.test(phone)) throw new Error('Escribe un teléfono válido.');
  if (!Number.isInteger(count) || count < 1 || count > capacity)
    throw new Error(`Esta habitación admite hasta ${capacity} huésped(es).`);
  return { name, email, document, phone, count };
}
export const ROOMS: Room[] = Array.from({ length: 18 }, (_, i) => {
  const type = i < 6 ? 'single' : i < 14 ? 'double' : 'suite';
  const index = i < 6 ? i : i < 14 ? i - 6 : i - 14;
  return {
    id: `${type === 'single' ? 1 : type === 'double' ? 2 : 3}0${index + 1}`,
    type,
    name:
      type === 'suite' ? 'Suite Oliva' : type === 'double' ? 'Doble Jardín' : 'Sencilla Esencial',
    basePrice: type === 'suite' ? 250 : type === 'double' ? 120 : 80,
    capacity: type === 'suite' ? 4 : type === 'double' ? 2 : 1,
    size: type === 'suite' ? 58 : type === 'double' ? 34 : 24,
    bed:
      type === 'suite' ? 'King + sofá cama' : type === 'double' ? 'Cama queen' : 'Cama individual',
    view: index % 2 ? 'Vista al patio' : 'Vista al jardín',
    image: `/rooms/${type}.jpg`,
    description:
      type === 'suite'
        ? 'Amplitud, luz y pequeños detalles. Un refugio con sala privada para disfrutar a tu ritmo.'
        : type === 'double'
          ? 'Texturas naturales y una vista que invita a desconectar. El lugar perfecto para compartir.'
          : 'Todo lo que necesitas para descansar bien. Un espacio sereno, cálido y lleno de luz.',
  };
});

export function serviceItem(
  type: ServiceType,
  quantity: number,
  reservation: Reservation,
): ServiceItem {
  if (!SERVICES[type]) throw new Error('Servicio desconocido.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20)
    throw new Error('La cantidad debe estar entre 1 y 20.');
  if (type === 'breakfast' && quantity > nightsBetween(reservation.start, reservation.end))
    throw new Error('Los días de desayuno no pueden superar las noches de estancia.');
  return {
    id: crypto.randomUUID(),
    type,
    name: SERVICES[type].name,
    quantity,
    unitPrice: SERVICES[type].price,
    total: SERVICES[type].price * quantity,
  };
}
export function invoiceFor(reservation: Reservation): Invoice {
  return {
    id: `FAC-${reservation.id.slice(0, 8).toUpperCase()}`,
    issuedAt: new Date().toISOString(),
    currency: 'USD',
    lines: [
      {
        name: `Alojamiento · Hab. ${reservation.roomId} · ${reservation.quote.nights} noche(s)`,
        quantity: 1,
        unitPrice: reservation.quote.total,
        total: reservation.quote.total,
      },
      ...reservation.services.map((s) => ({
        name: s.name,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        total: s.total,
      })),
    ],
    total: reservation.quote.total + reservation.services.reduce((sum, s) => sum + s.total, 0),
  };
}
