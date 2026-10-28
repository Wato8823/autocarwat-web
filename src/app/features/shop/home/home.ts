import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CatalogApi, VehicleStore } from '../../../core/catalog';
import { PART_CATEGORIES, Part } from '../../../core/models';
import { PartCard } from '../../../shared/part-card/part-card';

@Component({
  selector: 'app-home',
  imports: [FormsModule, RouterLink, PartCard],
  template: `
    <!-- Hero Sélecteur de Véhicule -->
    <section
      class="relative overflow-hidden rounded-2xl bg-[#0F2A43] p-6 text-white shadow-md sm:p-10"
    >
      <div class="relative z-10">
        <p class="mb-1 text-xs font-bold uppercase tracking-widest text-accent">
          AutoCarWat Cameroun · Pièces détachées neuves
        </p>
        <h1 class="mb-2 font-display text-4xl font-bold leading-tight sm:text-5xl">
          Quel est votre véhicule ?
        </h1>
        <p class="mb-6 max-w-xl text-white/85">
          Sélectionnez la marque, le modèle et l’année pour afficher uniquement les pièces 100 % compatibles.
        </p>

        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label for="make" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/80">
              1. Marque
            </label>
            <select
              id="make"
              [ngModel]="make()"
              (ngModelChange)="setMake($event)"
              class="h-12 w-full rounded-lg bg-white px-3 font-medium text-[#0F1B2A]"
            >
              <option value="">Choisir une marque…</option>
              @for (m of makes(); track m) {
                <option [value]="m">{{ m }}</option>
              }
            </select>
          </div>

          <div>
            <label for="model" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/80">
              2. Modèle
            </label>
            <select
              id="model"
              [ngModel]="model()"
              (ngModelChange)="setModel($event)"
              [disabled]="!make()"
              class="h-12 w-full rounded-lg bg-white px-3 font-medium text-[#0F1B2A] disabled:opacity-60"
            >
              <option value="">Choisir un modèle…</option>
              @for (m of models(); track m) {
                <option [value]="m">{{ m }}</option>
              }
            </select>
          </div>

          <div>
            <label for="year" class="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/80">
              3. Année
            </label>
            <select
              id="year"
              [ngModel]="year()"
              (ngModelChange)="year.set($event)"
              [disabled]="!model()"
              class="num h-12 w-full rounded-lg bg-white px-3 font-medium text-[#0F1B2A] disabled:opacity-60"
            >
              <option [ngValue]="null">Choisir l’année…</option>
              @for (y of years(); track y) {
                <option [ngValue]="y">{{ y }}</option>
              }
            </select>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            (click)="find()"
            [disabled]="!selectedVehicle()"
            class="h-12 rounded-lg bg-action px-6 font-semibold text-on-action transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Trouver mes pièces compatibles →
          </button>
          <a
            routerLink="/pieces"
            (click)="clear()"
            class="text-sm font-medium text-white/90 underline hover:text-white"
          >
            Parcourir tout le catalogue
          </a>
        </div>

        @if (vehicles.selected(); as v) {
          <div
            class="mt-5 inline-flex flex-wrap items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm"
          >
            <span>🚗 Véhicule mémorisé : <strong>{{ v.make }} {{ v.model }} {{ v.year }}</strong></span>
            <a routerLink="/pieces" class="font-semibold text-accent underline">Voir ses pièces</a>
            <button type="button" (click)="clearSelection()" class="text-xs text-white/75 underline">
              Effacer
            </button>
          </div>
        }
      </div>
    </section>

    <!-- Catégories principales -->
    <section class="mt-10">
      <div class="mb-4 flex items-end justify-between gap-2">
        <div>
          <h2 class="font-display text-2xl font-bold text-primary sm:text-3xl">
            Explorer par catégorie
          </h2>
          <p class="text-sm text-muted">Accédez rapidement à la famille de pièces recherchée.</p>
        </div>
        <a routerLink="/pieces" class="text-sm font-semibold text-primary underline">Tout voir →</a>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        @for (cat of categoryCards; track cat.name) {
          <a
            routerLink="/pieces"
            [queryParams]="{ category: cat.name }"
            class="themed flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-4 text-center transition hover:-translate-y-0.5 hover:border-action hover:shadow-sm"
          >
            <span class="text-3xl" aria-hidden="true">{{ cat.icon }}</span>
            <span class="text-xs font-semibold leading-snug">{{ cat.name }}</span>
          </a>
        }
      </div>
    </section>

    <!-- Pièces populaires / compatibles -->
    <section class="mt-10">
      <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 class="font-display text-2xl font-bold text-primary sm:text-3xl">
            @if (vehicles.selected(); as v) {
              Pièces populaires pour {{ v.make }} {{ v.model }} {{ v.year }}
            } @else {
              Pièces les plus demandées
            }
          </h2>
          <p class="text-sm text-muted">Disponibilité immédiate et prix affichés en FCFA.</p>
        </div>
        <a routerLink="/pieces" class="text-sm font-semibold text-primary underline">
          Voir tout le catalogue →
        </a>
      </div>

      @if (loadingFeatured()) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="h-80 animate-pulse rounded-xl border border-line bg-surface"></div>
          }
        </div>
      } @else if (featuredParts().length > 0) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          @for (p of featuredParts(); track p.id) {
            <app-part-card [part]="p" />
          }
        </div>
      }
    </section>

    <!-- Arguments & fonctionnement -->
    <section class="mt-12 grid gap-4 sm:grid-cols-3">
      @for (a of arguments; track a.title) {
        <div class="rounded-xl border border-line bg-surface p-5">
          <div class="mb-2 text-3xl" aria-hidden="true">{{ a.icon }}</div>
          <h2 class="font-display text-xl font-bold text-primary">{{ a.title }}</h2>
          <p class="mt-1 text-sm text-muted">{{ a.text }}</p>
        </div>
      }
    </section>

    <section class="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <h2 class="mb-5 font-display text-2xl font-bold text-primary sm:text-3xl">
        Comment commander sur AutoCarWat ?
      </h2>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        @for (step of steps; track step.num) {
          <div class="flex flex-col gap-1.5">
            <span
              class="num inline-flex h-8 w-8 items-center justify-center rounded-full bg-action text-sm font-bold text-on-action"
            >
              {{ step.num }}
            </span>
            <h3 class="font-semibold">{{ step.title }}</h3>
            <p class="text-sm text-muted">{{ step.desc }}</p>
          </div>
        }
      </div>
    </section>
  `,
})
export class Home {
  vehicles = inject(VehicleStore);
  private catalogApi = inject(CatalogApi);
  private router = inject(Router);

