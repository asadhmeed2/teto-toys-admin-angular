import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { parseHttpError } from '../../../shared/utils/error';

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
      throw parseHttpError(err, 'Login failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }));
    } catch {
      // best-effort
    }
  }

  async me(token: string): Promise<any> {
    try {
      return await firstValueFrom(
        this.http.get<any>(`${this.baseUrl}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
    } catch (err) {
      throw parseHttpError(err, 'Validation failed');
    }
  }

  async refreshAccessToken(): Promise<LoginResponse> {
    try {
      return await firstValueFrom(
        this.http.post<LoginResponse>(`${this.baseUrl}/refresh`, {}, { withCredentials: true })
      );
    } catch (err) {
      throw parseHttpError(err, 'Refresh failed');
    }
  }
}
