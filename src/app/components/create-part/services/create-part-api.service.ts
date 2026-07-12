import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { parseHttpError } from '../../../shared/utils/error';
import { API_BASE_URL } from '../../../shared/config/api.config';

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
  private readonly baseUrl = `${API_BASE_URL}/api/admin/parts`;

  async createPart(request: CreatePartRequest): Promise<CreatePartResponse> {
    try {
      // ponytail: standard POST withCredentials for API call
      return await firstValueFrom(
        this.http.post<CreatePartResponse>(this.baseUrl, request, { withCredentials: true })
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to create part');
    }
  }
}