  make = signal('');
  model = signal('');
  year = signal<number | null>(null);
  featuredParts = signal<Part[]>([]);
  loadingFeatured = signal(true);

  makes = computed(() => [...new Set(this.vehicles.all().map(v => v.make))].sort());
  models = computed(() =>
    [...new Set(this.vehicles.all().filter(v => v.make === this.make()).map(v => v.model))].sort(),
  );
  years = computed(() =>
    this.vehicles
      .all()
      .filter(v => v.make === this.make() && v.model === this.model())
      .map(v => v.year)
      .sort((a, b) => b - a),
  );

  selectedVehicle = computed(
    () =>
      this.vehicles
        .all()
        .find(v => v.make === this.make() && v.model === this.model() && v.year === this.year()) ??
      null,
  );

  categoryCards = [
    { name: PART_CATEGORIES[0], icon: '🛑' },
    { name: PART_CATEGORIES[1], icon: '🛢️' },
    { name: PART_CATEGORIES[2], icon: '🔩' },
    { name: PART_CATEGORIES[3], icon: '🔋' },
    { name: PART_CATEGORIES[4], icon: '⚙️' },
    { name: PART_CATEGORIES[5], icon: '❄️' },
    { name: PART_CATEGORIES[6], icon: '💡' },
  ];

  arguments = [
    {
      icon: '✅',
      title: 'Compatibilité vérifiée',
      text: 'Chaque pièce est rattachée aux motorisations et années exactes pour éviter toute erreur au montage.',
    },
    {
      icon: '📱',
      title: 'Orange Money & MTN MoMo',
      text: 'Réglez sur nos comptes marchands officiels et transmettez votre référence ou capture de paiement.',
    },
    {
      icon: '🚚',
      title: 'Livraison partout au Cameroun',
      text: 'Coursier express à Douala et Yaoundé, expédition sécurisée en agence dans toutes les régions.',
    },
  ];

  steps = [
    {
      num: 1,
      title: 'Identifiez votre véhicule',
      desc: 'Indiquez marque, modèle et année ou cherchez par référence OEM.',
    },
    {
      num: 2,
      title: 'Validez votre panier',
      desc: 'Renseignez votre ville et votre adresse de livraison.',
    },
    {
      num: 3,
      title: 'Envoyez la référence OM / MoMo',
      desc: 'Effectuez le transfert Mobile Money puis saisissez l’ID de transaction ou joignez la capture.',
    },
    {
      num: 4,
      title: 'Suivez la livraison',
      desc: 'Dès validation par notre équipe, votre colis est préparé et expédié.',
    },
  ];

  constructor() {
    this.vehicles.load();
    const v = this.vehicles.selected();
    if (v) {
      this.make.set(v.make);
      this.model.set(v.model);
      this.year.set(v.year);
    }
    this.loadFeatured(v?.id ?? null);
  }

  private loadFeatured(vehicleId: number | null) {
    this.loadingFeatured.set(true);
    this.catalogApi.parts({ page: 1, per_page: 4, vehicle_id: vehicleId, in_stock: true }).subscribe({
      next: r => {
        this.featuredParts.set(r.data.slice(0, 4));
        this.loadingFeatured.set(false);
      },
      error: () => this.loadingFeatured.set(false),
    });
  }

  setMake(m: string) {
    this.make.set(m);
    this.model.set('');
    this.year.set(null);
  }

  setModel(m: string) {
    this.model.set(m);
    this.year.set(null);
  }

  find() {
    const v = this.selectedVehicle();
    if (!v) return;
    this.vehicles.select(v);
    this.router.navigate(['/pieces']);
  }

  clear() {
    this.vehicles.select(null);
  }

  clearSelection() {
    this.vehicles.select(null);
    this.make.set('');
    this.model.set('');
    this.year.set(null);
    this.loadFeatured(null);
  }
}
