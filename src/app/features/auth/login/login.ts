import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth';
import { ToastStore } from '../../../core/toast';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, ThemeToggle],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4 py-8">
      <div class="fixed right-4 top-4"><app-theme-toggle /></div>

      <div class="w-full max-w-md space-y-4">
        <form
          (ngSubmit)="submit()"
          class="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8"
        >
          <a routerLink="/" class="mb-4 inline-block font-display text-2xl font-bold text-primary">
            AUTO<span class="text-accent">CARWAT</span>
          </a>
          <h1 class="mb-1 font-display text-3xl font-bold text-primary">Connexion</h1>
          <p class="mb-5 text-sm text-muted">Accédez à votre espace client ou administrateur AutoCarWat.</p>

          <label class="mb-1 block text-sm font-medium" for="email">Adresse e-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            [(ngModel)]="email"
            required
            autocomplete="email"
            placeholder="exemple@domaine.cm"
            class="mb-4 h-12 w-full rounded-lg border border-line bg-bg px-3"
          />

          <label class="mb-1 block text-sm font-medium" for="password">Mot de passe</label>
          <div class="relative mb-4">
            <input
              id="password"
              name="password"
              [type]="showPassword() ? 'text' : 'password'"
              [(ngModel)]="password"
              required
              autocomplete="current-password"
              class="h-12 w-full rounded-lg border border-line bg-bg px-3 pr-24"
            />
            <button
              type="button"
              (click)="showPassword.set(!showPassword())"
              class="absolute right-2 top-2 h-8 rounded px-2 text-sm text-primary underline"
            >
              {{ showPassword() ? 'Masquer' : 'Afficher' }}
            </button>
          </div>

          @if (error()) {
            <p
              role="alert"
              class="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
            >
              {{ error() }}
            </p>
          }

          <button
            type="submit"
            [disabled]="loading() || !email.trim() || !password"
            class="h-12 w-full rounded-lg bg-action font-semibold text-on-action transition hover:brightness-105 disabled:opacity-60"
          >
            {{ loading() ? 'Connexion…' : 'Se connecter' }}
          </button>

          <p class="mt-4 text-center text-sm text-muted">
            Pas encore de compte ?
            <a
              routerLink="/inscription"
              [queryParams]="redirect() ? { redirect: redirect() } : null"
              class="font-semibold text-primary underline"
            >
              Créer un compte
            </a>
          </p>
        </form>

        <!-- Accès rapide démo -->
        <div class="rounded-2xl border border-line bg-surface p-4 text-xs">
          <p class="mb-2 font-semibold text-muted">Accès rapide (comptes de test) :</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              (click)="fillDemo('client')"
              class="rounded-lg border border-line bg-bg px-3 py-2 text-left hover:border-action"
            >
              <span class="block font-semibold text-text">👤 Compte Client</span>
              <span class="text-muted">client&#64;autocarwat.cm</span>
            </button>
            <button
              type="button"
              (click)="fillDemo('admin')"
              class="rounded-lg border border-line bg-bg px-3 py-2 text-left hover:border-action"
            >
              <span class="block font-semibold text-text">🛡️ Compte Admin</span>
              <span class="text-muted">admin&#64;autocarwat.cm</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class Login {
  private auth = inject(AuthStore);
  private router = inject(Router);
  private toast = inject(ToastStore);

  redirect = input<string>();

  email = '';
  password = '';
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

  fillDemo(role: 'client' | 'admin') {
    if (role === 'admin') {
      this.email = 'admin@autocarwat.cm';
      this.password = 'Admin123456';
    } else {
      this.email = 'client@autocarwat.cm';
      this.password = 'Client123456';
    }
    this.submit();
  }

  submit() {
    if (!this.email.trim() || !this.password) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: u => {
        this.toast.success(`Bienvenue, ${u.name} !`);
        const target = this.redirect();
        if (target && target.startsWith('/')) {
          this.router.navigateByUrl(target);
        } else {
          this.router.navigate([u.is_admin ? '/admin' : '/']);
        }
      },
      error: (e: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(
          e.status === 429
            ? 'Trop de tentatives. Réessayez dans une minute.'
            : e.status === 0
              ? 'Impossible de joindre le serveur.'
              : (e.error?.message ?? 'Identifiants invalides ou erreur serveur.'),
        );
      },
    });
  }
}
