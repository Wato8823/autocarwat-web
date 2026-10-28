import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-shop-layout',
  imports: [RouterOutlet, RouterLink, ThemeToggle],
  template: `
    <header class="sticky top-0 z-10 bg-primary text-white dark:text-text">
      <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <a routerLink="/" class="font-display text-2xl font-bold tracking-wide">
          AUTO<span class="text-accent">WERWAT</span>
        </a>

        <!-- Lien ajouté, juste après le logo -->
        <a routerLink="/pieces" class="ml-4 hidden text-sm font-medium hover:underline sm:inline">
          Catalogue
        </a>

        <span class="flex-1"></span>
        <app-theme-toggle />

        @if (auth.isLoggedIn()) {
          <span class="hidden text-sm sm:inline">{{ auth.user()?.name }}</span>
          <button (click)="auth.logout()" class="rounded-lg border border-white/40 px-3 py-2 text-sm">
            Déconnexion
          </button>
        } @else {
          <a routerLink="/inscription"
             class="hidden rounded-lg border border-white/40 px-3 py-2 text-sm sm:inline">
            S'inscrire
          </a>
          <a routerLink="/connexion"
             class="rounded-lg bg-action px-4 py-2 font-semibold text-on-action">Connexion</a>
        }
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6"><router-outlet /></main>
  `,
})
export class ShopLayout {
  auth = inject(AuthStore);
}
