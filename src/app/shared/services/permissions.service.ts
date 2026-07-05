import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface UserPermissions {
  userCreation: boolean;
}

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8081/api/auth';

  // ponytail: simple signal to hold permissions state
  private readonly _permissions = signal<UserPermissions | null>(null);
  readonly permissions = this._permissions.asReadonly();

  async fetchPermissions(): Promise<UserPermissions> {
    try {
      const perms = await firstValueFrom(
        this.http.get<UserPermissions>(`${this.baseUrl}/permissions`, { withCredentials: true })
      );
      this._permissions.set(perms);
      return perms;
    } catch (err) {
      this._permissions.set(null);
      throw err;
    }
  }

  clearPermissions(): void {
    this._permissions.set(null);
  }
}
