import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { PermissionsService } from '../../shared/services/permissions.service';
import { AdminAuthApiService } from '../auth/services/admin-auth-api.service';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit {
  protected readonly isLoggingOut = signal(false);
  protected readonly isMenuOpen = signal(false);
  protected readonly permissionsService = inject(PermissionsService);

  protected toggleMenu(): void {
    this.isMenuOpen.update(open => !open);
  }

  private readonly authService = inject(AuthService);
  private readonly apiService = inject(AdminAuthApiService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    try {
      if (!this.permissionsService.permissions()) {
        await this.permissionsService.fetchPermissions();
      }
    } catch {
      // best effort
    }
  }

  protected async logout(): Promise<void> {
    this.isLoggingOut.set(true);
    await this.apiService.logout();
    this.authService.clearToken();
    this.permissionsService.clearPermissions();
    this.router.navigate(['/login']);
  }

  protected navigateToCreateUser(): void {
    this.router.navigate(['/create-user']);
  }

  protected navigateToCreateProduct(): void {
    this.router.navigate(['/create-product']);
  }

  protected navigateToCreatePart(): void {
    this.router.navigate(['/create-part']);
  }

  protected navigateToCreateCategory(): void {
    this.router.navigate(['/create-category']);
  }

  protected navigateToCreateSubcategory(): void {
    this.router.navigate(['/create-subcategory']);
  }
}
