
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthStore } from './auth';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  // On ne touche qu'aux requêtes vers notre API
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  const auth = inject(AuthStore);
  let headers = req.headers.set('Accept', 'application/json');
  const token = auth.token();
  if (token) headers = headers.set('Authorization', `Bearer ${token}`);

  return next(req.clone({ headers })).pipe(
    catchError((err: HttpErrorResponse) => {
      // Token expiré ou révoqué (hors tentative de connexion)
      if (err.status === 401 && !req.url.endsWith('/login')) {
        auth.logout(false);
      }
      return throwError(() => err);
    }),
  );
};
