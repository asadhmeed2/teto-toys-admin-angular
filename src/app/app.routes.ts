import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';
import { authRedirectGuard } from './shared/guards/auth-redirect.guard';
import { adminGuard } from './shared/guards/admin.guard';

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
  {
    path: 'create-user',
    loadComponent: () =>
      import('./modules/users/components/create-user').then((m) => m.CreateUserComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'create-product',
    loadComponent: () =>
      import('./modules/products/forms/create-product').then((m) => m.CreateProductComponent),
    canActivate: [authGuard],
  },
  {
    path: 'create-part',
    loadComponent: () =>
      import('./modules/products/forms/create-part').then((m) => m.CreatePartComponent),
    canActivate: [authGuard],
  },
  {
    path: 'create-category',
    loadComponent: () =>
      import('./modules/products/forms/create-category').then((m) => m.CreateCategoryComponent),
    canActivate: [authGuard],
  },
  {
    path: 'create-subcategory',
    loadComponent: () =>
      import('./modules/products/forms/create-subcategory').then(
        (m) => m.CreateSubcategoryComponent,
      ),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
