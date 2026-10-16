import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ReceiptText } from 'lucide-react';
import { EmptyState } from '../components/common';
import { InvoiceView } from '../components/InvoiceView';
import { formatDate, money } from '../domain/hotel';
import type { Reservation } from '../types';

export function InvoicesPage({
  reservations,
  mode,
  onReservations,
}: {
  reservations: Reservation[];
  mode: 'demo' | 'api';
  onReservations: () => void;
}): ReactNode {
  const [id, setId] = useState('');
  const invoices = reservations.filter((r) => r.invoice);
  const selected = invoices.find((r) => r.id === id);
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">CADA DETALLE, EN SU CUENTA</span>
        <h1>Facturas de tus estancias</h1>
        <p>Consulta el desglose final y guarda una copia de cada visita.</p>
      </div>
      {selected ? (
        <>
          <button className="back-link" onClick={() => setId('')}>
            <ArrowLeft size={16} />
            Todas las facturas
          </button>
          <InvoiceView reservation={selected} mode={mode} />
        </>
      ) : invoices.length ? (
        <div className="invoice-list">
          {invoices.map((r) => (
            <button className="invoice-list-item" key={r.id} onClick={() => setId(r.id)}>
              <span className="stat-icon green">
                <ReceiptText size={22} />
              </span>
              <span>
                <strong>{r.invoice!.id}</strong>
                <small>
                  {r.guest.name} · Hab. {r.roomId} · {formatDate(r.end)}
                </small>
              </span>
              <strong>{money(r.invoice!.total)}</strong>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            title="El recuerdo queda. La cuenta, clara."
            description="La factura final se genera al hacer check-out. Aquí verás el alojamiento y cada servicio adicional, con su desglose."
            action={
              <button className="button primary" onClick={onReservations}>
                Ir a mis reservas
                <ArrowRight size={17} />
              </button>
            }
          />
        </div>
      )}
    </>
  );
}
