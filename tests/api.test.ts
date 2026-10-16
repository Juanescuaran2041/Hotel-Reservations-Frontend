import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiAdapter } from '../src/services/api-adapter.ts';
import { AuthClient } from '../src/services/auth-client.ts';

const user = { id: 'test-user', fullName: 'Test User', email: 'test@example.com', role: 'GUEST' };
const tokens = {
  accessToken: 'test-access',
  refreshToken: 'test-refresh',
  tokenType: 'Bearer',
  expiresIn: 900,
};
const rate = { season: 'LOW' as const, nights: 2, nightlyRate: 120, subtotal: 240 };
const reservation = {
  id: 'test-reservation',
  status: 'CONFIRMED' as const,
  guestName: 'Test Guest',
  guestEmail: 'guest@example.com',
  guestPhone: '+57 300 123 4567',
  roomNumber: '201',
  roomType: 'DOUBLE' as const,
  checkInDate: '2028-02-01',
  checkOutDate: '2028-02-03',
  nights: 2,
  priceBreakdown: [rate],
  roomCost: 240,
  services: [],
  servicesTotal: 0,
  total: 240,
};
const data = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string): string | null => data.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      data.set(key, value);
    },
  },
});
function loginResponse(url: string): Response | null {
  if (url.endsWith('/auth/login') || url.endsWith('/auth/refresh')) return Response.json(tokens);
  if (url.endsWith('/auth/me')) return Response.json(user);
  return null;
}

test('API uses real Spring Boot auth, availability, reservation and service DTOs', async () => {
  const original = globalThis.fetch;
  const calls: { url: string; options?: RequestInit }[] = [];
  globalThis.fetch = (input, options): Promise<Response> => {
    const url = String(input);
    calls.push({ url, options });
    const auth = loginResponse(url);
    if (auth) return Promise.resolve(auth);
    assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer test-access');
    if (url.includes('/disponibilidad?'))
      return Promise.resolve(
        Response.json({
          checkInDate: '2028-02-01',
          checkOutDate: '2028-02-03',
          nights: 2,
          rooms: [
            { roomNumber: '201', roomType: 'DOUBLE', totalPrice: 240, priceBreakdown: [rate] },
          ],
        }),
      );
    if (url.endsWith('/servicios/test-reservation'))
      return Promise.resolve(
        Response.json({
          ...reservation,
          services: [{ serviceType: 'BREAKFAST', quantity: 2, unitPrice: 15, total: 30 }],
          servicesTotal: 30,
          total: 270,
        }),
      );
    if (url.endsWith('/checkin/test-reservation'))
      return Promise.resolve(
        Response.json({
          ...reservation,
          status: 'CHECKED_IN',
          digitalKey: { code: 'test-key', roomNumber: '201', issuedAt: '2028-02-01T12:00:00Z' },
        }),
      );
    if (url.endsWith('/checkout/test-reservation'))
      return Promise.resolve(
        Response.json({
          ...reservation,
          status: 'CHECKED_OUT',
          invoice: {
            invoiceNumber: 'INV-1',
            issuedAt: '2028-02-03T12:00:00Z',
            total: 240,
            roomLines: [{ description: 'Room stay', quantity: 2, unitPrice: 120, amount: 240 }],
            serviceLines: [],
          },
        }),
      );
    return Promise.resolve(Response.json(reservation));
  };
  try {
    const client = new AuthClient('http://localhost:8080/api/v1');
    await client.login('test@example.com', 'Password123');
    assert.equal(client.getUser()?.id, user.id);
    const adapter = new ApiAdapter(client);
    const rooms = await adapter.availability({
      start: '2028-02-01',
      end: '2028-02-03',
      type: 'double',
      guests: 2,
    });
    assert.equal(rooms[0].preview!.total, 240);
    assert.match(calls.at(-1)!.url, /checkInDate=2028-02-01/);
    assert.match(calls.at(-1)!.url, /roomType=DOUBLE/);
    const created = await adapter.create({
      roomId: '201',
      start: '2028-02-01',
      end: '2028-02-03',
      guest: {
        name: 'Test Guest',
        email: 'guest@example.com',
        phone: '+57 300 123 4567',
        document: '',
        count: 2,
      },
    });
    const body = JSON.parse(String(calls.at(-1)!.options?.body));
    assert.equal(body.roomType, 'DOUBLE');
    assert.equal(body.guestName, 'Test Guest');
    assert.equal('habitacionId' in body, false);
    assert.equal(created.roomId, '201');
    const updated = await adapter.addService(created.id, 'breakfast', 2);
    assert.deepEqual(JSON.parse(String(calls.at(-1)!.options?.body)), { serviceType: 'BREAKFAST' });
    assert.equal(updated.services[0].total, 30);
    assert.equal((await adapter.checkIn(created.id)).key, 'test-key');
    const closed = await adapter.checkOut(created.id);
    assert.equal(closed.keyActive, false);
    assert.equal(closed.invoice?.total, 240);
    assert.equal(closed.invoice?.lines[0].quantity, 2);
    assert.equal((await adapter.reservations()).length, 1);
  } finally {
    globalThis.fetch = original;
    data.clear();
  }
});

