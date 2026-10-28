import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth';
import { DemoModeService } from '../../core/demo-mode';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeToggle],
  template: `
    <div class="flex min-h-screen">
      <!-- Sidebar Desktop -->
      <aside class="hidden w-64 shrink-0 flex-col bg-[#0B1B2B] p-4 text-white md:flex">
        <a routerLink="/admin" class="mb-1 font-display text-2xl font-bold tracking-wide">
          AUTO<span class="text-accent">CARWAT</span>
        </a>
        <div
          class="mb-6 inline-block w-fit rounded bg-action px-2 py-0.5 text-xs font-bold text-on-action"
        >
          ADMINISTRATION
        </div>

        <nav class="flex flex-1 flex-col gap-1">
          @for (l of links; track l.path) {
            <a
              [routerLink]="l.path"
              routerLinkActive="bg-white/15 font-semibold"
              [routerLinkActiveOptions]="{ exact: l.path === '/admin' }"
              class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-white/10"
            >
              <span aria-hidden="true">{{ l.icon }}</span>
              <span>{{ l.label }}</span>
            </a>
          }
        </nav>

        <div class="mt-6 border-t border-white/15 pt-4 text-xs text-white/70">
          <p class="truncate font-semibold text-white">{{ auth.user()?.name }}</p>
          <p class="truncate">{{ auth.user()?.email }}</p>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        @if (demo.isActive()) {
          <div class="bg-amber-400 px-4 py-1 text-xs font-medium text-[#0F1B2A]">
            ⚡ Mode démo actif — Les validations de paiements, statuts de commandes et modifications
            du catalogue sont enregistrés localement.
          </div>
        }

        <header
          class="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface px-4 py-3"
        >
          <button
            type="button"
            (click)="mobileOpen.set(!mobileOpen())"
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line text-lg md:hidden"
            aria-label="Menu administration"
          >
            {{ mobileOpen() ? '✕' : '☰' }}
          </button>

          <span class="flex-1 font-display text-xl font-bold text-primary"
            >Espace administration</span
          >

          <app-theme-toggle />
          <a
            routerLink="/"
            class="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-action"
          >
            ← Boutique
          </a>
          <button
            type="button"
            (click)="auth.logout()"
            class="rounded-lg bg-action px-3 py-2 text-sm font-semibold text-on-action"
          >
            Déconnexion
          </button>
        </header>

        @if (mobileOpen()) {
          <nav
            class="flex flex-col gap-1 border-b border-line bg-[#0B1B2B] p-3 text-white md:hidden"
          >
            @for (l of links; track l.path) {
              <a
                [routerLink]="l.path"
                (click)="mobileOpen.set(false)"
                routerLinkActive="bg-white/15 font-semibold"
                [routerLinkActiveOptions]="{ exact: l.path === '/admin' }"
                class="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
              >
                <span aria-hidden="true">{{ l.icon }}</span>
                <span>{{ l.label }}</span>
              </a>
            }
          </nav>
        }

        <main class="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AdminLayout {
  auth = inject(AuthStore);
  demo = inject(DemoModeService);
  mobileOpen = signal(false);

  links = [
    { path: '/admin', label: 'Tableau de bord', icon: '📊' },
    { path: '/admin/paiements', label: 'Paiements Mobile Money', icon: '💳' },
    { path: '/admin/commandes', label: 'Commandes clients', icon: '📦' },
    { path: '/admin/catalogue', label: 'Catalogue & Véhicules', icon: '⚙️' },
  ];
}
