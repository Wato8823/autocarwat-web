import { Component, inject, signal } from '@angular/core';
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
    <h1 class="mb-4 font-display text-4xl font-bold text-primary">Catalogue</h1>

    <!-- Véhicule mémorisé -->
    @if (vehicles.selected(); as v) {
      <div class="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-green-300 bg-green-50 p-3 text-green-900">
        <span>✓ Pièces compatibles avec <strong>{{ v.make }} {{ v.model }} {{ v.year }}</strong></span>
        <button type="button" (click)="useVehicle(false)" class="ml-auto text-sm underline">
          {{ filterByVehicle() ? 'Voir toutes les pièces' : 'Filtrer par ce véhicule' }}
        </button>
        <a routerLink="/" class="text-sm underline">Changer de véhicule</a>
      </div>
    }

    <!-- Recherche -->
    <div class="mb-6">
      <label for="q" class="sr-only">Rechercher une pièce</label>
      <input id="q" type="search" [ngModel]="q()" (ngModelChange)="onSearch($event)"
        placeholder="Nom, référence ou numéro constructeur (OEM)…"
        class="h-12 w-full rounded-lg border border-line bg-surface px-4" />
    </div>

    @if (error()) {
      <p role="alert" class="mb-4 rounded-lg bg-red-100 p-3 text-red-800">{{ error() }}</p>
    }

    @if (loading()) {
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
        @for (i of skeleton; track i) {
          <div class="h-80 animate-pulse rounded-xl border border-line bg-surface"></div>
        }
      </div>
    } @else if (result(); as r) {
      <p class="mb-3 text-sm text-muted">{{ r.meta.total }} pièce(s) trouvée(s)</p>

      @if (r.data.length === 0) {
        <div class="rounded-xl border border-line bg-surface p-8 text-center">
          <p class="text-lg font-semibold">Aucune pièce ne correspond à votre recherche.</p>
          <p class="text-muted">Essayez un autre mot, ou retirez le filtre véhicule.</p>
        </div>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          @for (p of r.data; track p.id) { <app-part-card [part]="p" /> }
        </div>

        <nav class="mt-8 flex items-center justify-center gap-4" aria-label="Pagination">
          <button type="button" (click)="go(page() - 1)" [disabled]="page() <= 1"
            class="h-11 rounded-lg border border-line bg-surface px-4 disabled:opacity-40">← Précédent</button>
          <span class="num text-sm">Page {{ r.meta.current_page }} / {{ r.meta.last_page }}</span>
          <button type="button" (click)="go(page() + 1)" [disabled]="page() >= r.meta.last_page"
            class="h-11 rounded-lg border border-line bg-surface px-4 disabled:opacity-40">Suivant →</button>
        </nav>
      }
    }
  `,
})
export class Catalog {
  private api = inject(CatalogApi);
  vehicles = inject(VehicleStore);

  q = signal('');
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

    this.reload$.pipe(
      tap(() => { this.loading.set(true); this.error.set(''); }),
      switchMap(() => this.api.parts({
        search: this.q(),
        page: this.page(),
        vehicle_id: this.filterByVehicle() ? this.vehicles.selected()?.id : null,
      }).pipe(catchError(() => {
        this.error.set('Impossible de charger le catalogue. Vérifiez votre connexion.');
        return of(null);
      }))),
      takeUntilDestroyed(),
    ).subscribe(r => {
      if (r) this.result.set(r);
      this.loading.set(false);
    });

    this.reload$.next();
  }

  onSearch(v: string) { this.search$.next(v); }

  useVehicle(on: boolean) {
    this.filterByVehicle.set(on ? true : !this.filterByVehicle());
    this.page.set(1);
    this.reload$.next();
  }

  go(p: number) {
    this.page.set(p);
    this.reload$.next();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
