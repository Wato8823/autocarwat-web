import { provideBrowserGlobalErrorListeners } from '@angular/core';
import {ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding} from '@angular/router';
import { firstValueFrom, catchError, of } from 'rxjs';
import { routes } from './app.routes';
import { apiInterceptor } from './core/api.interceptor';
import { AuthStore } from './core/auth';


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideAppInitializer(() => {
      const obs = inject(AuthStore).restore();
      return obs ? firstValueFrom(obs.pipe(catchError(() => of(null)))) : undefined;
    }),
  ]
};
