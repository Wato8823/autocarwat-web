import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { VehicleStore } from '../../../core/catalog';

@Component({
  selector: 'app-home',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="overflow-hidden rounded-2xl bg-primary p-6 text-white dark:text-text sm:p-10">
      <p class="mb-1 text-sm uppercase tracking-widest text-accent">Pièces auto</p>
      <h1 class="mb-2 font-display text-4xl font-bold sm:text-5xl">Quel est votre véhicule ?</h1>
      <p class="mb-6 max-w-xl opacity-90">
        Choisissez-le pour voir uniquement les pièces qui lui conviennent.
      </p>

      <div class="grid gap-3 sm:grid-cols-3">
        <div>
          <label for="make" class="mb-1 block text-sm">Marque</label>
          <select id="make" [ngModel]="make()" (ngModelChange)="setMake($event)"
            class="h-12 w-full rounded-lg bg-white px-3 text-[#0F1B2A]">
            <option value="">Choisir…</option>
            @for (m of makes(); track m) { <option [value]="m">{{ m }}</option> }
          </select>
        </div>
        <div>
          <label for="model" class="mb-1 block text-sm">Modèle</label>
          <select id="model" [ngModel]="model()" (ngModelChange)="setModel($event)" [disabled]="!make()"
            class="h-12 w-full rounded-lg bg-white px-3 text-[#0F1B2A] disabled:opacity-60">
            <option value="">Choisir…</option>
            @for (m of models(); track m) { <option [value]="m">{{ m }}</option> }
          </select>
        </div>
        <div>
          <label for="year" class="mb-1 block text-sm">Année</label>
          <select id="year" [ngModel]="year()" (ngModelChange)="year.set($event)" [disabled]="!model()"
            class="h-12 w-full rounded-lg bg-white px-3 text-[#0F1B2A] disabled:opacity-60">
            <option [ngValue]="null">Choisir…</option>
            @for (y of years(); track y) { <option [ngValue]="y">{{ y }}</option> }
          </select>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" (click)="find()" [disabled]="!selectedVehicle()"
          class="h-12 rounded-lg bg-action px-6 font-semibold text-on-action disabled:opacity-50">
          Trouver mes pièces
        </button>
        <a routerLink="/pieces" class="text-sm underline" (click)="clear()">
          Parcourir tout le catalogue
        </a>
      </div>

      @if (vehicles.selected(); as v) {
        <p class="mt-4 text-sm">Véhicule enregistré : <strong>{{ v.make }} {{ v.model }} {{ v.year }}</strong></p>
      }
    </section>

    <section class="mt-8 grid gap-4 sm:grid-cols-3">
      @for (a of arguments; track a.title) {
        <div class="rounded-xl border border-line bg-surface p-5">
          <div class="mb-2 text-3xl" aria-hidden="true">{{ a.icon }}</div>
          <h2 class="font-display text-xl font-bold text-primary">{{ a.title }}</h2>
          <p class="text-muted">{{ a.text }}</p>
        </div>
      }
    </section>
  `,
})
export class Home {
  vehicles = inject(VehicleStore);
  private router = inject(Router);

  make = signal('');
  model = signal('');
  year = signal<number | null>(null);

  makes = computed(() => [...new Set(this.vehicles.all().map(v => v.make))].sort());
  models = computed(() => [...new Set(
    this.vehicles.all().filter(v => v.make === this.make()).map(v => v.model))].sort());
  years = computed(() => this.vehicles.all()
    .filter(v => v.make === this.make() && v.model === this.model())
    .map(v => v.year).sort((a, b) => b - a));

  selectedVehicle = computed(() => this.vehicles.all()
    .find(v => v.make === this.make() && v.model === this.model() && v.year === this.year()) ?? null);

  arguments = [
    { icon: '✅', title: 'Pièces compatibles', text: 'Filtrées selon votre véhicule pour éviter les erreurs.' },
    { icon: '📱', title: 'Paiement Mobile Money', text: 'Orange Money et MTN MoMo, simple et sécurisé.' },
    { icon: '📦', title: 'Suivi de commande', text: 'Suivez chaque étape, du paiement à la livraison.' },
  ];

  constructor() {
    this.vehicles.load();
    const v = this.vehicles.selected();
    if (v) { this.make.set(v.make); this.model.set(v.model); this.year.set(v.year); }
  }

  setMake(m: string) { this.make.set(m); this.model.set(''); this.year.set(null); }
  setModel(m: string) { this.model.set(m); this.year.set(null); }

  find() {
    const v = this.selectedVehicle();
    if (!v) return;
    this.vehicles.select(v);
    this.router.navigate(['/pieces']);
  }

  clear() { this.vehicles.select(null); }
}
