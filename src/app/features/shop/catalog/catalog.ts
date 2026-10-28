import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { CatalogApi, VehicleStore } from '../../../core/catalog';
import { PART_CATEGORIES, Paginated, Part, PartSort } from '../../../core/models';
import { PartCard } from '../../../shared/part-card/part-card';

@Component({
  selector: 'app-catalog',
  imports: [FormsModule, RouterLink, PartCard],
  template: `
    <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 class="font-display text-4xl font-bold text-primary">Catalogue des pièces</h1>
        <p class="text-sm text-muted">
          Recherchez par désignation, référence AutoCarWat ou numéro constructeur (OEM).
        </p>
      </div>
    </div>

    <!-- Véhicule mémorisé -->
    @if (vehicles.selected(); as v) {
      <div
        class="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
      >
        <span>
          @if (filterByVehicle()) {
            ✓ Filtré pour <strong>{{ v.make }} {{ v.model }} {{ v.year }}</strong>
          } @else {
            🚗 Véhicule enregistré : <strong>{{ v.make }} {{ v.model }} {{ v.year }}</strong> (filtre désactivé)
          }
        </span>
        <button
          type="button"
          (click)="toggleVehicleFilter()"
          class="ml-auto font-semibold underline"
        >
          {{ filterByVehicle() ? 'Voir toutes les pièces' : 'Filtrer pour mon véhicule' }}
        </button>
        <a routerLink="/" class="underline">Changer de véhicule</a>
      </div>
    }

    <!-- Barre de recherche & Filtres -->
    <div class="mb-6 rounded-xl border border-line bg-surface p-4">
      <div class="grid gap-3 md:grid-cols-12">
        <div class="md:col-span-5">
          <label for="q" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Recherche
          </label>
          <input
            id="q"
            type="search"
            [ngModel]="q()"
            (ngModelChange)="onSearch($event)"
            placeholder="Ex. plaquettes, filtre, 04465-02220…"
            class="h-11 w-full rounded-lg border border-line bg-bg px-3.5 text-sm"
          />
        </div>

        <div class="md:col-span-3">
          <label for="cat" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Catégorie
          </label>
          <select
            id="cat"
            [ngModel]="selectedCategory()"
            (ngModelChange)="setCategory($event)"
            class="h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
          >
            <option value="">Toutes les catégories</option>
            @for (c of categories; track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </div>

        <div class="md:col-span-2">
          <label for="sort" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Trier par
          </label>
          <select
            id="sort"
            [ngModel]="sort()"
            (ngModelChange)="setSort($event)"
            class="h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
          >
            <option value="newest">Plus récents</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="name_asc">Nom (A – Z)</option>
          </select>
        </div>

        <div class="flex items-end md:col-span-2">
          <label
            class="flex h-11 w-full cursor-pointer items-center gap-2 rounded-lg border border-line bg-bg px-3 text-sm font-medium"
          >
            <input
              type="checkbox"
              [ngModel]="onlyInStock()"
              (ngModelChange)="setOnlyInStock($event)"
              class="h-4 w-4 accent-[#F26A0F]"
            />
            <span>En stock</span>
          </label>
        </div>
      </div>

      @if (hasActiveFilters()) {
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs">
          <div class="flex flex-wrap items-center gap-2">
            @if (selectedCategory()) {
              <span class="rounded-full bg-bg px-2.5 py-1 font-medium">
                Catégorie : {{ selectedCategory() }}
              </span>
            }
            @if (onlyInStock()) {
              <span class="rounded-full bg-bg px-2.5 py-1 font-medium">En stock uniquement</span>
            }
            @if (q()) {
              <span class="rounded-full bg-bg px-2.5 py-1 font-medium">Recherche : « {{ q() }} »</span>
            }
          </div>
          <button
            type="button"
            (click)="resetFilters()"
            class="font-semibold text-primary underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      }
    </div>

    @if (error()) {
      <p
        role="alert"
        class="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
      >
        {{ error() }}
      </p>
    }

    @if (loading()) {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
        @for (i of skeleton; track i) {
          <div class="h-80 animate-pulse rounded-xl border border-line bg-surface"></div>
        }
      </div>
    } @else if (result(); as r) {
      <p class="num mb-3 text-sm text-muted">{{ r.meta.total }} pièce(s) trouvée(s)</p>

      @if (r.data.length === 0) {
        <div class="rounded-xl border border-line bg-surface p-8 text-center">
          <p class="text-lg font-semibold">Aucune pièce ne correspond à votre recherche.</p>
          <p class="mt-1 text-sm text-muted">
            Essayez un autre mot-clé, retirez le filtre de catégorie ou désactivez le filtre véhicule.
          </p>
          <button
            type="button"
            (click)="resetFilters()"
            class="mt-4 h-11 rounded-lg bg-action px-5 text-sm font-semibold text-on-action"
          >
            Afficher tout le catalogue
          </button>
        </div>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (p of r.data; track p.id) {
            <app-part-card [part]="p" />
          }
        </div>

        @if (r.meta.last_page > 1) {
          <nav class="mt-8 flex items-center justify-center gap-4" aria-label="Pagination">
            <button
              type="button"
              (click)="go(page() - 1)"
              [disabled]="page() <= 1"
              class="h-11 rounded-lg border border-line bg-surface px-4 text-sm font-medium disabled:opacity-40"
            >
              ← Précédent
            </button>
            <span class="num text-sm">Page {{ r.meta.current_page }} / {{ r.meta.last_page }}</span>
            <button
              type="button"
              (click)="go(page() + 1)"
              [disabled]="page() >= r.meta.last_page"
              class="h-11 rounded-lg border border-line bg-surface px-4 text-sm font-medium disabled:opacity-40"
            >
              Suivant →
            </button>
          </nav>
        }
      }
    }
  `,
})
export class Catalog {
  private api = inject(CatalogApi);
  vehicles = inject(VehicleStore);

