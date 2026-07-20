import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { parseHttpError } from '../utils/error';

export interface SystemLanguage {
  code: string;
  name: string;
  is_rtl: boolean;
}

@Injectable({ providedIn: 'root' })
export class LanguageApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/admin`;

  // ponytail: fetches the list of system languages from the admin API
  async getLanguages(): Promise<SystemLanguage[]> {
    try {
      return await firstValueFrom(
        this.http.get<SystemLanguage[]>(`${this.baseUrl}/languages`, { withCredentials: true })
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to fetch languages');
    }
  }
}
