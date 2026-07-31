import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { parseHttpError } from '@shared/utils/error';
import { API_BASE_URL } from '@shared/config/api.config';

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

  // ponytail: standard create using Angular HttpClient and async/await.
  // `language` decides which category_translations row the name is written to.
  async createCategory(name: string, language = 'en'): Promise<Category> {
    try {
      return await firstValueFrom(
        this.http.post<Category>(this.baseUrl, { name, language }, { withCredentials: true }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to create category');
    }
  }
}
