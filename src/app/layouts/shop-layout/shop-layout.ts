import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth';
import { CartStore } from '../../core/cart';
import { VehicleStore } from '../../core/catalog';
import { DemoModeService } from '../../core/demo-mode';
import { PaymentSessionStore } from '../../core/payment-session';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

@Component({
  selector: 'app-shop-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeToggle],
  template: `
    <div class="flex min-h-screen flex-col">
      @if (demo.isActive()) {
        <div class="bg-amber-400 px-4 py-1.5 text-xs font-medium text-[#0F1B2A]">
          <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <span>
              ⚡ <strong>Mode démo actif</strong> — données fictives : aucun paiement réel.
            </span>
            <div class="flex items-center gap-3">
              <button type="button" (click)="resetDemo()" class="underline hover:no-underline">
                Réinitialiser la démo
              </button>
              <button type="button" (click)="reconnect()" class="underline hover:no-underline">
                Réessayer l'API
              </button>
            </div>
          </div>
        </div>
      } @else if (demo.available) {
        <div class="bg-slate-100 px-4 py-1.5 text-center text-xs text-slate-700">
          Développement ·
          <button type="button" (click)="enableDemo()" class="font-semibold underline">
            Activer la démonstration (sans paiement réel)
          </button>
        </div>
      }

      <header class="sticky top-0 z-30 bg-[#0F2A43] text-white shadow-sm">
        <div class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <a routerLink="/" class="font-display text-2xl font-bold tracking-wide text-white">
            AUTO<span class="text-accent">CARWAT</span>
          </a>

          <nav class="ml-4 hidden items-center gap-1 md:flex">
            <a
              routerLink="/"
              routerLinkActive="bg-white/15"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10"
            >
              Accueil
            </a>
            <a
              routerLink="/pieces"
              routerLinkActive="bg-white/15"
              class="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10"
            >
              Catalogue
            </a>
            @if (auth.isLoggedIn()) {
              <a
                routerLink="/commandes"
                routerLinkActive="bg-white/15"
                class="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10"
              >
                Mes commandes
              </a>
            }
            @if (auth.isAdmin()) {
              <a
                routerLink="/admin"
                class="ml-1 rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent hover:bg-accent/30"
              >
                Admin
              </a>
            }
          </nav>

          <span class="flex-1"></span>

          @if (vehicles.selected(); as v) {
            <a
              routerLink="/pieces"
              title="Véhicule sélectionné"
              class="hidden items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium lg:inline-flex"
            >
              <span aria-hidden="true">🚗</span>
              <span>{{ v.make }} {{ v.model }} {{ v.year }}</span>
            </a>
          }

          <a
            routerLink="/panier"
            class="relative inline-flex h-11 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 text-sm font-semibold hover:bg-white/20"
            aria-label="Panier"
          >
            <span aria-hidden="true">🛒</span>
            <span class="hidden sm:inline">Panier</span>
            @if (cart.totalItems() > 0) {
              <span
                class="num inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-action px-1.5 text-xs font-bold text-on-action"
              >
                {{ cart.totalItems() }}
              </span>
            }
          </a>

          <app-theme-toggle />

          <div class="hidden items-center gap-2 md:flex">
            @if (auth.isLoggedIn()) {
              <span class="max-w-36 truncate text-sm text-white/90">{{ auth.user()?.name }}</span>
              <button
                type="button"
                (click)="auth.logout()"
                class="rounded-lg border border-white/40 px-3 py-2 text-sm hover:bg-white/10"
              >
                Déconnexion
              </button>
            } @else {
              <a
                routerLink="/inscription"
                class="rounded-lg border border-white/40 px-3 py-2 text-sm hover:bg-white/10"
              >
                S'inscrire
              </a>
              <a
                routerLink="/connexion"
                class="rounded-lg bg-action px-4 py-2 text-sm font-semibold text-on-action hover:brightness-105"
              >
                Connexion
              </a>
            }
          </div>

          <button
            type="button"
            (click)="mobileOpen.set(!mobileOpen())"
            class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/30 text-xl md:hidden"
            aria-label="Menu principal"
          >
            {{ mobileOpen() ? '✕' : '☰' }}
          </button>
        </div>

        @if (mobileOpen()) {
          <div class="border-t border-white/15 bg-[#0B2035] px-4 py-4 md:hidden">
            <nav class="flex flex-col gap-2">
              <a
                routerLink="/"
                (click)="mobileOpen.set(false)"
                class="rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Accueil
              </a>
              <a
                routerLink="/pieces"
                (click)="mobileOpen.set(false)"
                class="rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Catalogue des pièces
              </a>
              <a
                routerLink="/panier"
                (click)="mobileOpen.set(false)"
                class="rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Mon panier ({{ cart.totalItems() }})
              </a>
              @if (auth.isLoggedIn()) {
                <a
                  routerLink="/commandes"
                  (click)="mobileOpen.set(false)"
                  class="rounded-lg px-3 py-2 hover:bg-white/10"
                >
                  Mes commandes
                </a>
              }
              @if (auth.isAdmin()) {
                <a
                  routerLink="/admin"
                  (click)="mobileOpen.set(false)"
                  class="rounded-lg bg-accent/20 px-3 py-2 font-semibold text-accent"
                >
                  Espace Administration
                </a>
              }
              <hr class="my-1 border-white/15" />
              @if (auth.isLoggedIn()) {
                <p class="px-3 text-xs text-white/70">Connecté : {{ auth.user()?.name }}</p>
                <button
                  type="button"
                  (click)="mobileOpen.set(false); auth.logout()"
                  class="rounded-lg border border-white/30 px-3 py-2 text-left text-sm"
                >
                  Déconnexion
                </button>
              } @else {
                <div class="grid grid-cols-2 gap-2 pt-1">
                  <a
                    routerLink="/inscription"
                    (click)="mobileOpen.set(false)"
                    class="rounded-lg border border-white/40 py-2.5 text-center text-sm font-medium"
                  >
                    S'inscrire
                  </a>
                  <a
                    routerLink="/connexion"
                    (click)="mobileOpen.set(false)"
                    class="rounded-lg bg-action py-2.5 text-center text-sm font-semibold text-on-action"
                  >
                    Connexion
                  </a>
                </div>
              }
            </nav>
          </div>
        }
      </header>

      <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <router-outlet />
      </main>

      <footer class="mt-12 border-t border-line bg-surface">
        <div class="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <a routerLink="/" class="font-display text-2xl font-bold text-primary">
              AUTO<span class="text-accent">CARWAT</span>
            </a>
            <p class="mt-2 text-sm text-muted">
              Spécialiste des pièces détachées automobiles neuves d’origine et équivalentes au
              Cameroun.
            </p>
          </div>

          <div>
            <h2 class="mb-2 font-display text-lg font-bold text-primary">Navigation</h2>
            <ul class="space-y-1.5 text-sm text-muted">
              <li>
                <a routerLink="/" class="hover:text-primary hover:underline"
                  >Sélecteur de véhicule</a
                >
              </li>
              <li>
                <a routerLink="/pieces" class="hover:text-primary hover:underline"
                  >Catalogue complet</a
                >
              </li>
              <li>
                <a routerLink="/panier" class="hover:text-primary hover:underline">Mon panier</a>
              </li>
              <li>
                <a routerLink="/commandes" class="hover:text-primary hover:underline"
                  >Suivi de commandes</a
                >
              </li>
            </ul>
          </div>

          <div>
            <h2 class="mb-2 font-display text-lg font-bold text-primary">Paiement sécurisé</h2>
            <ul class="space-y-1.5 text-sm text-muted">
              <li>🟠 Orange Money Cameroun</li>
              <li>🟡 MTN Mobile Money (MoMo)</li>
              <li>✓ Vérification manuelle de référence SMS</li>
              <li>✓ Montant affiché en FCFA</li>
            </ul>
          </div>

          <div>
            <h2 class="mb-2 font-display text-lg font-bold text-primary">Votre commande</h2>
            <ul class="space-y-1.5 text-sm text-muted">
              <li>📦 Consultez le statut de vos commandes</li>
              <li>📱 Paiement depuis votre téléphone</li>
              <li>🔒 Ne partagez jamais votre code PIN</li>
              <li>
                <a routerLink="/commandes" class="hover:text-primary hover:underline"
                  >Accéder à mes commandes</a
                >
              </li>
            </ul>
          </div>
        </div>
        <div class="border-t border-line py-4 text-center text-xs text-muted">
          © 2026 AutoCarWat Cameroun — Tous droits réservés.
        </div>
      </footer>
    </div>
  `,
})
export class ShopLayout {
  auth = inject(AuthStore);
  cart = inject(CartStore);
  vehicles = inject(VehicleStore);
  demo = inject(DemoModeService);
  private paymentSessions = inject(PaymentSessionStore);

  mobileOpen = signal(false);

  enableDemo() {
    if (
      !confirm(
        'Activer la démonstration ? Votre session et votre panier actuels seront effacés. Aucun paiement réel ne sera effectué.',
      )
    )
      return;
    this.auth.clear();
    this.paymentSessions.clearAll();
    this.cart.clear();
    this.vehicles.select(null);
    this.demo.activate();
    window.location.assign('/');
  }

  resetDemo() {
    if (!confirm('Réinitialiser toutes les données de démonstration ?')) return;
    this.demo.resetDb();
    this.auth.clear();
    this.paymentSessions.clearAll();
    this.cart.clear();
    this.vehicles.select(null);
    window.location.assign('/');
  }

  reconnect() {
    this.demo.reconnectApi();
    this.auth.clear();
    this.paymentSessions.clearAll();
    this.cart.clear();
    this.vehicles.select(null);
    window.location.assign('/');
  }
}
