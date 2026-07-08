import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Category } from '../../create-category/services/create-category-api.service';
import { Subcategory } from '../../create-subcategory/services/create-subcategory-api.service';

export interface PartDto {
  part_id: string;
  title: string;
  description?: string;
  price: number;
  image_urls: string[];
}

export interface PaginatedPartsResponse {
  items: PartDto[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateProductRequest {
  title: string;
  subtitle?: string;
  description?: string;
  category: number;
  subcategory?: number;
  price: number;
  part_ids: string[];
  image_urls: string[];
}

export interface CreateProductResponse {
  product_id: string;
  title: string;
  subtitle?: string;
  description?: string;
  category: number;
  subcategory?: number;
  price: number;
  part_ids: string[];
  image_urls: string[];
}

@Injectable()
export class CreateProductApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8081/api/admin';

  async getParts(page: number, pageSize: number, search?: string): Promise<PaginatedPartsResponse> {
    try {
      let params = new HttpParams()
        .set('page', page.toString())
        .set('pageSize', pageSize.toString());

      if (search) {
        params = params.set('search', search);
      }

      // ponytail: fetch paginated parts with credential options
      return await firstValueFrom(
        this.http.get<PaginatedPartsResponse>(`${this.baseUrl}/parts`, { params, withCredentials: true })
      );
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        throw new Error(err.error?.error_description || err.error?.error || err.message || 'Failed to fetch parts');
      }
      throw err;
    }
  }

  // ponytail: fetch all categories
  async getCategories(page = 1, pageSize = 100): Promise<{ items: Category[] }> {
    try {
      const url = `${this.baseUrl}/categories?page=${page}&pageSize=${pageSize}`;
      return await firstValueFrom(this.http.get<{ items: Category[] }>(url, { withCredentials: true }));
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        throw new Error(err.error?.error_description || err.error?.error || err.message || 'Failed to fetch categories');
      }
      throw err;
    }
  }

  // ponytail: fetch all subcategories
  async getSubcategories(page = 1, pageSize = 100): Promise<{ items: Subcategory[] }> {
    try {
      const url = `${this.baseUrl}/subcategories?page=${page}&pageSize=${pageSize}`;
      return await firstValueFrom(this.http.get<{ items: Subcategory[] }>(url, { withCredentials: true }));
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        throw new Error(err.error?.error_description || err.error?.error || err.message || 'Failed to fetch subcategories');
      }
      throw err;
    }
  }

  async createProduct(request: CreateProductRequest): Promise<CreateProductResponse> {
    try {
      // ponytail: standard POST withCredentials to register products
      return await firstValueFrom(
        this.http.post<CreateProductResponse>(`${this.baseUrl}/products`, request, { withCredentials: true })
      );
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        throw new Error(err.error?.error_description || err.error?.error || err.message || 'Failed to create product');
      }
      throw err;
    }
  }
}
