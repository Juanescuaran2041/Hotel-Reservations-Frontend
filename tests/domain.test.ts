import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  highSeason,
  isAvailable,
  nightsBetween,
  quote,
  ROOMS,
  serviceItem,
  today,
  validateDates,
  validDate,
  validateGuest,
} from '../src/domain/hotel.ts';
import { DemoAdapter } from '../src/services/demo-adapter.ts';
import { LocalRepository } from '../src/services/repository.ts';
import { HotelFacade } from '../src/services/hotel-facade.ts';
import type { Guest } from '../src/types/index.ts';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}
const guest: Guest = {
  name: 'Test Guest',
  email: 'guest@example.com',
  phone: '+57 300 123 4567',
  document: 'TEST1234',
  count: 1,
};
function setup(): { adapter: DemoAdapter; facade: HotelFacade; storage: MemoryStorage } {
  const storage = new MemoryStorage();
  const adapter = new DemoAdapter(new LocalRepository(storage), false);
  return { adapter, facade: new HotelFacade(adapter), storage };
}

test('the catalog has 18 unique rooms across three types', () => {
  assert.equal(ROOMS.length, 18);
  assert.equal(new Set(ROOMS.map((r) => r.id)).size, 18);
  for (const [type, count] of [
    ['single', 6],
    ['double', 8],
    ['suite', 4],
  ] as const)
    assert.equal(ROOMS.filter((r) => r.type === type).length, count);
});
test('date calculations handle leap years and reject nonexistent dates', () => {
  assert.equal(validDate('2028-02-29'), true);
  assert.equal(validDate('2027-02-29'), false);
  assert.equal(validDate('2026-13-01'), false);
  assert.equal(validDate(''), false);
  assert.equal(addDays('2028-02-28', 2), '2028-03-01');
  assert.equal(nightsBetween('2028-02-28', '2028-03-01'), 2);
  assert.throws(() => nightsBetween('2028-01-01', '2028-01-01'));
});
test('past, reversed and overly long stays are rejected', () => {
  assert.throws(() => validateDates('2026-01-01', '2026-01-02', '2026-02-01'));
  assert.throws(() => validateDates('2028-02-01', '2028-01-01', '2026-01-01'));
  assert.throws(() => validateDates('2028-01-01', '2028-05-01', '2026-01-01'));
});
test('mixed-season stays use the rate for each night, excluding checkout', () => {
  const result = quote(ROOMS[0], '2028-05-31', '2028-06-02');
  assert.equal(result.total, 80 + 120);
  assert.equal(result.highNights, 1);
  assert.equal(result.nights, 2);
  assert.equal(highSeason('2028-12-01'), true);
  assert.equal(highSeason('2028-10-01'), false);
});
test('guest validation trims values and enforces capacity and contact fields', () => {
  assert.equal(validateGuest({ ...guest, name: '  Test Guest  ' }, 1).name, 'Test Guest');
  assert.throws(() => validateGuest({ ...guest, count: 2 }, 1));
  assert.throws(() => validateGuest({ ...guest, email: 'invalid' }, 1));
  assert.throws(() => validateGuest({ ...guest, document: '' }, 1));
});
test('overlaps are blocked but adjacent reservations are allowed', async () => {
  const { adapter } = setup();
  const start = today();
  const end = addDays(start, 3);
  await adapter.create({ roomId: '101', start, end, guest });
  await assert.rejects(adapter.create({ roomId: '101', start: addDays(start, 1), end, guest }));
  const adjacent = await adapter.create({ roomId: '101', start: end, end: addDays(end, 2), guest });
  assert.equal(adjacent.roomId, '101');
});
test('availability respects room type, capacity and existing reservations', async () => {
  const { adapter } = setup();
  const start = today();
  const end = addDays(start, 2);
  await adapter.create({ roomId: '301', start, end, guest });
  const rooms = await adapter.availability({ start, end, type: 'all', guests: 4 });
  assert.equal(rooms.length, 3);
  assert.ok(rooms.every((r) => r.type === 'suite' && r.id !== '301'));
});
test('the full stay activates a key, charges exact extras, closes and releases the room', async () => {
  const { facade, adapter } = setup();
  const start = today();
  const end = addDays(start, 2);
  let reservation = await facade.createReservation({ roomId: '101', start, end, guest }, ROOMS[0]);
  assert.equal(reservation.key, null);
  await assert.rejects(facade.checkOut(reservation.id));
  reservation = await facade.checkIn(reservation.id);
  assert.match(reservation.key!, /^[0-9a-f-]{36}$/);
  assert.equal(reservation.keyActive, true);
  assert.equal(
    (await facade.simulateAccess(reservation.id, reservation.key!, '101')).granted,
    true,
  );
  await assert.rejects(facade.simulateAccess(reservation.id, 'wrong-key', '101'));
  await assert.rejects(facade.simulateAccess(reservation.id, reservation.key!, '102'));
  await assert.rejects(facade.checkIn(reservation.id));
  await facade.addService(reservation.id, 'spa', 1);
  await facade.addService(reservation.id, 'breakfast', 2);
  reservation = await facade.addService(reservation.id, 'transfer', 1);
  const oldKey = reservation.key!;
  reservation = await facade.checkOut(reservation.id);
  assert.equal(reservation.invoice!.total, reservation.quote.total + 110);
  assert.equal(reservation.invoice!.lines.length, 4);
  assert.equal(reservation.keyActive, false);
  await assert.rejects(facade.simulateAccess(reservation.id, oldKey, '101'));
  await assert.rejects(facade.addService(reservation.id, 'spa', 1));
  await assert.rejects(facade.checkOut(reservation.id));
  assert.equal(isAvailable('101', start, end, await adapter.reservations()), true);
});
test('check-in is rejected before arrival', async () => {
  const { adapter } = setup();
  const start = addDays(today(), 1);
  const reservation = await adapter.create({ roomId: '101', start, end: addDays(start, 2), guest });
  await assert.rejects(adapter.checkIn(reservation.id));
});
test('service quantities are bounded and breakfast cannot exceed the stay', async () => {
  const { adapter } = setup();
  const start = today();
  const reservation = await adapter.create({ roomId: '101', start, end: addDays(start, 2), guest });
  assert.throws(() => serviceItem('breakfast', 3, reservation));
  assert.throws(() => serviceItem('spa', 0, reservation));
  assert.throws(() => serviceItem('spa', 1.5, reservation));
});
test('a new adapter restores persisted reservations and does not reseed', async () => {
  const { adapter, storage } = setup();
  const start = today();
  const reservation = await adapter.create({ roomId: '101', start, end: addDays(start, 2), guest });
  const restored = new DemoAdapter(new LocalRepository(storage));
  assert.equal((await restored.reservations()).length, 1);
  assert.equal((await restored.get(reservation.id)).guest.name, guest.name);
  const copy = await restored.get(reservation.id);
  copy.guest.name = 'Changed';
  assert.equal((await restored.get(reservation.id)).guest.name, guest.name);
});
test('storage corruption and write failures are visible errors', () => {
  const storage = new MemoryStorage();
  storage.setItem('oliva-hotel-v1', '{broken');
  assert.throws(() => new LocalRepository(storage).read());
  storage.setItem = (): never => {
    throw new Error('Quota');
  };
  assert.throws(() => new LocalRepository(storage).write({ reservations: [] }));
});
