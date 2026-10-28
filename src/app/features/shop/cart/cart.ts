import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth';
import { CartStore } from '../../../core/cart';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, FcfaPipe],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 class="font-display text-4xl font-bold text-primary">Mon panier</h1>
        <p class="text-sm text-muted">Vérifiez vos pièces et leurs quantités avant de commander.</p>
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
          Parcourez notre catalogue pour ajouter les pièces dont vous avez besoin.
        </p>
        <a
          routerLink="/pieces"
          class="mt-6 inline-flex h-12 items-center rounded-lg bg-action px-6 font-semibold text-on-action"
          >Parcourir le catalogue</a
        >
      </div>
    } @else {
      <div class="grid gap-6 lg:grid-cols-12">
        <div class="space-y-4 lg:col-span-8">
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
                    loading="lazy"
                    class="h-full w-full object-cover"
                  />
                } @else {
                  <div class="flex h-full items-center justify-center text-2xl" aria-hidden="true">
                    ⚙️
                  </div>
                }
              </a>
              <div class="min-w-0 flex-1">
                <p class="text-xs uppercase tracking-wide text-muted">
                  {{ item.part.brand }} · Réf. {{ item.part.reference }}
                </p>
                <h2 class="font-semibold leading-snug">
                  <a [routerLink]="['/pieces', item.part.id]" class="hover:underline">{{
                    item.part.name
                  }}</a>
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
                    [attr.aria-label]="'Diminuer la quantité de ' + item.part.name"
                  >
                    −
                  </button>
                  <span class="num w-9 text-center text-sm font-semibold">{{ item.quantity }}</span>
                  <button
                    type="button"
                    (click)="cart.setQuantity(item.part.id, item.quantity + 1)"
                    [disabled]="item.quantity >= item.part.stock"
                    class="h-full w-9 font-bold disabled:opacity-40"
                    [attr.aria-label]="'Augmenter la quantité de ' + item.part.name"
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
        <aside class="lg:col-span-4">
          <div class="sticky top-20 rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <h2 class="mb-4 font-display text-2xl font-bold text-primary">Récapitulatif</h2>
            <div class="flex justify-between border-t border-line pt-4 font-bold">
              <span>Total estimé ({{ cart.totalItems() }})</span
              ><span class="num text-xl text-primary">{{ cart.subtotal() | fcfa }}</span>
            </div>
            <p class="mt-3 text-xs text-muted">
              Prix et stock sont confirmés par la boutique au moment de la commande.
            </p>
            <a
              routerLink="/commande"
              class="mt-5 flex h-12 w-full items-center justify-center rounded-lg bg-action font-semibold text-on-action transition hover:brightness-105"
              >{{ auth.isLoggedIn() ? 'Passer la commande →' : 'Se connecter & commander →' }}</a
            >
            <a
              routerLink="/pieces"
              class="mt-3 block text-center text-sm text-muted underline hover:text-primary"
              >Continuer mes achats</a
            >
          </div>
        </aside>
      </div>
    }
  `,
})
export class Cart {
  cart = inject(CartStore);
  auth = inject(AuthStore);
}
