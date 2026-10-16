export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: 'GUEST' | 'ADMIN';
}
interface Tokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

/** Backend JWT client. Tokens live only in memory; passwords are never retained. */
export class AuthClient {
  private tokens: Tokens | null = null;
  private user: AuthUser | null = null;
  private expiresAt = 0;
  private refreshTask: Promise<void> | null = null;
  private generation = 0;
  private baseURL: string;
  constructor(baseURL: string) {
    if (!baseURL.startsWith('/') && !/^https?:\/\//.test(baseURL))
      throw new Error('La URL de API debe ser relativa o usar HTTP(S).');
    this.baseURL = baseURL.replace(/\/$/, '');
  }
  getUser(): AuthUser | null {
    return this.user;
  }
  private emit(): void {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('oliva-auth-changed'));
  }
  logout(): void {
    this.generation++;
    this.tokens = null;
    this.user = null;
    this.expiresAt = 0;
    this.emit();
  }
  private saveTokens(tokens: Tokens): void {
    if (!tokens.accessToken || !tokens.refreshToken || !Number.isFinite(tokens.expiresIn))
      throw new Error('El servidor devolvió una sesión inválida.');
    this.tokens = tokens;
    this.expiresAt = Date.now() + tokens.expiresIn * 1000;
  }
  async login(email: string, password: string): Promise<AuthUser> {
    this.logout();
    const tokens = await this.request<Tokens>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) },
      false,
    );
    this.saveTokens(tokens);
    try {
      const user = await this.request<AuthUser>('/auth/me');
      if (!user.id || !user.email || !user.fullName)
        throw new Error('El servidor devolvió un usuario inválido.');
      this.user = user;
      this.emit();
      return user;
    } catch (error) {
      this.logout();
      throw error;
    }
  }
  async register(fullName: string, email: string, password: string): Promise<void> {
    await this.request<AuthUser>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), password }),
      },
      false,
    );
  }
  private async refresh(): Promise<void> {
    if (!this.tokens) throw new Error('Inicia sesión para continuar.');
    const refreshToken = this.tokens.refreshToken;
    const generation = this.generation;
    try {
      const renewed = await this.request<Tokens>(
        '/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken }) },
        false,
      );
      if (generation !== this.generation)
        throw new Error('La sesión cambió durante la renovación.');
      this.saveTokens(renewed);
    } catch (error) {
      if (generation === this.generation) this.logout();
      throw error;
    }
  }
  async request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
    const generation = this.generation;
    if (authenticated) {
      if (!this.tokens) throw new Error('Inicia sesión para consultar el hotel.');
      if (Date.now() >= this.expiresAt - 30000) {
        this.refreshTask ??= this.refresh().finally(() => {
          this.refreshTask = null;
        });
        await this.refreshTask;
      }
    }
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 12000);
    try {
      const response = await fetch(this.baseURL + path, {
        ...options,
        signal: abort.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(authenticated && this.tokens
            ? { Authorization: `Bearer ${this.tokens.accessToken}` }
            : {}),
          ...options.headers,
        },
      });
      const payload: unknown = await response.json().catch(() => null);
      if (authenticated && generation !== this.generation)
        throw new Error('La sesión cambió. Repite la consulta con tu sesión actual.');
      if (!response.ok) {
        if (authenticated && response.status === 401) this.logout();
        let message = `El servidor respondió con un error (${response.status}).`;
        if (payload && typeof payload === 'object') {
          if ('detail' in payload && typeof payload.detail === 'string') message = payload.detail;
          if ('errors' in payload && payload.errors && typeof payload.errors === 'object')
            message +=
              ' ' +
              Object.values(payload.errors)
                .filter((v) => typeof v === 'string')
                .join('. ');
        }
        throw new Error(message);
      }
      if (payload == null) throw new Error('El servidor debe devolver una respuesta JSON.');
      return payload as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError')
        throw new Error(
          'El servidor tardó demasiado. Consulta la reserva antes de repetir una operación.',
          { cause: error },
        );
      if (error instanceof TypeError)
        throw new Error('No se pudo conectar con Spring Boot. Revisa la URL, la conexión y CORS.', {
          cause: error,
        });
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
