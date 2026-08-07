import { Component, HostListener, inject, signal } from '@angular/core';
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
  protected readonly isUsersMenuOpen = signal(false);
  protected readonly isLoggingOut = signal(false);

  // ponytail: exposed so child pages can read permissions from the shared layout
  protected readonly permissionsService = inject(PermissionsService);

  private readonly authService = inject(AuthService);
  private readonly authApiService = inject(AdminAuthApiService);
  private readonly router = inject(Router);

  /**
   * Closes whichever dropdown the click landed outside of.
   *
   * The toggle buttons live inside their own wrapper, so a click on one still
   * matches closest() and the menu it just opened is left alone — no need to
   * stopPropagation on the toggles.
   */
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('#create-menu-wrapper')) {
      this.isMenuOpen.set(false);
    }
    if (!target.closest('#users-menu-wrapper')) {
      this.isUsersMenuOpen.set(false);
    }
  }

  /** Escape closes both, matching the dropdowns elsewhere in the app. */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.isMenuOpen.set(false);
    this.isUsersMenuOpen.set(false);
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update(open => !open);
    this.isUsersMenuOpen.set(false);
  }

  protected toggleUsersMenu(): void {
    this.isUsersMenuOpen.update(open => !open);
    this.isMenuOpen.set(false);
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

  protected navigateToAdminUsers(): void {
    this.router.navigate(['/admin-users']);
  }

  protected navigateToUsers(): void {
    this.router.navigate(['/users']);
  }

  protected async logout(): Promise<void> {
    this.isLoggingOut.set(true);
    await this.authApiService.logout();
    this.authService.clearToken();
    this.permissionsService.clearPermissions();
    this.router.navigate(['/login']);
  }
}