test('RFC 7807 errors and incompatible DTOs are visible without fallback', async () => {
  const original = globalThis.fetch;
  let failure = false;
  globalThis.fetch = (input): Promise<Response> => {
    const auth = loginResponse(String(input));
    if (auth) return Promise.resolve(auth);
    return Promise.resolve(
      failure
        ? Response.json({ wrong: [] })
        : Response.json({ detail: 'No room is available' }, { status: 409 }),
    );
  };
  try {
    const client = new AuthClient('http://localhost:8080/api/v1');
    await client.login(user.email, 'Password123');
    const adapter = new ApiAdapter(client);
    const criteria = { start: '2028-02-01', end: '2028-02-03', type: 'all' as const, guests: 1 };
    await assert.rejects(adapter.availability(criteria), /No room is available/);
    failure = true;
    await assert.rejects(adapter.availability(criteria), /AvailabilityResponse/);
  } finally {
    globalThis.fetch = original;
  }
});
test('protected requests require login and 401 clears the in-memory session', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (input): Promise<Response> =>
    Promise.resolve(
      loginResponse(String(input)) || Response.json({ detail: 'Token expired' }, { status: 401 }),
    );
  try {
    const client = new AuthClient('http://localhost:8080/api/v1');
    await assert.rejects(client.request('/hotel/reserva/id'), /Inicia sesión/);
    await client.login(user.email, 'Password123');
    await assert.rejects(client.request('/hotel/reserva/id'), /Token expired/);
    assert.equal(client.getUser(), null);
  } finally {
    globalThis.fetch = original;
  }
});
test('parallel requests share one refresh and passwords are not persisted', async () => {
  const original = globalThis.fetch;
  const originalNow = Date.now;
  let time = originalNow();
  let refreshes = 0;
  Date.now = (): number => time;
  globalThis.fetch = (input): Promise<Response> => {
    const url = String(input);
    if (url.endsWith('/auth/refresh')) refreshes++;
    return Promise.resolve(loginResponse(url) || Response.json({ ok: true }));
  };
  try {
    const client = new AuthClient('http://localhost:8080/api/v1');
    await client.login(user.email, 'Password123');
    time += 900000;
    await Promise.all([client.request('/hotel/a'), client.request('/hotel/b')]);
    assert.equal(refreshes, 1);
    assert.equal(data.size, 0);
    client.logout();
    assert.equal(client.getUser(), null);
  } finally {
    globalThis.fetch = original;
    Date.now = originalNow;
  }
});

test('a late refresh response cannot restore a logged-out session', async () => {
  const original = globalThis.fetch;
  const originalNow = Date.now;
  let time = originalNow();
  let resolveRefresh: (response: Response) => void = () => {
    throw new Error('Refresh was not started');
  };
  Date.now = (): number => time;
  globalThis.fetch = (input): Promise<Response> => {
    if (String(input).endsWith('/auth/refresh'))
      return new Promise((resolve) => {
        resolveRefresh = resolve;
      });
    return Promise.resolve(loginResponse(String(input)) || Response.json({ ok: true }));
  };
  try {
    const client = new AuthClient('http://localhost:8080/api/v1');
    await client.login(user.email, 'Password123');
    time += 900000;
    const pending = client.request('/hotel/a');
    client.logout();
    resolveRefresh(Response.json(tokens));
    await assert.rejects(pending, /sesión cambió/);
    await assert.rejects(client.request('/hotel/b'), /Inicia sesión/);
    assert.equal(client.getUser(), null);
  } finally {
    globalThis.fetch = original;
    Date.now = originalNow;
  }
});
