import { Injectable, inject, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AdminAuthApiService } from '../../modules/auth/services/admin-auth-api.service';

@Injectable({
  providedIn: 'root',
})
export class SessionInactivityService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly authApiService = inject(AdminAuthApiService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  private lastActivityTime = Date.now();
  private checkIntervalId?: any;

  // Defaults: 15 minutes in milliseconds
  private readonly INACTIVITY_LIMIT = 15 * 60 * 1000;

  constructor() {
    this.startTracking();
  }

  private startTracking(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Run outside Angular Zone to optimize performance by avoiding triggering change detection
    this.ngZone.runOutsideAngular(() => {
      const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'click', 'touchstart'];
      const updateActivity = () => {
        const timeSinceLastActivity = Date.now() - this.lastActivityTime;
        if (timeSinceLastActivity >= this.INACTIVITY_LIMIT) {
          this.ngZone.run(() => {
            this.checkSessionValidity();
          });
        }

        this.lastActivityTime = Date.now();
      };

      activityEvents.forEach((event) => {
        window.addEventListener(event, updateActivity, { passive: true });
      });
    });
  }

  private async checkSessionValidity(): Promise<void> {
    const token = this.authService.token();
    if (!token) {
      return;
    }

    try {
      await this.authApiService.me(token);
    } catch (error) {
      console.warn('Session is invalid or expired. Clearing token.', error);
      this.authService.clearToken();
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }
  }
}
