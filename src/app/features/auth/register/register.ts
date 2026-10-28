import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { fieldErrors, globalError } from '../../../core/api-errors';
import { AuthStore } from '../../../core/auth';
import { ToastStore } from '../../../core/toast';
import { ThemeToggle } from '../../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink, ThemeToggle],
  template: `
    <div class="flex min-h-screen items-center justify-center px-4 py-8">
      <div class="fixed right-4 top-4"><app-theme-toggle /></div>

      <form
        (ngSubmit)="submit()"
        class="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8"
      >
        <a routerLink="/" class="mb-4 inline-block font-display text-2xl font-bold text-primary">
          AUTO<span class="text-accent">CARWAT</span>
        </a>
        <h1 class="mb-1 font-display text-3xl font-bold text-primary">Créer un compte</h1>
        <p class="mb-5 text-sm text-muted">Commandez vos pièces auto et suivez vos commandes.</p>

        <label class="mb-1 block text-sm font-medium" for="name">Nom complet</label>
        <input
          id="name"
          name="name"
          [ngModel]="name()"
          (ngModelChange)="name.set($event)"
          required
          autocomplete="name"
          placeholder="Ex. Jean-Marc Tchoumi"
          class="h-12 w-full rounded-lg border border-line bg-bg px-3"
        />
        @if (errors()['name']) {
          <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors()['name'] }}</p>
        }

        <label class="mb-1 mt-4 block text-sm font-medium" for="email">Adresse e-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          [ngModel]="email()"
          (ngModelChange)="email.set($event)"
          required
          autocomplete="email"
          placeholder="exemple@domaine.cm"
          class="h-12 w-full rounded-lg border border-line bg-bg px-3"
        />
        @if (errors()['email']) {
          <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors()['email'] }}</p>
        }

        <label class="mb-1 mt-4 block text-sm font-medium" for="password">Mot de passe</label>
        <div class="relative">
          <input
            id="password"
            name="password"
            [type]="show() ? 'text' : 'password'"
            [ngModel]="password()"
            (ngModelChange)="password.set($event)"
            required
            autocomplete="new-password"
            class="h-12 w-full rounded-lg border border-line bg-bg px-3 pr-24"
          />
          <button
            type="button"
            (click)="show.set(!show())"
            class="absolute right-2 top-2 h-8 rounded px-2 text-sm text-primary underline"
          >
            {{ show() ? 'Masquer' : 'Afficher' }}
          </button>
        </div>
        @if (errors()['password']) {
          <p class="mt-1 text-sm text-red-600 dark:text-red-400">{{ errors()['password'] }}</p>
        }

        <ul class="mt-2 space-y-1 text-sm" aria-live="polite">
          <li [class]="okLength() ? 'text-green-700 dark:text-green-400' : 'text-muted'">
            {{ okLength() ? '✓' : '○' }} 10 caractères minimum
          </li>
          <li [class]="okLetters() ? 'text-green-700 dark:text-green-400' : 'text-muted'">
            {{ okLetters() ? '✓' : '○' }} Au moins une lettre
          </li>
          <li [class]="okNumbers() ? 'text-green-700 dark:text-green-400' : 'text-muted'">
            {{ okNumbers() ? '✓' : '○' }} Au moins un chiffre
          </li>
        </ul>

        <label class="mb-1 mt-4 block text-sm font-medium" for="confirm"
          >Confirmer le mot de passe</label
        >
        <input
          id="confirm"
          name="confirm"
          [type]="show() ? 'text' : 'password'"
          [ngModel]="confirm()"
          (ngModelChange)="confirm.set($event)"
          required
          autocomplete="new-password"
          class="h-12 w-full rounded-lg border border-line bg-bg px-3"
        />
        @if (confirm() && !matches()) {
          <p class="mt-1 text-sm text-red-600 dark:text-red-400">
            Les mots de passe ne correspondent pas.
          </p>
        }

        @if (error()) {
          <p
            role="alert"
            class="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
          >
            {{ error() }}
          </p>
        }

        <button
          type="submit"
          [disabled]="loading() || !canSubmit()"
          class="mt-5 h-12 w-full rounded-lg bg-action font-semibold text-on-action transition hover:brightness-105 disabled:opacity-60"
        >
          {{ loading() ? 'Création…' : 'Créer mon compte' }}
        </button>

        <p class="mt-4 text-center text-sm text-muted">
          Déjà un compte ?
          <a
            routerLink="/connexion"
            [queryParams]="redirect() ? { redirect: redirect() } : null"
            class="font-semibold text-primary underline"
          >
            Se connecter
          </a>
        </p>
      </form>
    </div>
  `,
})
export class Register {
  private auth = inject(AuthStore);
  private router = inject(Router);
  private toast = inject(ToastStore);

  redirect = input<string>();

  name = signal('');
  email = signal('');
  password = signal('');
  confirm = signal('');
  show = signal(false);
  loading = signal(false);
  error = signal('');
  errors = signal<Record<string, string>>({});

  okLength = computed(() => this.password().length >= 10);
  okLetters = computed(() => /[A-Za-z]/.test(this.password()));
  okNumbers = computed(() => /\d/.test(this.password()));
  matches = computed(() => this.password() === this.confirm());
  canSubmit = computed(
    () =>
      !!this.name().trim() &&
      !!this.email().trim() &&
      this.okLength() &&
      this.okLetters() &&
      this.okNumbers() &&
      this.matches(),
  );

  submit() {
    if (!this.canSubmit()) return;
    this.loading.set(true);
    this.error.set('');
    this.errors.set({});

    this.auth
      .register({
        name: this.name().trim(),
        email: this.email().trim(),
        password: this.password(),
        password_confirmation: this.confirm(),
      })
      .subscribe({
        next: (u) => {
          this.toast.success(`Compte créé avec succès. Bienvenue ${u.name} !`);
          const target = this.redirect();
          if (target && target.startsWith('/')) {
            this.router.navigateByUrl(target);
          } else {
            this.router.navigate(['/']);
          }
        },
        error: (e: HttpErrorResponse) => {
          this.loading.set(false);
          this.errors.set(fieldErrors(e));
          this.error.set(globalError(e));
        },
      });
  }
}
