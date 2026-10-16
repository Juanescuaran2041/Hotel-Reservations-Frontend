import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

class ApplicationBoundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(error: Error): { error: string } {
    return { error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application initialization failed:', error, info.componentStack);
  }
  render(): ReactNode {
    return this.state.error ? (
      <main className="fatal-error">
        <h1>No pudimos iniciar Oliva.</h1>
        <p role="alert">{this.state.error}</p>
        <p>Revisa la configuración y los permisos de almacenamiento del navegador.</p>
        <button onClick={() => window.location.reload()}>Volver a intentar</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <ApplicationBoundary>
    <App />
  </ApplicationBoundary>,
);
