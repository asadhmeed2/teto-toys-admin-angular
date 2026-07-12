import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { parseHttpError } from '../../../shared/utils/error';
import { API_BASE_URL } from '../../../shared/config/api.config';
import { Category } from '../../create-category/services/create-category-api.service';

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class CreateSubcategoryApiService {
  private readonly baseUrl = `${API_BASE_URL}/api/admin`;
  private readonly http = inject(HttpClient);

  // ponytail: fetch categories using HttpClient and async/await to populate parent dropdown
  async getCategories(page = 1, pageSize = 100): Promise<{ items: Category[] }> {
    try {
      const url = `${this.baseUrl}/categories?page=${page}&pageSize=${pageSize}`;
      return await firstValueFrom(this.http.get<{ items: Category[] }>(url, { withCredentials: true }));
    } catch (err) {
      throw parseHttpError(err, 'Failed to load categories');
    }
  }

  // ponytail: fetch subcategories using HttpClient and async/await
  async getSubcategories(page = 1, pageSize = 100): Promise<{ items: Subcategory[] }> {
    try {
      const url = `${this.baseUrl}/subcategories?page=${page}&pageSize=${pageSize}`;
      return await firstValueFrom(this.http.get<{ items: Subcategory[] }>(url, { withCredentials: true }));
    } catch (err) {
      throw parseHttpError(err, 'Failed to fetch subcategories');
    }
  }

  // ponytail: create subcategory using HttpClient and async/await
  async createSubcategory(categoryId: number, name: string): Promise<Subcategory> {
    try {
      const url = `${this.baseUrl}/subcategories`;
      return await firstValueFrom(
        this.http.post<Subcategory>(url, { categoryId, name }, { withCredentials: true })
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to create subcategory');
    }
  }
}
