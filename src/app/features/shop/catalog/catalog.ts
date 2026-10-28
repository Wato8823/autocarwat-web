import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { CatalogApi, VehicleStore } from '../../../core/catalog';
import { Paginated, Part } from '../../../core/models';
import { PartCard } from '../../../shared/part-card/part-card';

@Component({
  selector: 'app-catalog',
  imports: [FormsModule, RouterLink, PartCard],
  template: `
    <div class="mb-4">
      <h1 class="font-display text-4xl font-bold text-primary">Catalogue des pièces</h1>
      <p class="text-sm text-muted">
        Recherchez par désignation, référence ou numéro constructeur (OEM).
      </p>
    </div>
    @if (vehicles.selected(); as v) {
      <div
        class="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
      >
        <span
          >{{ filterByVehicle() ? '✓ Filtré pour' : '🚗 Véhicule enregistré :' }}
          <strong>{{ v.make }} {{ v.model }} {{ v.year }}</strong></span
        >
        <button
          type="button"
          (click)="toggleVehicleFilter()"
          class="ml-auto font-semibold underline"
        >
          {{ filterByVehicle() ? 'Voir toutes les pièces' : 'Filtrer pour mon véhicule' }}</button
        ><a routerLink="/" class="underline">Changer de véhicule</a>
      </div>
    }
    <div class="mb-6 rounded-xl border border-line bg-surface p-4">
      <label for="q" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted"
        >Recherche</label
      >
      <div class="flex flex-col gap-2 sm:flex-row">
        <input
          id="q"
          type="search"
          [ngModel]="q()"
          (ngModelChange)="onSearch($event)"
          placeholder="Ex. plaquettes, filtre, 04465-02220…"
          class="h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3.5 text-sm"
        /><button
          type="button"
          (click)="resetFilters()"
          class="h-11 rounded-lg border border-line bg-bg px-4 text-sm font-semibold hover:border-action"
        >
          Réinitialiser
        </button>
      </div>
    </div>
    @if (error()) {
      <p
        role="alert"
        class="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
      >
        {{ error() }}
        <button type="button" (click)="reload$.next()" class="font-semibold underline">
          Réessayer
        </button>
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
      @if (!r.data.length) {
        <div class="rounded-xl border border-line bg-surface p-8 text-center">
          <p class="text-lg font-semibold">Aucune pièce ne correspond à votre recherche.</p>
          <p class="mt-1 text-sm text-muted">
            Essayez un autre mot-clé ou désactivez le filtre véhicule.
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
      }
      @if (r.meta.last_page > 1) {
        <nav class="mt-8 flex items-center justify-center gap-4" aria-label="Pagination">
          <button
            type="button"
            (click)="go(page() - 1)"
            [disabled]="page() <= 1"
            class="h-11 rounded-lg border border-line bg-surface px-4 text-sm font-medium disabled:opacity-40"
          >
            ← Précédent</button
          ><span class="num text-sm">Page {{ r.meta.current_page }} / {{ r.meta.last_page }}</span
          ><button
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
  `,
})
export class Catalog {
  private api = inject(CatalogApi);
  vehicles = inject(VehicleStore);
  query = input<string>('', { alias: 'search' });
  q = signal('');
  page = signal(1);
  filterByVehicle = signal(true);
  loading = signal(true);
  error = signal('');
  result = signal<Paginated<Part> | null>(null);
  skeleton = Array.from({ length: 8 }, (_, i) => i);
  private search$ = new Subject<void>();
  reload$ = new Subject<void>();

  constructor() {
    this.search$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => {
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
      .subscribe((result) => {
        this.result.set(result);
        this.loading.set(false);
      });
    effect(() => {
      const incoming = this.query();
      untracked(() => {
        this.q.set(incoming);
        this.page.set(1);
        this.reload$.next();
      });
    });
  }
  onSearch(value: string) {
    this.q.set(value);
    this.search$.next();
  }
  toggleVehicleFilter() {
    this.filterByVehicle.update((value) => !value);
    this.page.set(1);
    this.reload$.next();
  }
  resetFilters() {
    this.q.set('');
    this.filterByVehicle.set(false);
    this.page.set(1);
    this.reload$.next();
  }
  go(page: number) {
    if (page < 1) return;
    this.page.set(page);
    this.reload$.next();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
