import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CatalogApi, VehicleStore } from '../../../core/catalog';
import { Part } from '../../../core/models';
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
          Sélectionnez la marque, le modèle et l’année pour rechercher les pièces compatibles
          enregistrées par la boutique.
        </p>

        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label
              for="make"
              class="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/80"
            >
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
            <label
              for="model"
              class="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/80"
            >
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
            <label
              for="year"
              class="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/80"
            >
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

        @if (vehicles.loading()) {
          <p class="mt-3 text-sm text-white/80">Chargement des véhicules…</p>
        }
        @if (vehicles.error()) {
          <p class="mt-3 text-sm text-white/80">
            Impossible de charger les véhicules.
            <button type="button" (click)="vehicles.load(true)" class="font-semibold underline">
              Réessayer
            </button>
          </p>
        }

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
            <span
              >🚗 Véhicule mémorisé : <strong>{{ v.make }} {{ v.model }} {{ v.year }}</strong></span
            >
            <a routerLink="/pieces" class="font-semibold text-accent underline">Voir ses pièces</a>
            <button
              type="button"
              (click)="clearSelection()"
              class="text-xs text-white/75 underline"
            >
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
            Recherches rapides
          </h2>
          <p class="text-sm text-muted">Lancez une recherche par type de pièce.</p>
        </div>
        <a routerLink="/pieces" class="text-sm font-semibold text-primary underline">Tout voir →</a>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        @for (cat of categoryCards; track cat.name) {
          <a
            routerLink="/pieces"
            [queryParams]="{ search: cat.query }"
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
              À découvrir pour {{ v.make }} {{ v.model }} {{ v.year }}
            } @else {
              Pièces à découvrir
            }
          </h2>
          <p class="text-sm text-muted">Prix affichés en FCFA, stock confirmé à la commande.</p>
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
      } @else if (featuredError()) {
        <div role="alert" class="rounded-xl border border-line bg-surface p-5 text-sm text-muted">
          Impossible de charger les pièces pour le moment.
          <button
            type="button"
            (click)="reloadFeatured()"
            class="font-semibold text-primary underline"
          >
            Réessayer
          </button>
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
  featuredError = signal(false);
  private featuredGeneration = 0;

  makes = computed(() => [...new Set(this.vehicles.all().map((v) => v.make))].sort());
  models = computed(() =>
    [
      ...new Set(
        this.vehicles
          .all()
          .filter((v) => v.make === this.make())
          .map((v) => v.model),
      ),
    ].sort(),
  );
  years = computed(() =>
    this.vehicles
      .all()
      .filter((v) => v.make === this.make() && v.model === this.model())
      .map((v) => v.year)
      .sort((a, b) => b - a),
  );

  selectedVehicle = computed(
    () =>
      this.vehicles
        .all()
        .find(
          (v) => v.make === this.make() && v.model === this.model() && v.year === this.year(),
        ) ?? null,
  );

  categoryCards = [
    { name: 'Freinage', query: 'frein', icon: '🛑' },
    { name: 'Filtres', query: 'filtre', icon: '🛢️' },
    { name: 'Amortisseurs', query: 'amortisseur', icon: '🔩' },
    { name: 'Batteries', query: 'batterie', icon: '🔋' },
    { name: 'Moteur', query: 'moteur', icon: '⚙️' },
    { name: 'Radiateurs', query: 'radiateur', icon: '❄️' },
    { name: 'Éclairage', query: 'ampoule', icon: '💡' },
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
      text: 'Suivez les instructions de la boutique et transmettez votre référence SMS pour vérification.',
    },
    {
      icon: '🚚',
      title: 'Suivi de commande',
      text: 'Retrouvez vos commandes et consultez leur statut depuis votre espace personnel.',
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
      desc: 'Vérifiez vos articles puis renseignez votre numéro Mobile Money.',
    },
    {
      num: 3,
      title: 'Envoyez la référence OM / MoMo',
      desc: 'Suivez les instructions fournies, puis saisissez la référence reçue par SMS.',
    },
    {
      num: 4,
      title: 'Suivez la commande',
      desc: 'Après vérification manuelle du paiement, suivez les changements de statut.',
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
    const generation = ++this.featuredGeneration;
    this.loadingFeatured.set(true);
    this.featuredError.set(false);
    this.catalogApi.parts({ page: 1, vehicle_id: vehicleId }).subscribe({
      next: (r) => {
        if (generation !== this.featuredGeneration) return;
        this.featuredParts.set(r.data.filter((part) => part.stock > 0).slice(0, 4));
        this.loadingFeatured.set(false);
      },
      error: () => {
        if (generation !== this.featuredGeneration) return;
        this.featuredError.set(true);
        this.loadingFeatured.set(false);
      },
    });
  }

  reloadFeatured() {
    this.loadFeatured(this.vehicles.selected()?.id ?? null);
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
