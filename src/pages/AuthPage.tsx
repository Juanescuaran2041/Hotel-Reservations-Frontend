import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowRight, Leaf, LockKeyhole } from 'lucide-react';
import { Brand, ErrorMessage, SubmitButton } from '../components/common';
import { errorText } from '../hooks/useHotel';
import type { HotelFacade } from '../services/hotel-facade';

export function AuthPage({ facade }: { facade: HotelFacade }): ReactNode {
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (registering) {
        await facade.register(name, email, password);
        setRegistering(false);
        setPassword('');
        setMessage('Cuenta creada. Ahora inicia sesión con tus credenciales.');
      } else {
        await facade.login(email, password);
        setPassword('');
      }
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">TU PRÓXIMA ESTANCIA EMPIEZA AQUÍ</span>
          <h1>
            Un lugar para
            <br />
            llegar. Un momento
            <br />
            para <em>quedarte.</em>
          </h1>
          <p>
            Cada detalle, cada bienvenida.
            <br />
            Todo lo que hace especial estar en Oliva.
          </p>
          <Leaf size={100} strokeWidth={0.6} />
        </div>
        <span>OLIVA HOTEL & LIVING · EST. 2026</span>
      </aside>
      <main className="auth-main">
        <div className="auth-form-card">
          <span className="eyebrow">
            <LockKeyhole size={13} />
            ACCESO A TU HOTEL
          </span>
          <h2>{registering ? 'Tu primera bienvenida.' : 'Qué bueno verte de nuevo.'}</h2>
          <p>
            {registering
              ? 'Crea una cuenta en el backend del hotel para gestionar tus reservas.'
              : 'Inicia sesión para reservar y gestionar tu estancia.'}
          </p>
          <form onSubmit={(event) => void submit(event)}>
            {registering && (
              <label>
                Nombre completo
                <input
                  required
                  minLength={3}
                  maxLength={120}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label>
              Correo electrónico
              <input
                required
                type="email"
                maxLength={160}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@correo.com"
              />
            </label>
            <label>
              Contraseña
              <input
                required
                type="password"
                minLength={registering ? 8 : 1}
                maxLength={72}
                pattern={registering ? '^(?=.*[A-Za-z])(?=.*[0-9]).+$' : undefined}
                autoComplete={registering ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {registering && <small>Mínimo 8 caracteres, con al menos una letra y un número.</small>}
            <ErrorMessage message={error} />
            {message && (
              <div className="info-message" role="status">
                {message}
              </div>
            )}
            <SubmitButton busy={busy}>
              {busy ? 'Procesando…' : registering ? 'Crear cuenta' : 'Iniciar sesión'}
            </SubmitButton>
          </form>
          <button
            className="auth-toggle"
            disabled={busy}
            onClick={() => {
              setRegistering(!registering);
              setError('');
              setMessage('');
              setPassword('');
            }}
          >
            {registering ? 'Ya tengo una cuenta' : 'Es mi primera visita. Crear una cuenta'}
            <ArrowRight size={14} />
          </button>
          <p className="auth-note">
            Autenticación con el backend Spring Boot. Las contraseñas y los tokens no se guardan en
            el almacenamiento del navegador. Al recargar, deberás iniciar sesión nuevamente.
          </p>
        </div>
      </main>
    </div>
  );
}
