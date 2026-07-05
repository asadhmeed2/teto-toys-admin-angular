import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionsService } from '../services/permissions.service';

export const adminGuard: CanActivateFn = async () => {
  const permissionsService = inject(PermissionsService);
  const router = inject(Router);

  try {
    let perms = permissionsService.permissions();
    if (!perms) {
      perms = await permissionsService.fetchPermissions();
    }
    // ponytail: check userCreation permission to restrict access
    return perms.userCreation ? true : router.createUrlTree(['']);
  } catch {
    return router.createUrlTree(['']);
  }
};
