import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowUpRight,
  BedDouble,
  CalendarCheck,
  ChevronRight,
  CircleHelp,
  Code2,
  Flower2,
  KeyRound,
  Leaf,
  Menu,
  Plus,
  ReceiptText,
  Server,
  X,
} from 'lucide-react';
import { Brand, ErrorMessage, Modal, Toast } from './components/common';
import { BookingModal } from './components/BookingModal';
import { RoomsPage } from './pages/RoomsPage';
import { ReservationsPage } from './pages/ReservationsPage';
import { ServicesPage } from './pages/ServicesPage';
import { AccessPage } from './pages/AccessPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { AuthPage } from './pages/AuthPage';
import { useHotel } from './hooks/useHotel';
import type { Page, Reservation, Room } from './types';
import './App.css';

const navigation = [
  { id: 'rooms', label: 'Habitaciones', icon: BedDouble },
  { id: 'reservations', label: 'Reservas', icon: CalendarCheck },
  { id: 'services', label: 'Servicios', icon: Flower2 },
  { id: 'access', label: 'Acceso digital', icon: KeyRound },
  { id: 'invoices', label: 'Facturación', icon: ReceiptText },
] as const;

export default function App(): ReactNode {
  const hotel = useHotel();
  const [page, setPage] = useState<Page>('rooms');
  const [selectedId, setSelectedId] = useState('');
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [help, setHelp] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState('');
  const clearToast = useCallback(() => setToast(''), []);
  function navigate(next: Page, id = ''): void {
    setPage(next);
    setSelectedId(id);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function onBooked(reservation: Reservation): void {
    hotel.remember(reservation);
    setBookingRoom(null);
    navigate('reservations', reservation.id);
    setToast('Reserva confirmada. ¡Te esperamos en Oliva!');
    void hotel.search(hotel.criteria);
  }
  function update(reservation: Reservation): void {
    hotel.remember(reservation);
    void hotel.search(hotel.criteria);
  }
  if (hotel.facade.mode === 'api' && !hotel.user) return <AuthPage facade={hotel.facade} />;
  const pending = hotel.reservations.filter((r) => r.status === 'confirmed').length;
  const date = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota',
  }).format(new Date());
  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="sidebar-scrim"
          onClick={() => setMobileMenu(false)}
          aria-label="Cerrar menú"
        />
      )}
      <aside className={`sidebar ${mobileMenu ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-close"
            aria-label="Cerrar menú"
            onClick={() => setMobileMenu(false)}
          >
            <X />
          </button>
        </div>
        <div className="hotel-label">
          <span className="live-dot" />
          <span>Una estancia, mil detalles.</span>
        </div>
        <span className="nav-label">TU HOTEL, EN UN SOLO LUGAR</span>
        <nav aria-label="Navegación principal">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={page === item.id ? 'active' : ''}
                aria-current={page === item.id ? 'page' : undefined}
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} strokeWidth={1.65} />
                <span>{item.label}</span>
                {item.id === 'reservations' && pending > 0 && <small>{pending}</small>}
                {page === item.id && <span className="nav-active-line" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <Leaf size={27} strokeWidth={1.1} />
          <h3>
            Hospitalidad
            <br />
            que se siente.
          </h3>
          <p>
            El descanso empieza
            <br />
            con una buena bienvenida.
          </p>
          <span>
            EST. 2026 <span>✧</span>
          </span>
        </div>
        <div className="sidebar-bottom">
          <button className="help-button" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            Guía del sistema
            <ArrowUpRight size={15} />
          </button>
          <div className="environment">
            <span className="live-dot" />
            <div>
              {hotel.facade.mode === 'demo' ? 'Demostración local' : 'Conectado a API'}
              <small>
                {hotel.facade.mode === 'demo'
                  ? 'Datos guardados en este navegador'
                  : 'Spring Boot · contrato REST'}
              </small>
            </div>
            <Code2 size={16} />
          </div>
          <span className="sidebar-version">OLIVA HOTEL SYSTEM &nbsp; / &nbsp; V.1.0</span>
        </div>
      </aside>
      <div className="main-layout">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menú"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span>Mi hotel</span>
            <ChevronRight size={14} />
            <strong>{navigation.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="header-date">{date}</span>
            <span className="header-divider" />
            <span className="reception-avatar">O</span>
            <span className="reception-label">
              <strong>{hotel.user?.fullName || 'Recepción Oliva'}</strong>
              <small>Gestión de estancias</small>
            </span>
            {hotel.facade.mode === 'api' && (
              <button className="text-button" onClick={() => hotel.facade.logout()}>
                Cerrar sesión
              </button>
            )}
          </div>
        </header>
        <main id="main-content">
          <div className="content-topline">
            <span>
              <span className="live-dot" />
              {hotel.facade.mode === 'demo' ? 'MODO DEMOSTRACIÓN' : 'MODO API · SPRING BOOT'}
            </span>
            <button className="text-button" onClick={() => navigate('rooms')}>
              <Plus size={14} />
              Nueva reserva
            </button>
          </div>
          <ErrorMessage message={hotel.error} dismiss={() => hotel.setError('')} />
          {page === 'rooms' && (
            <RoomsPage
              {...hotel}
              onSearch={hotel.search}
              onSelect={setBookingRoom}
              mode={hotel.facade.mode}
            />
          )}
          {page === 'reservations' && (
            <ReservationsPage
              reservations={hotel.reservations}
              selectedId={selectedId}
              facade={hotel.facade}
              onSelect={setSelectedId}
              onUpdate={update}
              onNew={() => navigate('rooms')}
              onAccess={(id) => navigate('access', id)}
              notify={setToast}
            />
          )}
          {page === 'services' && (
            <ServicesPage
              reservations={hotel.reservations}
              facade={hotel.facade}
              onUpdate={update}
              onNew={() => navigate('rooms')}
              notify={setToast}
            />
          )}
          {page === 'access' && (
            <AccessPage
              reservations={hotel.reservations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              facade={hotel.facade}
              onManage={(id) => navigate('reservations', id)}
              notify={setToast}
            />
          )}
          {page === 'invoices' && (
            <InvoicesPage
              reservations={hotel.reservations}
              mode={hotel.facade.mode}
              onReservations={() => navigate('reservations')}
            />
          )}
          <footer className="app-footer">
            <span>© {new Date().getFullYear()} Oliva Hotel & Living</span>
            <span>
              Hecho para recibirte bien. <Leaf size={12} />
            </span>
          </footer>
        </main>
      </div>
      {bookingRoom && (
        <BookingModal
          room={bookingRoom}
          criteria={hotel.criteria}
          facade={hotel.facade}
          onClose={() => setBookingRoom(null)}
          onBooked={onBooked}
        />
      )}
      {help && (
        <Modal
          title="Bienvenido al sistema Oliva"
          subtitle="Una guía breve para recorrer toda la experiencia."
          onClose={() => setHelp(false)}
        >
          <div className="help-content">
            <ol>
              <li>
                <strong>Encuentra una habitación.</strong> Busca por fechas, huéspedes y tipo. La
                temporada alta aplica en enero, junio, julio y diciembre (×1,5).
              </li>
              <li>
                <strong>Confirma tu reserva.</strong> Completa los datos del huésped y revisa el
                precio. Todos los importes están en USD.
              </li>
              <li>
                <strong>Haz check-in.</strong> Se habilita durante las fechas de estancia y genera
                una llave UUID.
              </li>
              <li>
                <strong>Agrega experiencias.</strong> Spa $50/sesión, desayuno $15/día y traslado
                $30/trayecto.
              </li>
              <li>
                <strong>Prueba el acceso.</strong> Usa el código y la habitación correcta. Prueba
                también una llave incorrecta.
              </li>
              <li>
                <strong>Finaliza con check-out.</strong> Se libera la habitación, se invalida la
                llave y se genera la factura imprimible.
              </li>
            </ol>
            <div className="notice">
              <Server size={22} />
              <p>
                {hotel.facade.mode === 'demo'
                  ? 'Estás en modo demo: las tres reservas iniciales son ejemplos y los datos se guardan únicamente en este navegador. No hay autenticación, pagos reales ni seguridad de acceso físico.'
                  : 'Estás en modo API. Los precios de búsqueda, la reserva y la factura provienen del servidor Spring Boot.'}
              </p>
            </div>
            <p className="muted small">
              Proyecto React + TypeScript · Facade, Singleton, Strategy, Repository y Adapter.
              Consulta README.md y docs/API.md para ejecutarlo, conectarlo a Spring Boot y
              desplegarlo en Vercel.
            </p>
          </div>
        </Modal>
      )}
      <Toast message={toast} clear={clearToast} />
    </div>
  );
}
