export type RoomType = 'single' | 'double' | 'suite';
export type ReservationStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type ServiceType = 'spa' | 'breakfast' | 'transfer';
export type Page = 'rooms' | 'reservations' | 'services' | 'access' | 'invoices';
export interface Room {
  preview?: PriceBreakdown;
  id: string;
  type: RoomType;
  name: string;
  basePrice: number;
  capacity: number;
  size: number;
  bed: string;
  view: string;
  image: string;
  description: string;
}
export interface Guest {
  name: string;
  email: string;
  document: string;
  phone: string;
  count: number;
}
export interface SearchCriteria {
  start: string;
  end: string;
  type: RoomType | 'all';
  guests: number;
}
export interface NightlyRate {
  label?: string;
  date: string;
  season: 'high' | 'low';
  amount: number;
}
export interface PriceBreakdown {
  nights: number;
  lines: NightlyRate[];
  total: number;
  highNights: number;
}
export interface ServiceItem {
  id: string;
  type: ServiceType;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
export interface InvoiceLine {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
export interface Invoice {
  id: string;
  issuedAt: string;
  currency: string;
  lines: InvoiceLine[];
  total: number;
}
export interface Reservation {
  id: string;
  roomId: string;
  room: Room;
  start: string;
  end: string;
  guest: Guest;
  status: ReservationStatus;
  services: ServiceItem[];
  quote: PriceBreakdown;
  key: string | null;
  keyActive: boolean;
  invoice?: Invoice | null;
  createdAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  example?: boolean;
}
export interface ReservationRequest {
  roomId: string;
  start: string;
  end: string;
  guest: Guest;
}
export interface RepositoryState {
  version?: number;
  reservations: Reservation[];
}
export interface ReservationAdapter {
  reservations(): Promise<Reservation[]>;
  availability(criteria: SearchCriteria): Promise<Room[]>;
  get(id: string): Promise<Reservation>;
  create(data: ReservationRequest): Promise<Reservation>;
  addService(id: string, type: ServiceType, quantity: number): Promise<Reservation>;
  checkIn(id: string): Promise<Reservation>;
  checkOut(id: string): Promise<Reservation>;
}
