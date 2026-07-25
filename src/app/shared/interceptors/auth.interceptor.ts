import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@shared/services/auth.service';
import { AdminAuthApiService } from '@modules/auth/services/admin-auth-api.service';
import { BehaviorSubject, throwError, from, EMPTY } from 'rxjs';
import { catchError, filter, switchMap, take, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

// Module-level flag shared across all interceptor invocations.
// Using authService.isRefreshing (same object) keeps proactive + reactive in sync.
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const authApiService = inject(AdminAuthApiService);
  const router = inject(Router);

  const token = authService.token();
  if (token) {
    req = addTokenHeader(req, token);
  }

  return next(req).pipe(
    catchError((error) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/api/auth/login') &&
        !req.url.includes('/api/auth/refresh')
      ) {
        return handle401Error(req, next, authService, authApiService, router);
      }
      return throwError(() => error);
    })
  );
};

function addTokenHeader(request: HttpRequest<unknown>, token: string) {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  authApiService: AdminAuthApiService,
  router: Router,
) {
  if (!authService.isRefreshing) {
    // Mark refresh in progress — blocks both this path and the proactive timer
    authService.isRefreshing = true;
    refreshTokenSubject.next(null);

    return from(authApiService.refreshAccessToken()).pipe(
      switchMap((res) => {
        authService.setToken(res.access_token, res.expires_in);
        refreshTokenSubject.next(res.access_token);
        return next(addTokenHeader(request, res.access_token));
      }),
      catchError((err) => {
        // Refresh token is invalid/expired → real logout
        authService.clearToken();
        router.navigate(['/login']);
        return throwError(() => err);
      }),
      finalize(() => {
        // Always reset the flag — prevents it from getting stuck if the subscriber
        // is cancelled (component destroyed, navigation, etc.)
        authService.isRefreshing = false;
      }),
    );
  }

  // Another refresh is already in flight — queue behind it
  return refreshTokenSubject.pipe(
    filter((token) => token !== null),
    take(1),
    switchMap((token) => next(addTokenHeader(request, token!))),
  );
}
