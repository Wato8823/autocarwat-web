import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminApi } from '../../../core/admin';
import { OPERATOR_META, ORDER_STATUS_META, Paginated, Order, Payment } from '../../../core/models';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, FcfaPipe],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-3xl font-bold text-primary sm:text-4xl">Tableau de bord</h1>
        <p class="text-sm text-muted">Vue d’ensemble des commandes et paiements de la boutique.</p>
      </div>
      <button
        type="button"
        (click)="load()"
        class="rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-semibold hover:border-action"
      >
        ↻ Actualiser
      </button>
    </div>
    @if (loading()) {
      <div class="grid gap-4 sm:grid-cols-2" aria-busy="true">
        <div class="h-28 animate-pulse rounded-2xl border border-line bg-surface"></div>
        <div class="h-28 animate-pulse rounded-2xl border border-line bg-surface"></div>
      </div>
    } @else if (error()) {
      <div role="alert" class="rounded-2xl border border-line bg-surface p-8 text-center">
        <p>{{ error() }}</p>
        <button type="button" (click)="load()" class="mt-3 font-semibold text-primary underline">
          Réessayer
        </button>
      </div>
    } @else if (payments(); as p) {
      @if (orders(); as o) {
        <div class="grid gap-4 sm:grid-cols-2">
          <a
            routerLink="/admin/paiements"
            class="rounded-2xl border border-line bg-surface p-5 transition hover:border-action"
            ><p class="text-xs font-semibold uppercase tracking-wide text-muted">
              Paiements initiés
            </p>
            <p class="num mt-2 text-2xl font-extrabold text-primary">{{ p.meta.total }}</p>
            <p class="mt-1 text-xs text-muted">Consulter les références et les valider →</p></a
          >
          <a
            routerLink="/admin/commandes"
            class="rounded-2xl border border-line bg-surface p-5 transition hover:border-action"
            ><p class="text-xs font-semibold uppercase tracking-wide text-muted">Commandes</p>
            <p class="num mt-2 text-2xl font-extrabold text-primary">{{ o.meta.total }}</p>
            <p class="mt-1 text-xs text-muted">Gérer les commandes →</p></a
          >
        </div>
        <div class="mt-6 grid gap-6 lg:grid-cols-2">
          <section class="rounded-2xl border border-line bg-surface p-5">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="font-display text-xl font-bold text-primary">Paiements initiés récents</h2>
              <a routerLink="/admin/paiements" class="text-xs font-semibold text-primary underline"
                >Tout voir →</a
              >
            </div>
            @if (!p.data.length) {
              <p class="rounded-xl bg-bg p-6 text-center text-sm text-muted">
                Aucun paiement initié.
              </p>
            }
            @for (payment of p.data.slice(0, 5); track payment.id) {
              <div
                class="mb-2 flex flex-wrap justify-between gap-2 rounded-xl border border-line bg-bg p-3 text-sm"
              >
                <div>
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-semibold"
                    [class]="opMeta[payment.provider].cls"
                    >{{ opMeta[payment.provider].short }}</span
                  >
                  <strong class="num">{{
                    payment.transaction_reference || 'Référence non renseignée'
                  }}</strong>
                  <p class="num mt-1 text-xs text-muted">Commande n°{{ payment.order_id }}</p>
                </div>
                <strong class="num text-primary">{{ payment.amount | fcfa }}</strong>
              </div>
            }
          </section>
          <section class="rounded-2xl border border-line bg-surface p-5">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="font-display text-xl font-bold text-primary">Dernières commandes</h2>
              <a routerLink="/admin/commandes" class="text-xs font-semibold text-primary underline"
                >Tout voir →</a
              >
            </div>
            @if (!o.data.length) {
              <p class="rounded-xl bg-bg p-6 text-center text-sm text-muted">
                Aucune commande enregistrée.
              </p>
            }
            @for (order of o.data.slice(0, 5); track order.id) {
              <div
                class="mb-2 flex flex-wrap justify-between gap-2 rounded-xl border border-line bg-bg p-3 text-sm"
              >
                <div>
                  <strong class="num">Commande n°{{ order.id }}</strong>
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-semibold"
                    [class]="orderMeta[order.status].cls"
                    >{{ orderMeta[order.status].label }}</span
                  >
                  <p class="num mt-1 text-xs text-muted">
                    {{ order.created_at | date: 'dd/MM/yyyy' }}
                  </p>
                </div>
                <strong class="num text-primary">{{ order.total | fcfa }}</strong>
              </div>
            }
          </section>
        </div>
      }
    }
  `,
})
export class Dashboard {
  private api = inject(AdminApi);
  payments = signal<Paginated<Payment> | null>(null);
  orders = signal<Paginated<Order> | null>(null);
  loading = signal(true);
  error = signal('');
  orderMeta = ORDER_STATUS_META;
  opMeta = OPERATOR_META;
  constructor() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    forkJoin({ payments: this.api.payments('initiated'), orders: this.api.orders() }).subscribe({
      next: (result) => {
        this.payments.set(result.payments);
        this.orders.set(result.orders);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Impossible de charger le tableau de bord.');
      },
    });
  }
}
