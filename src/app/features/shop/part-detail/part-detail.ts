import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartStore } from '../../../core/cart';
import { CatalogApi, VehicleStore } from '../../../core/catalog';
import { Part } from '../../../core/models';
import { ToastStore } from '../../../core/toast';
import { FcfaPipe } from '../../../shared/fcfa-pipe';
import { PartCard } from '../../../shared/part-card/part-card';

@Component({
  selector: 'app-part-detail',
  imports: [RouterLink, FcfaPipe, PartCard],
  template: `
    <!-- Fil d'Ariane -->
    <nav class="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted" aria-label="Fil d'Ariane">
      <a routerLink="/" class="hover:text-primary hover:underline">Accueil</a>
      <span>/</span>
      <a routerLink="/pieces" class="hover:text-primary hover:underline">Catalogue</a>
      @if (part()?.category) {
        <span>/</span>
        <a
          routerLink="/pieces"
          [queryParams]="{ category: part()!.category }"
          class="hover:text-primary hover:underline"
        >
          {{ part()!.category }}
        </a>
      }
      @if (part()) {
        <span>/</span>
        <span class="truncate font-medium text-text">{{ part()!.name }}</span>
      }
    </nav>

    @if (loading()) {
      <div class="grid gap-8 lg:grid-cols-2">
        <div class="aspect-[4/3] animate-pulse rounded-2xl border border-line bg-surface"></div>
        <div class="space-y-4">
          <div class="h-6 w-1/3 animate-pulse rounded bg-surface"></div>
          <div class="h-10 w-3/4 animate-pulse rounded bg-surface"></div>
          <div class="h-28 animate-pulse rounded-xl bg-surface"></div>
          <div class="h-14 animate-pulse rounded-xl bg-surface"></div>
        </div>
      </div>
    } @else if (error()) {
      <div class="rounded-2xl border border-line bg-surface p-8 text-center">
        <p class="mb-2 text-xl font-bold text-primary">{{ error() }}</p>
        <p class="mb-5 text-sm text-muted">Cette pièce n'existe plus ou a été déplacée.</p>
        <a
          routerLink="/pieces"
          class="inline-flex h-11 items-center rounded-lg bg-action px-5 font-semibold text-on-action"
        >
          ← Retourner au catalogue
        </a>
      </div>
    } @else if (part(); as p) {
      <div class="grid gap-8 lg:grid-cols-12">
        <!-- Visuel -->
        <div class="lg:col-span-6">
          <div class="overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
            <div class="aspect-[4/3] bg-bg">
              @if (p.image_url) {
                <img [src]="p.image_url" [alt]="p.name" class="h-full w-full object-cover" />
              } @else {
                <div class="flex h-full items-center justify-center text-6xl" aria-hidden="true">⚙️</div>
              }
            </div>
          </div>

          <!-- Véhicules compatibles -->
          @if (p.vehicles && p.vehicles.length > 0) {
            <div class="mt-6 rounded-2xl border border-line bg-surface p-5">
              <h2 class="mb-3 font-display text-xl font-bold text-primary">
                Véhicules compatibles ({{ p.vehicles.length }})
              </h2>
              <div class="flex flex-wrap gap-2">
                @for (v of p.vehicles; track v.id) {
                  <span
                    class="num rounded-lg border px-3 py-1 text-xs font-medium"
                    [class]="
                      vehicles.selected()?.id === v.id
                        ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                        : 'border-line bg-bg text-text'
                    "
                  >
                    {{ v.make }} {{ v.model }} {{ v.year }}
                  </span>
                }
              </div>
            </div>
          }
        </div>

        <!-- Informations & Achat -->
        <div class="flex flex-col gap-4 lg:col-span-6">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-muted">
              {{ p.brand || 'AutoCarWat' }} · {{ p.category || 'Pièce détachée' }}
            </p>
            <h1 class="mt-1 font-display text-3xl font-bold leading-tight text-primary sm:text-4xl">
              {{ p.name }}
            </h1>
          </div>

          <!-- Références -->
          <div class="flex flex-wrap items-center gap-3 text-sm">
            <span class="num rounded-lg border border-line bg-surface px-3 py-1.5">
              Réf. <strong>{{ p.reference }}</strong>
            </span>
            @if (p.oem_number) {
              <button
                type="button"
                (click)="copyRef(p.oem_number)"
                class="num rounded-lg border border-line bg-surface px-3 py-1.5 hover:border-action"
                title="Copier le numéro OEM"
              >
                OEM : <strong>{{ p.oem_number }}</strong> 📋
              </button>
            }
          </div>

          <!-- Alerte compatibilité véhicule client -->
          @if (vehicles.selected(); as sv) {
            @if (isCompatibleWithSelected(); as compat) {
              @if (compat === 'yes') {
                <div
                  class="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
                >
                  ✓ <strong>Compatible</strong> avec votre véhicule enregistré ({{ sv.make }} {{ sv.model }} {{ sv.year }}).
                </div>
              } @else if (compat === 'no') {
                <div
                  class="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
                >
                  ⚠️ Cette pièce n’est pas listée pour <strong>{{ sv.make }} {{ sv.model }} {{ sv.year }}</strong>. Vérifiez le numéro OEM avant commande.
                </div>
              }
            }
          }

          <!-- Carte Prix & Stock -->
          <div class="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <p class="num text-3xl font-extrabold text-primary">{{ p.price | fcfa }}</p>
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                [class]="stockBadge().cls"
              >
                <span aria-hidden="true">●</span> {{ stockBadge().label }}
              </span>
            </div>

            @if (p.stock > 0) {
              <div class="mt-5 flex flex-wrap items-center gap-3">
                <div class="inline-flex h-12 items-center rounded-lg border border-line bg-bg">
                  <button
                    type="button"
                    (click)="decQty()"
                    [disabled]="qty() <= 1"
                    class="h-full w-11 text-lg font-bold disabled:opacity-40"
                    aria-label="Diminuer la quantité"
                  >
                    −
                  </button>
                  <span class="num w-10 text-center font-semibold">{{ qty() }}</span>
                  <button
                    type="button"
                    (click)="incQty(p.stock)"
                    [disabled]="qty() >= p.stock"
                    class="h-full w-11 text-lg font-bold disabled:opacity-40"
                    aria-label="Augmenter la quantité"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  (click)="addToCart(p)"
                  class="h-12 flex-1 rounded-lg bg-action px-5 font-semibold text-on-action transition hover:brightness-105"
                >
                  Ajouter au panier
                </button>
              </div>

              <button
                type="button"
                (click)="buyNow(p)"
                class="mt-3 h-11 w-full rounded-lg border border-primary font-semibold text-primary hover:bg-primary hover:text-white dark:hover:text-[#0F1B2A]"
              >
                Commander immédiatement →
              </button>
            } @else {
              <p class="mt-4 text-sm text-muted">
                Cette référence est momentanément épuisée. Consultez les pièces équivalentes ci-dessous.
              </p>
            }
          </div>

          <!-- Description -->
          @if (p.description) {
            <div class="rounded-2xl border border-line bg-surface p-5">
              <h2 class="mb-2 font-display text-xl font-bold text-primary">Description technique</h2>
              <p class="text-sm leading-relaxed text-muted">{{ p.description }}</p>
            </div>
          }

          <!-- Réassurance Paiement & Livraison -->
          <div class="grid gap-3 rounded-2xl border border-line bg-surface p-5 text-sm sm:grid-cols-2">
            <div>
              <p class="font-semibold">📱 Paiement Mobile Money</p>
              <p class="mt-0.5 text-xs text-muted">
                Orange Money & MTN MoMo avec confirmation rapide de votre référence SMS.
              </p>
            </div>
            <div>
              <p class="font-semibold">🚚 Livraison rapide</p>
              <p class="mt-0.5 text-xs text-muted">
                24h à Douala, 24–48h à Yaoundé et expédition agence dans tout le pays.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Pièces similaires -->
      @if (related().length > 0) {
        <section class="mt-12">
          <h2 class="mb-4 font-display text-2xl font-bold text-primary">
            Pièces similaires ({{ p.category || 'Catalogue' }})
          </h2>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            @for (item of related(); track item.id) {
              <app-part-card [part]="item" />
            }
          </div>
        </section>
      }
    }
  `,
})
export class PartDetail {
  id = input.required<string>();

