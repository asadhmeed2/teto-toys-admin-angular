import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '@shared/config/api.config';
import { parseHttpError } from '@shared/utils/error';

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  number_of_active_products: number;
}

export interface AdminCategoriesResponse {
  items: AdminCategory[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

@Injectable({ providedIn: 'root' })
export class AdminCategoriesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/admin/categories`;

  async getCategories(page = 1, pageSize = 100, search = ''): Promise<AdminCategoriesResponse> {
    try {
      let params = new HttpParams()
        .set('page', page.toString())
        .set('pageSize', pageSize.toString());
      if (search) params = params.set('search', search);
      return await firstValueFrom(
        this.http.get<AdminCategoriesResponse>(this.baseUrl, { params, withCredentials: true }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to fetch categories');
    }
  }

  async deleteCategory(categoryId: number): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.baseUrl}/${categoryId}`, { withCredentials: true }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to delete category');
    }
  }
}
