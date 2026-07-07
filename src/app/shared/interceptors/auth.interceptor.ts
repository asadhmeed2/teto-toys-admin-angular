import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AdminAuthApiService } from '../../modules/auth/services/admin-auth-api.service';
import { BehaviorSubject, throwError, from } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';

let isRefreshing = false;
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
        !req.url.includes('/api/auth/me')
      ) {
        return handle401Error(req, next, authService, authApiService, router);
      }
      return throwError(() => error);
    })
  );
};

function addTokenHeader(request: HttpRequest<any>, token: string) {
  return request.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
}

function handle401Error(
  request: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  authApiService: AdminAuthApiService,
  router: Router
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return from(authApiService.refreshAccessToken()).pipe(
      switchMap((res) => {
        isRefreshing = false;
        authService.setToken(res.access_token);
        refreshTokenSubject.next(res.access_token);
        return next(addTokenHeader(request, res.access_token));
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.clearToken();
        router.navigate(['/login']);
        return throwError(() => err);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => next(addTokenHeader(request, token!)))
    );
  }
}
