import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartStore } from '../../core/cart';
import { Part } from '../../core/models';
import { ToastStore } from '../../core/toast';
import { FcfaPipe } from '../fcfa-pipe';

@Component({
  selector: 'app-part-card',
  imports: [RouterLink, FcfaPipe],
  template: `
    <article
      class="themed flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface
             transition hover:-translate-y-0.5 hover:border-action hover:shadow-md"
    >
      <a [routerLink]="['/pieces', part().id]" class="relative block aspect-[4/3] overflow-hidden bg-bg">
        @if (part().image_url) {
          <img
            [src]="part().image_url"
            [alt]="part().name"
            loading="lazy"
            class="h-full w-full object-cover transition duration-300 hover:scale-105"
          />
        } @else {
          <div class="flex h-full items-center justify-center text-4xl" aria-hidden="true">⚙️</div>
        }
        @if (inCartQty() > 0) {
          <span
            class="num absolute right-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white shadow"
          >
            {{ inCartQty() }} au panier
          </span>
        }
      </a>

      <div class="flex flex-1 flex-col gap-2 p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">
          {{ part().brand || 'AutoCarWat' }} · {{ part().category || 'Pièce détachée' }}
        </p>
        <h3 class="line-clamp-2 font-semibold leading-snug">
          <a [routerLink]="['/pieces', part().id]" class="hover:text-primary hover:underline">
            {{ part().name }}
          </a>
        </h3>
        <p class="num text-xs text-muted">
          Réf. {{ part().reference }}
          @if (part().oem_number) {
            <span> · OEM {{ part().oem_number }}</span>
          }
        </p>

        <span
          class="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
          [class]="badge().cls"
        >
          <span aria-hidden="true">●</span> {{ badge().label }}
        </span>

        <p class="num mt-auto pt-2 text-xl font-bold text-primary">{{ part().price | fcfa }}</p>

        <div class="mt-1 flex gap-2">
          <a
            [routerLink]="['/pieces', part().id]"
            class="flex h-11 flex-1 items-center justify-center rounded-lg border border-line bg-bg px-3 text-sm font-semibold hover:border-action"
          >
            Détails
          </a>
          <button
            type="button"
            (click)="addToCart()"
            [disabled]="part().stock <= 0 || inCartQty() >= part().stock"
            class="flex h-11 flex-1 items-center justify-center rounded-lg bg-action px-3 text-sm font-semibold text-on-action transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {{ part().stock <= 0 ? 'Indisponible' : '+ Panier' }}
          </button>
        </div>
      </div>
    </article>
  `,
})
export class PartCard {
  part = input.required<Part>();
  private cart = inject(CartStore);
  private toast = inject(ToastStore);

  inCartQty = computed(() => this.cart.quantityOf(this.part().id));

  badge = computed(() => {
    const s = this.part().stock;
    if (s <= 0)
      return {
        label: 'Rupture de stock',
        cls: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200',
      };
    if (s <= 5)
      return {
        label: `Plus que ${s} en stock`,
        cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
      };
    return {
      label: 'En stock',
      cls: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200',
    };
  });

  addToCart() {
    const p = this.part();
    if (this.cart.add(p, 1)) {
      this.toast.success(`« ${p.name} » ajouté au panier.`);
    } else {
      this.toast.info('Quantité maximale en stock atteinte dans votre panier.');
    }
  }
}
