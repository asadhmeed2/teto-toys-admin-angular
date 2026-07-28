import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { parseHttpError } from '@shared/utils/error';
import { API_BASE_URL } from '@shared/config/api.config';

/** day_of_week: 0 = Sunday .. 6 = Saturday. Times are "HH:mm". */
export interface StoreHoursDay {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface StoreHoursResponse {
  days: StoreHoursDay[];
}

@Injectable({ providedIn: 'root' })
export class StoreHoursApiService {
  private readonly baseUrl = `${API_BASE_URL}/api/admin/store-hours`;
  private readonly http = inject(HttpClient);

  async getStoreHours(): Promise<StoreHoursResponse> {
    try {
      return await firstValueFrom(
        this.http.get<StoreHoursResponse>(this.baseUrl, { withCredentials: true }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to load store hours');
    }
  }

  async updateStoreHours(days: StoreHoursDay[]): Promise<StoreHoursResponse> {
    try {
      return await firstValueFrom(
        this.http.put<StoreHoursResponse>(this.baseUrl, { days }, { withCredentials: true }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to save store hours');
    }
  }
}
