import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  is_admin: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private http = inject(HttpClient);
  private router = inject(Router);
  private api = environment.apiUrl;

  readonly token = signal<string | null>(localStorage.getItem('token'));
  readonly user = signal<User | null>(null);
  readonly isLoggedIn = computed(() => !!this.token());
  readonly isAdmin = computed(() => !!this.user()?.is_admin);

  login(email: string, password: string) {
    return this.http.post<{ token: string }>(`${this.api}/login`, { email, password }).pipe(
      tap(r => this.setToken(r.token)),
      switchMap(() => this.loadUser()),
    );
  }

  register(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    password_confirmation: string;
  }) {
    return this.http.post<{ token: string }>(`${this.api}/register`, data).pipe(
      tap(r => this.setToken(r.token)),
      switchMap(() => this.loadUser()),
    );
  }

  loadUser() {
    return this.http.get<User>(`${this.api}/me`).pipe(tap(u => this.user.set(u)));
  }

  /** Au démarrage : recharge l'utilisateur si un token existe. */
  restore() {
    return this.token() ? this.loadUser() : null;
  }

  logout(callApi = true) {
    if (callApi && this.token()) {
      this.http.post(`${this.api}/logout`, {}).subscribe({ error: () => {} });
    }
    this.clear();
    this.router.navigate(['/connexion']);
  }

  clear() {
    localStorage.removeItem('token');
    this.token.set(null);
    this.user.set(null);
  }

  private setToken(t: string) {
    localStorage.setItem('token', t);
    this.token.set(t);
  }
}
