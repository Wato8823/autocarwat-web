import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi } from '../../../core/admin';
import {
  AdminStats,
  OPERATOR_META,
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  Payment,
} from '../../../core/models';
import { ToastStore } from '../../../core/toast';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, FcfaPipe],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-3xl font-bold text-primary sm:text-4xl">Tableau de bord</h1>
        <p class="text-sm text-muted">
          Vue d’ensemble de l’activité AutoCarWat : encaissements Mobile Money, commandes et stocks.
        </p>
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
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="h-28 animate-pulse rounded-2xl border border-line bg-surface"></div>
        }
      </div>
    } @else if (stats(); as s) {
      <!-- KPI Cards -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl border border-line bg-surface p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Chiffre d’affaires validé</p>
          <p class="num mt-2 text-2xl font-extrabold text-primary">{{ s.total_revenue | fcfa }}</p>
          <p class="mt-1 text-xs text-muted">Commandes payées & livrées</p>
        </div>

        <a
          routerLink="/admin/paiements"
          class="rounded-2xl border p-5 transition hover:border-action"
          [class]="
            s.pending_payments_count > 0
              ? 'border-amber-400 bg-amber-50/70 dark:border-amber-700 dark:bg-amber-950/30'
              : 'border-line bg-surface'
          "
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Paiements à vérifier</p>
          <p class="num mt-2 text-2xl font-extrabold text-primary">{{ s.pending_payments_count }}</p>
          <p class="mt-1 text-xs font-medium text-action underline">Vérifier les références SMS →</p>
        </a>

        <a
          routerLink="/admin/commandes"
          class="rounded-2xl border border-line bg-surface p-5 transition hover:border-action"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Commandes totales</p>
          <p class="num mt-2 text-2xl font-extrabold text-primary">{{ s.orders_count }}</p>
          <p class="mt-1 text-xs text-muted underline">Gérer les expéditions →</p>
        </a>

        <a
          routerLink="/admin/catalogue"
          class="rounded-2xl border border-line bg-surface p-5 transition hover:border-action"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Alertes stock (≤ 5)</p>
          <p class="num mt-2 text-2xl font-extrabold text-primary">{{ s.low_stock_count }}</p>
          <p class="num mt-1 text-xs text-muted">
            Sur {{ s.parts_count }} pièces · {{ s.vehicles_count }} véhicules
          </p>
        </a>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-12">
        <!-- Paiements en attente -->
        <section class="rounded-2xl border border-line bg-surface p-5 lg:col-span-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-display text-xl font-bold text-primary">
              Paiements Mobile Money à valider
            </h2>
            <a routerLink="/admin/paiements" class="text-xs font-semibold text-primary underline">
              Tout voir →
            </a>
          </div>

          @if (s.pending_payments.length === 0) {
            <p class="rounded-xl bg-bg p-6 text-center text-sm text-muted">
              ✓ Aucun paiement en attente de vérification.
            </p>
          } @else {
            <div class="space-y-3">
              @for (p of s.pending_payments; track p.id) {
                <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bg p-3.5 text-sm">
                  <div>
                    <div class="flex items-center gap-2">
                      <span
                        class="rounded-full px-2 py-0.5 text-xs font-semibold"
                        [class]="opMeta[p.operator].cls"
                      >
                        {{ opMeta[p.operator].short }}
                      </span>
                      <span class="num font-bold">{{ p.transaction_ref }}</span>
                    </div>
                    <p class="num mt-0.5 text-xs text-muted">
                      {{ p.order_number }} · {{ p.customer_name }} ({{ p.sender_phone }})
                    </p>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="num font-bold text-primary">{{ p.amount | fcfa }}</span>
                    <button
                      type="button"
                      (click)="quickApprove(p)"
                      class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      ✓ Valider
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <!-- Dernières commandes -->
        <section class="rounded-2xl border border-line bg-surface p-5 lg:col-span-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-display text-xl font-bold text-primary">Dernières commandes</h2>
            <a routerLink="/admin/commandes" class="text-xs font-semibold text-primary underline">
              Tout voir →
            </a>
          </div>

          @if (s.recent_orders.length === 0) {
            <p class="rounded-xl bg-bg p-6 text-center text-sm text-muted">Aucune commande enregistrée.</p>
          } @else {
            <div class="space-y-2.5">
              @for (o of s.recent_orders; track o.id) {
                <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-bg p-3 text-sm">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="num font-bold">{{ o.order_number }}</span>
                      <span
                        class="rounded-full px-2 py-0.5 text-xs font-semibold"
                        [class]="orderMeta[o.status].cls"
                      >
                        {{ orderMeta[o.status].label }}
                      </span>
                    </div>
                    <p class="num text-xs text-muted">
                      {{ o.customer_name }} · {{ o.shipping_city }} · {{ o.created_at | date: 'dd/MM/yyyy' }}
                    </p>
                  </div>
                  <span class="num font-bold text-primary">{{ o.total | fcfa }}</span>
                </div>
              }
            </div>
          }
        </section>
      </div>

      <!-- Alertes de stock faible -->
      @if (s.low_stock_parts.length > 0) {
        <section class="mt-6 rounded-2xl border border-line bg-surface p-5">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="font-display text-xl font-bold text-primary">
              Pièces en stock critique ou rupture
            </h2>
            <a routerLink="/admin/catalogue" class="text-xs font-semibold text-primary underline">
              Réapprovisionner →
            </a>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (part of s.low_stock_parts; track part.id) {
              <div class="flex items-center justify-between gap-3 rounded-xl border border-line bg-bg p-3 text-sm">
                <div class="min-w-0">
                  <p class="truncate font-semibold">{{ part.name }}</p>
                  <p class="num text-xs text-muted">Réf. {{ part.reference }}</p>
                </div>
                <span
                  class="num shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
                  [class]="
                    part.stock <= 0
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200'
                  "
                >
                  {{ part.stock <= 0 ? 'Rupture (0)' : part.stock + ' restant(s)' }}
                </span>
              </div>
            }
          </div>
        </section>
      }
    }
  `,
})
export class Dashboard {
  private adminApi = inject(AdminApi);
  private toast = inject(ToastStore);

  stats = signal<AdminStats | null>(null);
  loading = signal(true);

  orderMeta = ORDER_STATUS_META;
  payMeta = PAYMENT_STATUS_META;
  opMeta = OPERATOR_META;

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.adminApi.stats().subscribe({
      next: s => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  quickApprove(p: Payment) {
    this.adminApi.approvePayment(p.id).subscribe({
      next: () => {
        this.toast.success(`Paiement ${p.transaction_ref} validé !`);
        this.load();
      },
      error: () => this.toast.error('Impossible de valider ce paiement.'),
    });
  }
}
