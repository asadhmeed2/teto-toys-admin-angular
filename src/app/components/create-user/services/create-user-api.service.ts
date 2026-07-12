import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { parseHttpError } from '../../../shared/utils/error';
import { API_BASE_URL } from '../../../shared/config/api.config';

export interface CreateUserRequest {
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface CreateUserResponse {
  admin_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

@Injectable()
export class CreateUserApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/api/admin/users`;

  async createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      // ponytail: standard POST withCredentials for API call
      return await firstValueFrom(
        this.http.post<CreateUserResponse>(this.baseUrl, request, { withCredentials: true })
      );
    } catch (err) {
      throw parseHttpError(err, 'Failed to create user');
    }
  }
}
