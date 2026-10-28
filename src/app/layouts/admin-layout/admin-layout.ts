import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeToggle],
  template: `
    <div class="flex min-h-screen">
      <aside class="hidden w-60 shrink-0 bg-[#0B1B2B] p-4 text-white md:block">
        <div class="mb-1 font-display text-2xl font-bold">AUTO<span class="text-accent">WERWAT</span></div>
        <div class="mb-6 inline-block rounded bg-action px-2 py-0.5 text-xs font-bold text-on-action">ADMIN</div>
        <nav class="flex flex-col gap-1">
          @for (l of links; track l.path) {
            <a [routerLink]="l.path" routerLinkActive="bg-white/15"
               [routerLinkActiveOptions]="{ exact: l.path === '/admin' }"
               class="rounded-lg px-3 py-2 hover:bg-white/10">{{ l.label }}</a>
          }
        </nav>
      </aside>
      <div class="flex-1">
        <header class="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <span class="flex-1 font-semibold">Espace administration</span>
          <app-theme-toggle />
          <a routerLink="/" class="text-sm underline">Voir la boutique</a>
          <button (click)="auth.logout()" class="rounded-lg border border-line px-3 py-2 text-sm">Déconnexion</button>
        </header>
        <main class="p-4"><router-outlet /></main>
      </div>
    </div>
  `,
})
export class AdminLayout {
  auth = inject(AuthStore);
  links = [
    { path: '/admin', label: 'Tableau de bord' },
    { path: '/admin/paiements', label: 'Paiements' },
    { path: '/admin/commandes', label: 'Commandes' },
    { path: '/admin/catalogue', label: 'Catalogue' },
  ];
}
