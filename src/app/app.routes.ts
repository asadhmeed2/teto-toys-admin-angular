import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';
import { authRedirectGuard } from './shared/guards/auth-redirect.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./modules/landing').then((m) => m.LandingPageComponent),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () => import('./modules/auth').then((m) => m.LoginPageComponent),
    canActivate: [authRedirectGuard],
  },
  { path: '**', redirectTo: '' },
];
