import type { ReactNode } from 'react';
import { Printer, ReceiptText, ShieldCheck } from 'lucide-react';
import { money, formatDate } from '../domain/hotel';
import { Brand } from './common';
import type { Reservation } from '../types';

export function InvoiceView({
  reservation,
  mode,
}: {
  reservation: Reservation;
  mode: 'demo' | 'api';
}): ReactNode {
  const invoice = reservation.invoice;
  if (!invoice) return null;
  return (
    <div className="invoice-wrapper">
      <div className="invoice-toolbar">
        <span>
          <ShieldCheck size={16} />
          {mode === 'demo'
            ? 'Factura simulada · sin validez fiscal'
            : 'Factura generada por el servidor'}
        </span>
        <button className="button secondary" onClick={() => window.print()}>
          <Printer size={16} />
          Imprimir / guardar PDF
        </button>
      </div>
      <article className="invoice-sheet" id="print-invoice">
        <div className="invoice-top">
          <Brand compact />
          <div>
            <span className="eyebrow">FACTURA DE ESTANCIA</span>
            <h3>{invoice.id}</h3>
            <p>
              Emisión:{' '}
              {new Intl.DateTimeFormat('es-CO', {
                dateStyle: 'medium',
                timeZone: 'America/Bogota',
              }).format(new Date(invoice.issuedAt))}
            </p>
          </div>
        </div>
        <div className="invoice-guest">
          <div>
            <span className="eyebrow">FACTURADO A</span>
            <h4>{reservation.guest.name}</h4>
            <p>
              {reservation.guest.document}
              <br />
              {reservation.guest.email}
            </p>
          </div>
          <div>
            <span className="eyebrow">DETALLES DE LA ESTANCIA</span>
            <p>
              Habitación {reservation.roomId} · {reservation.room.name}
              <br />
              {formatDate(reservation.start)} — {formatDate(reservation.end, { year: 'numeric' })}
              <br />
              {reservation.quote.nights} noches
              {mode === 'demo' ? ` · ${reservation.guest.count} huésped(es)` : ''}
            </p>
          </div>
        </div>
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Cant.</th>
              <th>Valor unitario</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, i) => (
              <tr key={i}>
                <td>{line.name}</td>
                <td>{line.quantity}</td>
                <td>{money(line.unitPrice)}</td>
                <td>{money(line.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="invoice-total">
          <span>
            Total de la estancia <small>{invoice.currency}</small>
          </span>
          <strong>{money(invoice.total)}</strong>
        </div>
        <div className="invoice-footer">
          <ReceiptText size={24} strokeWidth={1} />
          <p>
            Gracias por hacer de Oliva parte de tu viaje.
            <br />
            <strong>Esperamos verte pronto.</strong>
          </p>
          <small>
            {mode === 'demo'
              ? 'Documento de demostración. No acredita un pago ni tiene validez fiscal.'
              : 'Importes y desglose recibidos de la API del hotel.'}
          </small>
        </div>
      </article>
    </div>
  );
}