  private api = inject(CatalogApi);
  private cart = inject(CartStore);
  private toast = inject(ToastStore);
  private router = inject(Router);
  vehicles = inject(VehicleStore);

  part = signal<Part | null>(null);
  related = signal<Part[]>([]);
  qty = signal(1);
  loading = signal(true);
  error = signal('');

  stockBadge = computed(() => {
    const s = this.part()?.stock ?? 0;
    if (s <= 0)
      return {
        label: 'Rupture de stock',
        cls: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200',
      };
    if (s <= 5)
      return {
        label: `Plus que ${s} disponible(s)`,
        cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
      };
    return {
      label: `En stock (${s} disponibles)`,
      cls: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200',
    };
  });

  isCompatibleWithSelected = computed<'yes' | 'no' | null>(() => {
    const sv = this.vehicles.selected();
    const list = this.part()?.vehicles;
    if (!sv || !list || list.length === 0) return null;
    return list.some(v => v.id === sv.id) ? 'yes' : 'no';
  });

  constructor() {
    effect(() => {
      const partId = this.id();
      untracked(() => this.loadPart(partId));
    });
  }

  private loadPart(partId: string) {
    this.loading.set(true);
    this.error.set('');
    this.qty.set(1);

    this.api.part(partId).subscribe({
      next: p => {
        this.part.set(p);
        this.loading.set(false);
        this.api.parts({ category: p.category, page: 1, per_page: 5 }).subscribe({
          next: r => this.related.set(r.data.filter(x => x.id !== p.id).slice(0, 4)),
          error: () => {},
        });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Pièce introuvable.');
      },
    });
  }

  decQty() {
    this.qty.update(q => Math.max(1, q - 1));
  }

  incQty(max: number) {
    this.qty.update(q => Math.min(max, q + 1));
  }

  addToCart(p: Part) {
    if (this.cart.add(p, this.qty())) {
      this.toast.success(`${this.qty()} × « ${p.name} » ajouté au panier.`);
    } else {
      this.toast.info('Quantité maximale disponible déjà atteinte dans le panier.');
    }
  }

  buyNow(p: Part) {
    this.cart.add(p, this.qty());
    this.router.navigate(['/panier']);
  }

  copyRef(value: string) {
    navigator.clipboard?.writeText(value);
    this.toast.info(`Numéro OEM ${value} copié.`);
  }
}
