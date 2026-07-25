import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './shared/interceptors/auth.interceptor';
import { AuthService } from './shared/services/auth.service';
import { AdminAuthApiService } from './modules/auth/services/admin-auth-api.service';

function initializeAuth(authService: AuthService, authApiService: AdminAuthApiService) {
  return () => {
    // Register the refresh function so AuthService can call it without a circular dep
    authService.registerRefreshFn(() => authApiService.refreshAccessToken());
    // Resume the proactive-refresh timer if the user already has a token from a previous session
    authService.resumeRefreshTimer();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService, AdminAuthApiService],
      multi: true,
    },
  ],
};
