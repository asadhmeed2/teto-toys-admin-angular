import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8081/api/auth';

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      return await firstValueFrom(
        this.http.post<LoginResponse>(`${this.baseUrl}/login`, { email, password }, { withCredentials: true })
      );
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        throw new Error(err.error?.error_description || err.error?.error || err.message || 'Login failed');
      }
      throw err;
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }));
    } catch {
      // best-effort
    }
  }
}
