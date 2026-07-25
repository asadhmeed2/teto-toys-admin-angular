import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

const TOKEN_KEY = 'admin_access_token';
const TOKEN_EXPIRY_KEY = 'admin_token_expiry';

// Fire the proactive refresh 60 s before the JWT actually expires
const REFRESH_BUFFER_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private refreshTimerId: ReturnType<typeof setTimeout> | null = null;

  // Set to true while ANY refresh (proactive or reactive) is in-flight,
  // so the proactive timer doesn't fire a second concurrent request.
  isRefreshing = false;

  // Registered once by APP_INITIALIZER to break the circular dep with HttpClient
  private refreshFn: (() => Promise<{ access_token: string; expires_in: number }>) | null = null;

  readonly isLoggedIn = computed(() => !!this._token());
  readonly token = this._token.asReadonly();

  registerRefreshFn(fn: () => Promise<{ access_token: string; expires_in: number }>): void {
    this.refreshFn = fn;
  }

  setToken(token: string, expiresInSeconds = 900): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1_000));
    this._token.set(token);
    this.scheduleRefresh(expiresInSeconds * 1_000);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    this._token.set(null);
    this.cancelRefresh();
  }

  /**
   * Called by APP_INITIALIZER on every page load.
   * Resumes the proactive-refresh timer based on the expiry stored in localStorage,
   * so a page refresh doesn't restart the 15-minute clock.
   */
  resumeRefreshTimer(): void {
    const expiry = Number(localStorage.getItem(TOKEN_EXPIRY_KEY) ?? '0');
    if (!expiry || !this._token()) return;

    const remaining = expiry - Date.now();
    if (remaining > REFRESH_BUFFER_MS) {
      // Token still has plenty of time — schedule normally
      this.scheduleRefresh(remaining);
    } else if (remaining > 0) {
      // Under the buffer but not expired yet — fire immediately so we get a fresh token
      // before the JWT actually expires.
      this.runProactiveRefresh();
    }
    // If remaining <= 0 the token is already expired.
    // Don't attempt a refresh here — the reactive 401 path in the interceptor
    // will handle it on the first API call and is better suited to coordinate
    // the retry of the original request.
  }

  private scheduleRefresh(tokenLifetimeMs: number): void {
    this.cancelRefresh();
    const delay = tokenLifetimeMs - REFRESH_BUFFER_MS; // always > 0 when called correctly
    this.refreshTimerId = setTimeout(() => this.runProactiveRefresh(), delay);
  }

  /**
   * Best-effort proactive refresh. On failure it does NOT log the user out —
   * the reactive 401 interceptor path is the authoritative logout mechanism.
   */
  async runProactiveRefresh(): Promise<void> {
    if (this.isRefreshing || !this.refreshFn || !this._token()) return;

    this.isRefreshing = true;
    try {
      const res = await this.refreshFn();
      // setToken reschedules the next proactive refresh automatically
      this.setToken(res.access_token, res.expires_in);
    } catch {
      // Network blip or server hiccup — the token is still valid for ~60 s.
      // Do NOT log the user out here. The interceptor will handle the 401
      // when the JWT actually expires and will redirect only if the refresh
      // token itself is invalid.
    } finally {
      this.isRefreshing = false;
    }
  }

  private cancelRefresh(): void {
    if (this.refreshTimerId !== null) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }
}
