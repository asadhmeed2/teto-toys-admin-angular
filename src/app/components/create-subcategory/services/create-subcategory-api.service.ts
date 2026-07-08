import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Category } from '../../create-category/services/create-category-api.service';

export interface Subcategory {
  subcategory_id: string;
  category_id: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class CreateSubcategoryApiService {
  private readonly baseUrl = 'http://localhost:8081/api/admin';
  private readonly http = inject(HttpClient);

  // ponytail: fetch categories using HttpClient and async/await to populate parent dropdown
  async getCategories(page = 1, pageSize = 100): Promise<{ items: Category[] }> {
    try {
      const url = `${this.baseUrl}/categories?page=${page}&pageSize=${pageSize}`;
      return await firstValueFrom(this.http.get<{ items: Category[] }>(url, { withCredentials: true }));
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        throw new Error(err.error?.error_description || err.error?.error || err.message || 'Failed to load categories');
      }
      throw err;
    }
  }

  // ponytail: create subcategory using HttpClient and async/await
  async createSubcategory(categoryId: string, name: string): Promise<Subcategory> {
    try {
      const url = `${this.baseUrl}/subcategories`;
      return await firstValueFrom(
        this.http.post<Subcategory>(url, { categoryId, name }, { withCredentials: true })
      );
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        throw new Error(err.error?.error_description || err.error?.error || err.message || 'Failed to create subcategory');
      }
      throw err;
    }
  }
}
