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
      import('./modules/products/forms/components/create-product').then(
        (m) => m.CreateProductComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'create-part',
    loadComponent: () =>
      import('./modules/products/forms/components/create-part').then((m) => m.CreatePartComponent),
    canActivate: [authGuard],
  },
  {
    path: 'create-category',
    loadComponent: () =>
      import('./modules/products/forms/components/create-category').then(
        (m) => m.CreateCategoryComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'create-subcategory',
    loadComponent: () =>
      import('./modules/products/forms/components/create-subcategory').then(
        (m) => m.CreateSubcategoryComponent,
      ),
    canActivate: [authGuard],
  },
  {
    // Admin-only: adminGuard checks the userCreation permission, which is Admin-exclusive.
    // The API independently enforces this, so a Partner hitting the URL gets a 403 either way.
    path: 'admin-users',
    loadComponent: () =>
      import('./modules/users/components/admin-users-list').then((m) => m.AdminUsersListComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    // Admin and Partner; the API sends Partners a reduced projection.
    path: 'users',
    loadComponent: () =>
      import('./modules/users/components/customers-list').then((m) => m.CustomersListComponent),
    canActivate: [authGuard],
  },
  {
    path: 'store-hours',
    loadComponent: () => import('./modules/store-hours').then((m) => m.StoreHoursComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
