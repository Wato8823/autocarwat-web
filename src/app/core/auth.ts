import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { DemoModeService } from './demo-mode';

export interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private http = inject(HttpClient);
  private router = inject(Router);
  private demo = inject(DemoModeService);
  private api = environment.apiUrl;
  // Un jeton de démonstration ne doit jamais être envoyé à l'API réelle, même dans un autre onglet.
  private tokenKey = this.demo.isActive() ? 'autocarwat_demo_token' : 'token';

  readonly token = signal<string | null>(this.readToken());
  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => !!this.token());
  readonly isAdmin = computed(() => !!this.user()?.is_admin);

  login(email: string, password: string) {
    return this.http.post<{ token: string }>(`${this.api}/login`, { email, password }).pipe(
      tap((r) => this.setToken(r.token)),
      switchMap(() => this.loadUser()),
      catchError((error) => {
        this.clear();
        return throwError(() => error);
      }),
    );
  }

  register(data: { name: string; email: string; password: string; password_confirmation: string }) {
    return this.http.post<{ token: string }>(`${this.api}/register`, data).pipe(
      tap((r) => this.setToken(r.token)),
      switchMap(() => this.loadUser()),
      catchError((error) => {
        this.clear();
        return throwError(() => error);
      }),
    );
  }

  loadUser() {
    return this.http.get<User>(`${this.api}/me`).pipe(tap((u) => this.user.set(u)));
  }
  restore() {
    return this.token() ? this.loadUser() : null;
  }

  logout(callApi = true) {
    if (callApi && this.token())
      this.http.post(`${this.api}/logout`, {}).subscribe({ error: () => {} });
    this.clear();
    this.router.navigate(['/connexion']);
  }

  clear() {
    try {
      localStorage.removeItem(this.tokenKey);
    } catch {}
    this.token.set(null);
    this.user.set(null);
  }
  private readToken(): string | null {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch {
      return null;
    }
  }
  private setToken(token: string) {
    try {
      localStorage.setItem(this.tokenKey, token);
    } catch {}
    this.token.set(token);
  }
}
