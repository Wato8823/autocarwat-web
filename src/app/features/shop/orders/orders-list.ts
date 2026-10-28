import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  OPERATOR_META,
  ORDER_STATUS_META,
  Order,
  OrderStatus,
  PAYMENT_STATUS_META,
} from '../../../core/models';
import { OrdersApi } from '../../../core/orders';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-orders-list',
  imports: [RouterLink, DatePipe, FcfaPipe],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-4xl font-bold text-primary">Mes commandes</h1>
        <p class="text-sm text-muted">
          Consultez l’état de vos paiements Mobile Money et le suivi de livraison de vos pièces.
        </p>
      </div>
      <a
        routerLink="/pieces"
        class="inline-flex h-10 items-center rounded-lg bg-action px-4 text-sm font-semibold text-on-action"
      >
        + Nouvelle commande
      </a>
    </div>

    <!-- Filtres rapides -->
    <div class="mb-5 flex flex-wrap gap-2">
      @for (f of statusFilters; track f.value) {
        <button
          type="button"
          (click)="activeFilter.set(f.value)"
          class="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition"
          [class]="
            activeFilter() === f.value
              ? 'border-primary bg-primary text-white dark:text-[#0F1B2A]'
              : 'border-line bg-surface text-muted hover:border-action'
          "
        >
          {{ f.label }}
        </button>
      }
    </div>

    @if (loading()) {
      <div class="space-y-3">
        @for (i of [1, 2, 3]; track i) {
          <div class="h-28 animate-pulse rounded-2xl border border-line bg-surface"></div>
        }
      </div>
    } @else if (filteredOrders().length === 0) {
      <div class="rounded-2xl border border-line bg-surface p-10 text-center">
        <div class="mb-2 text-4xl" aria-hidden="true">📦</div>
        <p class="text-lg font-semibold">Aucune commande dans cette catégorie.</p>
        <p class="mt-1 text-sm text-muted">
          Vos commandes et suivis de livraison apparaîtront ici dès votre premier achat.
        </p>
      </div>
    } @else {
      <div class="space-y-4">
        @for (o of filteredOrders(); track o.id) {
          <article
            class="themed rounded-2xl border border-line bg-surface p-5 transition hover:border-action"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="num font-display text-xl font-bold text-primary">
                    {{ o.order_number }}
                  </span>
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    [class]="statusMeta[o.status].cls"
                  >
                    {{ statusMeta[o.status].label }}
                  </span>
                  @if (o.payment; as pay) {
                    <span
                      class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      [class]="payMeta[pay.status].cls"
                    >
                      {{ opMeta[pay.operator].short }} · {{ payMeta[pay.status].label }}
                    </span>
                  }
                </div>
                <p class="num mt-1 text-xs text-muted">
                  Passée le {{ o.created_at | date: 'dd/MM/yyyy à HH:mm' }} · Livraison à
                  <strong>{{ o.shipping_city }}</strong> ({{ o.items.length }} article(s))
                </p>
              </div>

              <div class="flex items-center gap-4">
                <div class="text-right">
                  <span class="block text-xs text-muted">Total TTC</span>
                  <span class="num text-xl font-bold text-primary">{{ o.total | fcfa }}</span>
                </div>
                <a
                  [routerLink]="['/commandes', o.id]"
                  class="inline-flex h-10 items-center rounded-lg border border-line bg-bg px-4 text-sm font-semibold hover:border-action"
                >
                  {{ o.status === 'pending_payment' ? 'Envoyer paiement →' : 'Suivre →' }}
                </a>
              </div>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class OrdersList {
  private ordersApi = inject(OrdersApi);

  orders = signal<Order[]>([]);
  loading = signal(true);
  activeFilter = signal<'all' | OrderStatus>('all');

  statusMeta = ORDER_STATUS_META;
  payMeta = PAYMENT_STATUS_META;
  opMeta = OPERATOR_META;

  statusFilters: { label: string; value: 'all' | OrderStatus }[] = [
    { label: 'Toutes', value: 'all' },
    { label: 'À payer', value: 'pending_payment' },
    { label: 'Paiement en vérification', value: 'payment_submitted' },
    { label: 'Payées', value: 'paid' },
    { label: 'Expédiées', value: 'shipped' },
    { label: 'Livrées', value: 'delivered' },
  ];

  filteredOrders = computed(() => {
    const f = this.activeFilter();
    if (f === 'all') return this.orders();
    return this.orders().filter(o => o.status === f);
  });

  constructor() {
    this.ordersApi.myOrders().subscribe({
      next: list => {
        this.orders.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
