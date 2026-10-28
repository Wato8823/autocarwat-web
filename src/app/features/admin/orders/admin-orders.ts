import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/admin';
import {
  OPERATOR_META,
  ORDER_STATUS_META,
  Order,
  OrderStatus,
  PAYMENT_STATUS_META,
} from '../../../core/models';
import { ToastStore } from '../../../core/toast';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-admin-orders',
  imports: [FormsModule, DatePipe, FcfaPipe],
  template: `
    <div class="mb-6">
      <h1 class="font-display text-3xl font-bold text-primary sm:text-4xl">Commandes clients</h1>
      <p class="text-sm text-muted">
        Pilotez la préparation, l’expédition et la livraison des commandes à travers le Cameroun.
      </p>
    </div>

    <!-- Recherche & Filtres -->
    <div class="mb-6 grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-3">
      <div class="sm:col-span-2">
        <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="osearch">
          Rechercher une commande
        </label>
        <input
          id="osearch"
          type="search"
          [ngModel]="search()"
          (ngModelChange)="search.set($event); load()"
          placeholder="N° commande, nom du client, téléphone, ville…"
          class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
        />
      </div>

      <div>
        <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="ostatus">
          Statut commande
        </label>
        <select
          id="ostatus"
          [ngModel]="statusFilter()"
          (ngModelChange)="statusFilter.set($event); load()"
          class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ statusMeta[s].label }}</option>
          }
        </select>
      </div>
    </div>

    @if (loading()) {
      <div class="space-y-3">
        @for (i of [1, 2, 3]; track i) {
          <div class="h-32 animate-pulse rounded-2xl border border-line bg-surface"></div>
        }
      </div>
    } @else if (orders().length === 0) {
      <div class="rounded-2xl border border-line bg-surface p-10 text-center text-muted">
        Aucune commande trouvée.
      </div>
    } @else {
      <div class="space-y-4">
        @for (o of orders(); track o.id) {
          <article class="rounded-2xl border border-line bg-surface p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="num font-display text-2xl font-bold text-primary">
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
                      {{ opMeta[pay.operator].short }} : {{ payMeta[pay.status].label }}
                    </span>
                  }
                </div>
                <p class="num mt-1 text-sm">
                  <strong>{{ o.customer_name }}</strong> · 📞 {{ o.customer_phone }} · 📍
                  <strong>{{ o.shipping_city }}</strong> ({{ o.shipping_address }})
                </p>
                <p class="num mt-0.5 text-xs text-muted">
                  Créée le {{ o.created_at | date: 'dd/MM/yyyy à HH:mm' }} · {{ o.items.length }} pièce(s)
                </p>
              </div>

              <div class="flex flex-col items-end gap-2">
                <span class="num text-2xl font-extrabold text-primary">{{ o.total | fcfa }}</span>

                <div class="flex items-center gap-2">
                  <label [for]="'st-' + o.id" class="sr-only">Changer le statut</label>
                  <select
                    [id]="'st-' + o.id"
                    [ngModel]="o.status"
                    (ngModelChange)="changeStatus(o, $event)"
                    class="h-9 rounded-lg border border-line bg-bg px-2.5 text-xs font-semibold"
                  >
                    @for (s of statuses; track s) {
                      <option [value]="s">{{ statusMeta[s].label }}</option>
                    }
                  </select>

                  <button
                    type="button"
                    (click)="toggleExpand(o.id)"
                    class="h-9 rounded-lg border border-line bg-bg px-3 text-xs font-semibold hover:border-action"
                  >
                    {{ expandedId() === o.id ? 'Masquer ▲' : 'Articles ▼' }}
                  </button>
                </div>
              </div>
            </div>

            @if (expandedId() === o.id) {
              <div class="mt-4 border-t border-line pt-4 text-sm">
                @if (o.notes) {
                  <p class="mb-3 rounded-lg bg-bg p-2.5 text-xs text-muted">
                    Instructions client : {{ o.notes }}
                  </p>
                }
                <table class="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr class="border-b border-line text-muted">
                      <th class="pb-2">Pièce</th>
                      <th class="pb-2">Référence</th>
                      <th class="pb-2 text-right">Qté</th>
                      <th class="pb-2 text-right">Prix unit.</th>
                      <th class="pb-2 text-right">Sous-total</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-line">
                    @for (item of o.items; track item.id) {
                      <tr>
                        <td class="py-2 font-medium">{{ item.part_name }}</td>
                        <td class="num py-2 text-muted">{{ item.part_reference }}</td>
                        <td class="num py-2 text-right">{{ item.quantity }}</td>
                        <td class="num py-2 text-right">{{ item.unit_price | fcfa }}</td>
                        <td class="num py-2 text-right font-semibold">{{ item.subtotal | fcfa }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </article>
        }
      </div>
    }
  `,
})
export class AdminOrders {
  private adminApi = inject(AdminApi);
  private toast = inject(ToastStore);

  orders = signal<Order[]>([]);
  loading = signal(true);
  search = signal('');
  statusFilter = signal<OrderStatus | ''>('');
  expandedId = signal<number | null>(null);

  statusMeta = ORDER_STATUS_META;
  payMeta = PAYMENT_STATUS_META;
  opMeta = OPERATOR_META;

  statuses: OrderStatus[] = [
    'pending_payment',
    'payment_submitted',
    'paid',
    'preparing',
    'shipped',
    'delivered',
    'cancelled',
  ];

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.adminApi.orders({ status: this.statusFilter(), search: this.search() }).subscribe({
      next: list => {
        this.orders.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleExpand(id: number) {
    this.expandedId.update(cur => (cur === id ? null : id));
  }

  changeStatus(o: Order, next: OrderStatus) {
    if (next === o.status) return;
    this.adminApi.updateOrderStatus(o.id, next).subscribe({
      next: updated => {
        this.orders.update(list => list.map(item => (item.id === o.id ? updated : item)));
        this.toast.success(
          `Statut de ${o.order_number} mis à jour : ${this.statusMeta[next].label}.`,
        );
      },
      error: () => this.toast.error('Impossible de modifier le statut.'),
    });
  }
}
