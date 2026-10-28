import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth';
import { CartStore } from '../../../core/cart';
import { CAMEROON_CITIES, FREE_SHIPPING_THRESHOLD } from '../../../core/models';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-cart',
  imports: [FormsModule, RouterLink, FcfaPipe],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 class="font-display text-4xl font-bold text-primary">Mon panier</h1>
        <p class="text-sm text-muted">
          Vérifiez vos pièces et estimez vos frais de livraison avant de commander.
        </p>
      </div>
      @if (!cart.isEmpty()) {
        <button
          type="button"
          (click)="cart.clear()"
          class="text-sm font-medium text-red-600 underline dark:text-red-400"
        >
          Vider le panier
        </button>
      }
    </div>

    @if (cart.isEmpty()) {
      <div class="rounded-2xl border border-line bg-surface p-10 text-center">
        <div class="mb-3 text-5xl" aria-hidden="true">🛒</div>
        <h2 class="font-display text-2xl font-bold text-primary">Votre panier est vide</h2>
        <p class="mx-auto mt-1 max-w-md text-sm text-muted">
          Sélectionnez votre véhicule ou parcourez notre catalogue pour ajouter les pièces dont vous avez besoin.
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <a
            routerLink="/pieces"
            class="inline-flex h-12 items-center rounded-lg bg-action px-6 font-semibold text-on-action"
          >
            Parcourir le catalogue
          </a>
          <a
            routerLink="/"
            class="inline-flex h-12 items-center rounded-lg border border-line bg-bg px-6 font-semibold"
          >
            Choisir mon véhicule
          </a>
        </div>
      </div>
    } @else {
      <div class="grid gap-6 lg:grid-cols-12">
        <!-- Liste des articles -->
        <div class="space-y-4 lg:col-span-8">
          <!-- Barre livraison offerte -->
          <div class="rounded-xl border border-line bg-surface p-4 text-sm">
            @if (cart.amountUntilFreeShipping() === 0) {
              <p class="font-semibold text-emerald-700 dark:text-emerald-400">
                🎉 Félicitations ! Vous bénéficiez de la <strong>livraison gratuite</strong> partout au Cameroun.
              </p>
            } @else {
              <p class="text-muted">
                Ajoutez encore
                <strong class="num text-text">{{ cart.amountUntilFreeShipping() | fcfa }}</strong>
                d’achats pour profiter de la <strong>livraison offerte</strong> (dès {{ freeThreshold | fcfa }}).
              </p>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-bg">
                <div
                  class="h-full rounded-full bg-action transition-all"
                  [style.width.%]="shippingProgress()"
                ></div>
              </div>
            }
          </div>

          @for (item of cart.items(); track item.part.id) {
            <article
              class="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-center"
            >
              <a
                [routerLink]="['/pieces', item.part.id]"
                class="block h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-bg"
              >
                @if (item.part.image_url) {
                  <img
                    [src]="item.part.image_url"
                    [alt]="item.part.name"
                    class="h-full w-full object-cover"
                  />
                } @else {
                  <div class="flex h-full items-center justify-center text-2xl">⚙️</div>
                }
              </a>

              <div class="min-w-0 flex-1">
                <p class="text-xs uppercase tracking-wide text-muted">
                  {{ item.part.brand }} · Réf. {{ item.part.reference }}
                </p>
                <h2 class="font-semibold leading-snug">
                  <a [routerLink]="['/pieces', item.part.id]" class="hover:underline">
                    {{ item.part.name }}
                  </a>
                </h2>
                <p class="num mt-1 text-sm text-muted">
                  Prix unitaire : <strong class="text-text">{{ item.part.price | fcfa }}</strong>
                </p>
              </div>

              <div class="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <div class="inline-flex h-10 items-center rounded-lg border border-line bg-bg">
                  <button
                    type="button"
                    (click)="cart.setQuantity(item.part.id, item.quantity - 1)"
                    class="h-full w-9 font-bold"
                    aria-label="Diminuer la quantité"
                  >
                    −
                  </button>
                  <span class="num w-9 text-center text-sm font-semibold">{{ item.quantity }}</span>
                  <button
                    type="button"
                    (click)="cart.setQuantity(item.part.id, item.quantity + 1)"
                    [disabled]="item.quantity >= item.part.stock"
                    class="h-full w-9 font-bold disabled:opacity-40"
                    aria-label="Augmenter la quantité"
                  >
                    +
                  </button>
                </div>

                <div class="text-right">
                  <p class="num text-lg font-bold text-primary">
                    {{ item.part.price * item.quantity | fcfa }}
                  </p>
                  <button
                    type="button"
                    (click)="cart.remove(item.part.id)"
                    class="text-xs text-red-600 underline dark:text-red-400"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            </article>
          }
        </div>

        <!-- Récapitulatif -->
        <aside class="lg:col-span-4">
          <div class="sticky top-20 rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <h2 class="mb-4 font-display text-2xl font-bold text-primary">Récapitulatif</h2>

            <label for="city" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              Ville de livraison (estimation)
            </label>
            <select
              id="city"
              [ngModel]="city()"
              (ngModelChange)="city.set($event)"
              class="mb-1 h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
            >
              @for (c of cities; track c.name) {
                <option [value]="c.name">{{ c.name }} ({{ c.delay }})</option>
              }
            </select>

            <dl class="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
              <div class="flex justify-between">
                <dt class="text-muted">Sous-total ({{ cart.totalItems() }} article(s))</dt>
                <dd class="num font-semibold">{{ cart.subtotal() | fcfa }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-muted">Livraison ({{ city() }})</dt>
                <dd class="num font-semibold">
                  @if (shipping() === 0) {
                    <span class="text-emerald-700 dark:text-emerald-400">Offerte</span>
                  } @else {
                    {{ shipping() | fcfa }}
                  }
                </dd>
              </div>
              <div class="flex justify-between border-t border-line pt-3 text-base font-bold">
                <dt>Total TTC</dt>
                <dd class="num text-xl text-primary">{{ total() | fcfa }}</dd>
              </div>
            </dl>

            <a
              routerLink="/commande"
              class="mt-5 flex h-12 w-full items-center justify-center rounded-lg bg-action font-semibold text-on-action transition hover:brightness-105"
            >
              {{ auth.isLoggedIn() ? 'Passer la commande →' : 'Se connecter & commander →' }}
            </a>

            <a
              routerLink="/pieces"
              class="mt-3 block text-center text-sm text-muted underline hover:text-primary"
            >
              Continuer mes achats
            </a>
          </div>
        </aside>
      </div>
    }
  `,
})
export class Cart {
  cart = inject(CartStore);
  auth = inject(AuthStore);

  cities = CAMEROON_CITIES;
  freeThreshold = FREE_SHIPPING_THRESHOLD;
  city = signal(CAMEROON_CITIES[0].name);

  shipping = computed(() => this.cart.shippingFor(this.city()));
  total = computed(() => this.cart.subtotal() + this.shipping());
  shippingProgress = computed(() =>
    Math.min(100, Math.round((this.cart.subtotal() / FREE_SHIPPING_THRESHOLD) * 100)),
  );
}
