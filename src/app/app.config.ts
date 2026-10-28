import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';
import { routes } from './app.routes';
import { apiInterceptor } from './core/api.interceptor';
import { AuthStore } from './core/auth';
import { demoInterceptor } from './core/demo.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideHttpClient(withInterceptors([apiInterceptor, demoInterceptor])),
    provideAppInitializer(() => {
      const obs = inject(AuthStore).restore();
      return obs ? firstValueFrom(obs.pipe(catchError(() => of(null)))) : undefined;
    }),
  ],
};
