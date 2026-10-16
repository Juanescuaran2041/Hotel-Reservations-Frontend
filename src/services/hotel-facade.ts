import type {
  ReservationAdapter,
  SearchCriteria,
  Reservation,
  ReservationRequest,
  Room,
  ServiceType,
} from '../types/index';
import { DemoAdapter } from './demo-adapter.js';
import { ApiAdapter } from './api-adapter.js';
import { validateDates, validateGuest, today } from '../domain/hotel.js';
import { API_BASE_URL } from '../config/api';
import { AuthClient } from './auth-client';
import type { AuthUser } from './auth-client';

// Facade + Singleton: the single application boundary used by React.
export class HotelFacade {
  private static instance: HotelFacade | undefined;
  static getInstance(): HotelFacade {
    if (!HotelFacade.instance) {
      const mode = import.meta.env?.VITE_DATA_MODE || 'demo';
      if (!['demo', 'api'].includes(mode)) throw new Error('VITE_DATA_MODE debe ser demo o api.');
      const auth = mode === 'api' ? new AuthClient(API_BASE_URL) : undefined;
      HotelFacade.instance = new HotelFacade(
        auth ? new ApiAdapter(auth) : new DemoAdapter(),
        mode,
        auth,
      );
    }
    return HotelFacade.instance;
  }
  constructor(
    private adapter: ReservationAdapter,
    public readonly mode: 'demo' | 'api' = 'demo',
    private auth?: AuthClient,
  ) {}
  getCurrentUser(): AuthUser | null {
    return this.auth?.getUser() ?? null;
  }
  async login(email: string, password: string): Promise<AuthUser> {
    if (!this.auth) throw new Error('El modo demo no requiere inicio de sesión.');
    return this.auth.login(email, password);
  }
  async register(fullName: string, email: string, password: string): Promise<void> {
    if (!this.auth) throw new Error('El registro está disponible en modo API.');
    return this.auth.register(fullName, email, password);
  }
  logout(): void {
    this.auth?.logout();
  }
  searchRooms(filters: SearchCriteria): Promise<Room[]> {
    validateDates(filters.start, filters.end);
    return this.adapter.availability(filters);
  }
  listReservations(): Promise<Reservation[]> {
    return this.adapter.reservations();
  }
  getReservation(id: string): Promise<Reservation> {
    return this.adapter.get(id);
  }
  createReservation(data: ReservationRequest, room: Room): Promise<Reservation> {
    validateDates(data.start, data.end);
    validateGuest(data.guest, room.capacity, this.mode === 'demo');
    return this.adapter.create(data);
  }
  addService(id: string, type: ServiceType, quantity: number): Promise<Reservation> {
    return this.adapter.addService(id, type, quantity);
  }
  checkIn(id: string): Promise<Reservation> {
    return this.adapter.checkIn(id);
  }
  checkOut(id: string): Promise<Reservation> {
    return this.adapter.checkOut(id);
  }
  async simulateAccess(
    id: string,
    code: string,
    roomId: string,
  ): Promise<{ granted: boolean; roomId: string }> {
    const r = await this.adapter.get(id);
    if (r.status !== 'checked_in' || !r.keyActive || today() < r.start || today() >= r.end)
      throw new Error('Acceso denegado: la llave no está activa o la estancia ya venció.');
    if (
      r.roomId !== String(roomId) ||
      !code?.trim() ||
      code.trim().toLowerCase() !== r.key?.toLowerCase()
    )
      throw new Error('Acceso denegado: la llave no corresponde a esta habitación.');
    return { granted: true, roomId: r.roomId };
  }
}
