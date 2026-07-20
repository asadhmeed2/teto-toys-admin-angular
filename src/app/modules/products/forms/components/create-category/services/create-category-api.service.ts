import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { parseHttpError } from '../../../../../../shared/utils/error';
import { API_BASE_URL } from '../../../../../../shared/config/api.config';

export interface Category {
  id: number;
  name: string;
  slug: string;
}

@Injectable({
  providedIn: 'root',
})
export class CreateCategoryApiService {
  private readonly baseUrl = `${API_BASE_URL}/api/admin/categories`;
  private readonly http = inject(HttpClient);

  // ponytail: standard create using Angular HttpClient and async/await
  async createCategory(name: string): Promise<Category> {
    try {
      return await firstValueFrom(
        this.http.post<Category>(this.baseUrl, { name }, { withCredentials: true }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to create category');
    }
  }
}
