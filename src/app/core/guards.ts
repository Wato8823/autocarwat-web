import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  return auth.isLoggedIn()
    ? true
    : inject(Router).createUrlTree(['/connexion'], {
        queryParams: state.url && state.url !== '/' ? { redirect: state.url } : undefined,
      });
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/connexion'], { queryParams: { redirect: '/admin' } });
  return auth.isAdmin() ? true : router.createUrlTree(['/']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  if (!auth.isLoggedIn()) return true;
  return inject(Router).createUrlTree([auth.isAdmin() ? '/admin' : '/']);
};
