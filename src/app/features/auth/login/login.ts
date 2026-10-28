import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthStore } from '../../../core/auth';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-login',
  imports: [FormsModule, ThemeToggle],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4">
      <div class="absolute right-4 top-4"><app-theme-toggle /></div>
      <form (ngSubmit)="submit()" class="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h1 class="mb-1 font-display text-3xl font-bold text-primary">Connexion</h1>
        <p class="mb-5 text-muted">Accédez à votre compte Autowerwat.</p>

        <label class="mb-1 block text-sm font-medium" for="email">Adresse e-mail</label>
        <input id="email" name="email" type="email" [(ngModel)]="email" required autocomplete="email"
          class="mb-4 h-12 w-full rounded-lg border border-line bg-bg px-3" />

        <label class="mb-1 block text-sm font-medium" for="password">Mot de passe</label>
        <input id="password" name="password" type="password" [(ngModel)]="password" required
          autocomplete="current-password"
          class="mb-4 h-12 w-full rounded-lg border border-line bg-bg px-3" />

        @if (error()) {
          <p role="alert" class="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-800">{{ error() }}</p>
        }

        <button type="submit" [disabled]="loading()"
          class="h-12 w-full rounded-lg bg-action font-semibold text-on-action disabled:opacity-60">
          {{ loading() ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
    </div>
  `,
})
export class Login {
  private auth = inject(AuthStore);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  submit() {
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: u => this.router.navigate([u.is_admin ? '/admin' : '/']),
      error: (e: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(
          e.status === 429 ? 'Trop de tentatives. Réessayez dans une minute.'
          : e.status === 0 ? 'Impossible de joindre le serveur.'
          : (e.error?.message ?? 'Une erreur est survenue.'));
      },
    });
  }
}
