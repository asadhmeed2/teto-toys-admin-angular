import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

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
  private readonly baseUrl = 'http://localhost:8081/api/admin/users';

  async createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      // ponytail: standard POST withCredentials for API call
      return await firstValueFrom(
        this.http.post<CreateUserResponse>(this.baseUrl, request, { withCredentials: true })
      );
    } catch (err) {
      if (err instanceof HttpErrorResponse) {
        throw new Error(err.error?.error_description || err.error?.error || err.message || 'Failed to create user');
      }
      throw err;
    }
  }
}
