import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '@shared/config/api.config';
import { parseHttpError } from '@shared/utils/error';

export interface AdminUserListItem {
  admin_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'Admin' | 'Partner';
  is_active: boolean;
  created_at: string | null;
  last_login: string | null;
}

/**
 * Storefront user. Partners receive a reduced projection — email, last_login and
 * marketing_opt_in are absent from their payload entirely, hence the optionals.
 */
export interface CustomerListItem {
  user_id: string;
  first_name: string;
  last_name: string;
  created_at: string | null;
  email?: string;
  is_active?: boolean;
  marketing_opt_in?: boolean;
  last_login?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CustomersResponse extends PaginatedResponse<CustomerListItem> {
  /** Which projection the server sent, so the table renders matching columns. */
  viewer_role: 'Admin' | 'Partner';
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/admin`;

  /** Admin-only; the API returns 403 for Partners. */
  async getAdminUsers(page = 1, pageSize = 20, search = ''): Promise<PaginatedResponse<AdminUserListItem>> {
    try {
      let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
      if (search) params = params.set('search', search);

      return await firstValueFrom(
        this.http.get<PaginatedResponse<AdminUserListItem>>(`${this.baseUrl}/users`, {
          params,
          withCredentials: true,
        }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to load admin users');
    }
  }

  /** Admin and Partner; the payload shape depends on the caller's role. */
  async getCustomers(page = 1, pageSize = 20, search = ''): Promise<CustomersResponse> {
    try {
      let params = new HttpParams().set('page', page.toString()).set('pageSize', pageSize.toString());
      if (search) params = params.set('search', search);

      return await firstValueFrom(
        this.http.get<CustomersResponse>(`${this.baseUrl}/customers`, {
          params,
          withCredentials: true,
        }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to load users');
    }
  }
}
