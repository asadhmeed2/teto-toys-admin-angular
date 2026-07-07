import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CreatePartRequest {
  title: string;
  description?: string;
  price: number;
  image_urls?: string[];
}

export interface CreatePartResponse {
  part_id: string;
  title: string;
  description?: string;
  price: number;
}

@Injectable()
export class CreatePartApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8081/api/admin/parts';

  async createPart(request: CreatePartRequest): Promise<CreatePartResponse> {
    try {
      // ponytail: standard POST withCredentials for API call
      return await firstValueFrom(
        this.http.post<CreatePartResponse>(this.baseUrl, request, { withCredentials: true })
      );
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        throw new Error(err.error?.error_description || err.error?.error || err.message || 'Failed to create part');
      }
      throw err;
    }
  }
}
