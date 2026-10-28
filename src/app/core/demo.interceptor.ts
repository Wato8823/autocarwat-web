import { HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { DemoModeService } from './demo-mode';

/** La simulation est chargée uniquement sur demande, jamais en cas d'erreur de l'API. */
export const demoInterceptor: HttpInterceptorFn = (req, next) => {
  if (!(req.url === environment.apiUrl || req.url.startsWith(`${environment.apiUrl}/`)))
    return next(req);
  const demo = inject(DemoModeService);
  if (!demo.available || !demo.isActive()) return next(req);
  const injector = inject(Injector);
  return from(import('./demo-backend')).pipe(
    switchMap((module) => injector.get(module.DemoBackendService).handle(req)),
  );
};
