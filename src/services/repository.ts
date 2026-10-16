import type { RepositoryState } from '../types/index';
const KEY = 'oliva-hotel-v1';

// Repository: encapsulate persistence and return defensive copies.
export class LocalRepository {
  constructor(private storage: Storage = globalThis.localStorage) {}
  read(): RepositoryState | null {
    const raw = this.storage.getItem(KEY);
    if (!raw) return null;
    try {
      const state = JSON.parse(raw);
      if (state.version !== 1 || !Array.isArray(state.reservations)) throw new Error();
      return structuredClone(state);
    } catch {
      throw new Error(
        'No se pudieron leer los datos guardados. Exporta o elimina el almacenamiento de este sitio para reiniciar la demostración.',
      );
    }
  }
  write(state: RepositoryState): void {
    try {
      this.storage.setItem(KEY, JSON.stringify({ ...state, version: 1 }));
    } catch {
      throw new Error(
        'No se pudo guardar. Revisa el espacio y los permisos de almacenamiento del navegador.',
      );
    }
  }
}
