import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { parseHttpError } from '@shared/utils/error';
import { API_BASE_URL } from '@shared/config/api.config';
import { Category } from '@modules/products/forms/components/create-category/services/create-category-api.service';
import {
  Subcategory,
  CreateSubcategoryApiService,
} from '@modules/products/forms/components/create-subcategory/services/create-subcategory-api.service';

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
  language?: string;
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
  is_displayed?: boolean;
  is_deleted?: boolean;
}

@Injectable()
export class CreateProductApiService {
  private readonly http = inject(HttpClient);
  private readonly subcategoryApi = inject(CreateSubcategoryApiService);
  private readonly baseUrl = `${API_BASE_URL}/api/admin`;

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
        this.http.get<PaginatedPartsResponse>(`${this.baseUrl}/parts`, {
          params,
          withCredentials: true,
        }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to fetch parts');
    }
  }

  // ponytail: category/subcategory fetches live on CreateSubcategoryApiService, delegate instead of duplicating
  getCategories(page = 1, pageSize = 100): Promise<{ items: Category[] }> {
    return this.subcategoryApi.getCategories(page, pageSize);
  }

  getSubcategories(page = 1, pageSize = 100): Promise<{ items: Subcategory[] }> {
    return this.subcategoryApi.getSubcategories(page, pageSize);
  }

  async createProduct(request: CreateProductRequest): Promise<CreateProductResponse> {
    try {
      // ponytail: standard POST withCredentials to register products
      return await firstValueFrom(
        this.http.post<CreateProductResponse>(`${this.baseUrl}/products`, request, {
          withCredentials: true,
        }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to create product');
    }
  }

  async getProducts(
    page = 1,
    pageSize = 10,
    search = '',
  ): Promise<{ items: CreateProductResponse[]; total_count: number; total_pages: number }> {
    try {
      let params = new HttpParams()
        .set('page', page.toString())
        .set('pageSize', pageSize.toString());
      if (search) {
        params = params.set('search', search);
      }
      return await firstValueFrom(
        this.http.get<{ items: CreateProductResponse[]; total_count: number; total_pages: number }>(
          `${this.baseUrl}/products`,
          { params, withCredentials: true },
        ),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to fetch products');
    }
  }

  async getProduct(productId: string, language = 'en'): Promise<CreateProductResponse & { part_ids: string[] }> {
    try {
      // ponytail: pass language so the API returns the translation row for that language
      return await firstValueFrom(
        this.http.get<CreateProductResponse & { part_ids: string[] }>(
          `${this.baseUrl}/products/${productId}`,
          { params: new HttpParams().set('language', language), withCredentials: true },
        ),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to fetch product details');
    }
  }

  async updateProduct(
    productId: string,
    request: CreateProductRequest,
  ): Promise<CreateProductResponse> {
    try {
      return await firstValueFrom(
        this.http.put<CreateProductResponse>(`${this.baseUrl}/products/${productId}`, request, {
          withCredentials: true,
        }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to update product');
    }
  }

  async setProductDisplay(productId: string, isDisplayed: boolean): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch<void>(
          `${this.baseUrl}/products/${productId}/display`,
          { is_displayed: isDisplayed },
          { withCredentials: true },
        ),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to update product visibility');
    }
  }

  // ponytail: restore — clears is_deleted flag, product becomes active again
  async restoreProduct(productId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.patch<void>(`${this.baseUrl}/products/${productId}/restore`, {}, { withCredentials: true }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to restore product');
    }
  }

  // ponytail: soft delete — backend flips is_deleted, row stays in the DB
  async deleteProduct(productId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.baseUrl}/products/${productId}`, { withCredentials: true }),
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to delete product');
    }
  }
}
