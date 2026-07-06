import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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
  category: string;
  subcategory?: string;
  price: number;
  part_ids: string[];
  image_urls: string[];
}

export interface CreateProductResponse {
  product_id: string;
  title: string;
  subtitle?: string;
  description?: string;
  category: string;
  subcategory?: string;
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
