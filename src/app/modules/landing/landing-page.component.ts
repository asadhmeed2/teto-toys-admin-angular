import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { AdminAuthApiService } from '../auth/services/admin-auth-api.service';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  protected readonly isLoggingOut = signal(false);

  private readonly authService = inject(AuthService);
  private readonly apiService = inject(AdminAuthApiService);
  private readonly router = inject(Router);

  protected async logout(): Promise<void> {
    this.isLoggingOut.set(true);
    await this.apiService.logout();
    this.authService.clearToken();
    this.router.navigate(['/login']);
  }
}