  /** Query param ?category=... lié via withComponentInputBinding() */
  category = input<string>();

  categories = PART_CATEGORIES;
  q = signal('');
  selectedCategory = signal('');
  sort = signal<PartSort>('newest');
  onlyInStock = signal(false);
  page = signal(1);
  filterByVehicle = signal(true);
  loading = signal(true);
  error = signal('');
  result = signal<Paginated<Part> | null>(null);
  skeleton = Array.from({ length: 8 }, (_, i) => i);

  private search$ = new Subject<string>();
  private reload$ = new Subject<void>();

  constructor() {
    this.search$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(v => {
      this.q.set(v);
      this.page.set(1);
      this.reload$.next();
    });

    this.reload$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap(() =>
          this.api
            .parts({
              search: this.q(),
              category: this.selectedCategory(),
              in_stock: this.onlyInStock(),
              sort: this.sort(),
              page: this.page(),
              vehicle_id: this.filterByVehicle() ? this.vehicles.selected()?.id : null,
            })
            .pipe(
              catchError(() => {
                this.error.set('Impossible de charger le catalogue. Vérifiez votre connexion.');
                return of(null);
              }),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(r => {
        if (r) this.result.set(r);
        this.loading.set(false);
      });

    effect(() => {
      const incomingCat = this.category() ?? '';
      untracked(() => {
        this.selectedCategory.set(incomingCat);
        this.page.set(1);
        this.reload$.next();
      });
    });
  }

  hasActiveFilters(): boolean {
    return !!this.q().trim() || !!this.selectedCategory() || this.onlyInStock();
  }

  onSearch(v: string) {
    this.search$.next(v);
  }

  setCategory(c: string) {
    this.selectedCategory.set(c);
    this.page.set(1);
    this.reload$.next();
  }

  setSort(s: PartSort) {
    this.sort.set(s);
    this.page.set(1);
    this.reload$.next();
  }

  setOnlyInStock(on: boolean) {
    this.onlyInStock.set(on);
    this.page.set(1);
    this.reload$.next();
  }

  toggleVehicleFilter() {
    this.filterByVehicle.set(!this.filterByVehicle());
    this.page.set(1);
    this.reload$.next();
  }

  resetFilters() {
    this.q.set('');
    this.selectedCategory.set('');
    this.onlyInStock.set(false);
    this.sort.set('newest');
    this.filterByVehicle.set(false);
    this.page.set(1);
    this.reload$.next();
  }

  go(p: number) {
    this.page.set(p);
    this.reload$.next();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
