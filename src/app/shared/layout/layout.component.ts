import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@shared/services/auth.service';
import { AdminAuthApiService } from '@modules/auth/services/admin-auth-api.service';
import { PermissionsService } from '@shared/services/permissions.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  protected readonly isMenuOpen = signal(false);
  protected readonly isLoggingOut = signal(false);

  // ponytail: exposed so child pages can read permissions from the shared layout
  protected readonly permissionsService = inject(PermissionsService);

  private readonly authService = inject(AuthService);
  private readonly authApiService = inject(AdminAuthApiService);
  private readonly router = inject(Router);

  protected toggleMenu(): void {
    this.isMenuOpen.update(open => !open);
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

  protected navigateToStoreHours(): void {
    this.router.navigate(['/store-hours']);
  }

  protected async logout(): Promise<void> {
    this.isLoggingOut.set(true);
    await this.authApiService.logout();
    this.authService.clearToken();
    this.permissionsService.clearPermissions();
    this.router.navigate(['/login']);
  }
}
