import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { AdminApi } from '../../../core/admin';
import { ORDER_STATUS_META, Order, OrderStatus, Paginated } from '../../../core/models';
import { ToastStore } from '../../../core/toast';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['pending', 'cancelled'], // paid uniquement par la confirmation du paiement
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

@Component({
  selector: 'app-admin-orders',
  imports: [FormsModule, DatePipe, FcfaPipe],
  template: `
    <div class="mb-6">
      <h1 class="font-display text-3xl font-bold text-primary sm:text-4xl">Commandes clients</h1>
      <p class="mt-1 text-sm text-muted">
        Suivez les commandes et les transitions autorisées par l’API.
      </p>
    </div>
    <div class="mb-5 rounded-2xl border border-line bg-surface p-4">
      <label for="order-status" class="mb-1 block text-xs font-semibold uppercase text-muted"
        >Statut</label
      >
      <select
        id="order-status"
        [ngModel]="status()"
        (ngModelChange)="setStatus($event)"
        class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm sm:max-w-xs"
      >
        <option value="">Tous les statuts</option>
        @for (s of statuses; track s) {
          <option [value]="s">{{ statusMeta[s].label }}</option>
        }
      </select>
      <p class="mt-2 text-xs text-muted">
        Le statut « Payée » est attribué uniquement lors de la confirmation d’un paiement.
      </p>
    </div>
    @if (loading()) {
      <div class="space-y-3" aria-busy="true">
        @for (i of [1, 2, 3]; track i) {
          <div class="h-28 animate-pulse rounded-2xl border border-line bg-surface"></div>
        }
      </div>
    } @else if (error()) {
      <div role="alert" class="rounded-2xl border border-line bg-surface p-8 text-center">
        <p>{{ error() }}</p>
        <button
          type="button"
          (click)="load(page())"
          class="mt-3 font-semibold text-primary underline"
        >
          Réessayer
        </button>
      </div>
    } @else if (result(); as r) {
      @if (r.data.length === 0) {
        <div class="rounded-2xl border border-line bg-surface p-10 text-center text-muted">
          Aucune commande pour ce statut.
        </div>
      } @else {
        <p class="mb-3 text-sm text-muted">{{ r.meta.total }} commande(s)</p>
        <div class="space-y-4">
          @for (o of r.data; track o.id) {
            <article class="rounded-2xl border border-line bg-surface p-5">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="num font-display text-2xl font-bold text-primary"
                      >Commande n°{{ o.id }}</span
                    ><span
                      class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      [class]="statusMeta[o.status].cls"
                      >{{ statusMeta[o.status].label }}</span
                    >
                  </div>
                  <p class="num mt-1 text-xs text-muted">
                    Créée le {{ o.created_at | date: 'dd/MM/yyyy à HH:mm' }} ·
                    {{ o.items.length }} article(s)
                  </p>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <span class="num text-2xl font-extrabold text-primary">{{ o.total | fcfa }}</span>
                  <div class="flex flex-wrap gap-2">
                    @if (transitions[o.status].length) {
                      <label [for]="'status-' + o.id" class="sr-only"
                        >Changer le statut de la commande n°{{ o.id }}</label
                      >
                      <select
                        [id]="'status-' + o.id"
                        [ngModel]="o.status"
                        (ngModelChange)="changeStatus(o, $event)"
                        [disabled]="busyId() !== null"
                        class="h-9 rounded-lg border border-line bg-bg px-2 text-xs font-semibold disabled:opacity-50"
                      >
                        <option [value]="o.status">{{ statusMeta[o.status].label }}</option>
                        @for (s of transitions[o.status]; track s) {
                          <option [value]="s">{{ statusMeta[s].label }}</option>
                        }
                      </select>
                    }
                    <button
                      type="button"
                      (click)="toggleExpand(o.id)"
                      [attr.aria-expanded]="expandedId() === o.id"
                      class="h-9 rounded-lg border border-line bg-bg px-3 text-xs font-semibold hover:border-action"
                    >
                      {{ expandedId() === o.id ? 'Masquer ▲' : 'Articles ▼' }}
                    </button>
                  </div>
                </div>
              </div>
              @if (expandedId() === o.id) {
                <div class="mt-4 overflow-x-auto border-t border-line pt-4">
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
                      @for (item of o.items; track $index) {
                        <tr>
                          <td class="py-2 font-medium">{{ item.part }}</td>
                          <td class="num py-2 text-muted">{{ item.reference }}</td>
                          <td class="num py-2 text-right">{{ item.quantity }}</td>
                          <td class="num py-2 text-right">{{ item.unit_price | fcfa }}</td>
                          <td class="num py-2 text-right font-semibold">
                            {{ item.quantity * item.unit_price | fcfa }}
                          </td>
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
      @if (r.meta.last_page > 1) {
        <nav
          class="mt-6 flex items-center justify-center gap-4"
          aria-label="Pagination des commandes"
        >
          <button
            type="button"
            (click)="load(page() - 1)"
            [disabled]="page() <= 1"
            class="h-10 rounded-lg border border-line bg-surface px-4 text-sm disabled:opacity-40"
          >
            ← Précédent</button
          ><span class="num text-sm">Page {{ r.meta.current_page }} / {{ r.meta.last_page }}</span
          ><button
            type="button"
            (click)="load(page() + 1)"
            [disabled]="page() >= r.meta.last_page"
            class="h-10 rounded-lg border border-line bg-surface px-4 text-sm disabled:opacity-40"
          >
            Suivant →
          </button>
        </nav>
      }
    }
  `,
})
export class AdminOrders {
  private api = inject(AdminApi);
  private toast = inject(ToastStore);
  result = signal<Paginated<Order> | null>(null);
  loading = signal(true);
  error = signal('');
  page = signal(1);
  status = signal<OrderStatus | ''>('');
  expandedId = signal<number | null>(null);
  busyId = signal<number | null>(null);
  statusMeta = ORDER_STATUS_META;
  transitions = TRANSITIONS;
  statuses: OrderStatus[] = [
    'pending',
    'awaiting_payment',
    'paid',
    'shipped',
    'delivered',
    'cancelled',
  ];
  private requests = new Subject<{ status: OrderStatus | ''; page: number }>();
  constructor() {
    this.requests
      .pipe(
        switchMap((request) =>
          this.api.orders(request.status, request.page).pipe(
            map((result) => ({ result, failed: false })),
            catchError(() => of({ result: null, failed: true })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ result, failed }) => {
        if (result && result.meta.current_page > Math.max(1, result.meta.last_page)) {
          this.load(Math.max(1, result.meta.last_page));
          return;
        }
        if (result) {
          this.result.set(result);
          this.page.set(result.meta.current_page);
        }
        if (failed) this.error.set('Impossible de charger les commandes.');
        this.loading.set(false);
      });
    this.load(1);
  }
  setStatus(status: OrderStatus | '') {
    this.status.set(status);
    this.load(1);
  }
  load(page: number) {
    if (page < 1) return;
    this.loading.set(true);
    this.error.set('');
    this.requests.next({ status: this.status(), page });
  }
  toggleExpand(id: number) {
    this.expandedId.update((current) => (current === id ? null : id));
  }
  changeStatus(o: Order, next: OrderStatus) {
    if (this.busyId() !== null || !TRANSITIONS[o.status].includes(next)) return;
    if (
      next === 'cancelled' &&
      !confirm(
        `Annuler la commande n°${o.id} ? Si un paiement a été effectué, l’annulation ne déclenche pas automatiquement un remboursement.`,
      )
    ) {
      this.load(this.page());
      return;
    }
    this.busyId.set(o.id);
    this.api.updateOrderStatus(o.id, next).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(`Statut de la commande n°${o.id} mis à jour.`);
        this.load(this.page());
      },
      error: (e: HttpErrorResponse) => {
        this.busyId.set(null);
        this.toast.error(e.error?.message ?? 'Impossible de modifier le statut.');
        this.load(this.page());
      },
    });
  }
}
