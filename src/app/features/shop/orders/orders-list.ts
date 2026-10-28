import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { ORDER_STATUS_META, Order, Paginated } from '../../../core/models';
import { OrdersApi } from '../../../core/orders';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-orders-list',
  imports: [RouterLink, DatePipe, FcfaPipe],
  template: `
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="font-display text-4xl font-bold text-primary">Mes commandes</h1>
        <p class="mt-1 text-sm text-muted">
          Consultez vos paiements et suivez l’avancement de vos commandes.
        </p>
      </div>
      <a
        routerLink="/pieces"
        class="inline-flex h-10 items-center rounded-lg bg-action px-4 text-sm font-semibold text-on-action"
        >+ Nouvelle commande</a
      >
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
        <div class="rounded-2xl border border-line bg-surface p-10 text-center">
          <div class="mb-2 text-4xl" aria-hidden="true">📦</div>
          <p class="text-lg font-semibold">Vous n’avez pas encore de commande.</p>
          <a routerLink="/pieces" class="mt-3 inline-block font-semibold text-primary underline"
            >Parcourir les pièces</a
          >
        </div>
      } @else {
        <p class="mb-3 text-sm text-muted">{{ r.meta.total }} commande(s)</p>
        <div class="space-y-4">
          @for (o of r.data; track o.id) {
            <article
              class="themed rounded-2xl border border-line bg-surface p-5 transition hover:border-action"
            >
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="num font-display text-xl font-bold text-primary"
                      >Commande n°{{ o.id }}</span
                    ><span
                      class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      [class]="statusMeta[o.status].cls"
                      >{{ statusMeta[o.status].label }}</span
                    >
                  </div>
                  <p class="num mt-1 text-xs text-muted">
                    Passée le {{ o.created_at | date: 'dd/MM/yyyy à HH:mm' }} ·
                    {{ o.items.length }} article(s)
                  </p>
                </div>
                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <span class="block text-xs text-muted">Montant</span
                    ><span class="num text-xl font-bold text-primary">{{ o.total | fcfa }}</span>
                  </div>
                  <a
                    [routerLink]="['/commandes', o.id]"
                    class="inline-flex h-10 items-center rounded-lg border border-line bg-bg px-4 text-sm font-semibold hover:border-action"
                    >{{
                      o.status === 'pending' || o.status === 'awaiting_payment'
                        ? 'Voir le paiement →'
                        : 'Suivre →'
                    }}</a
                  >
                </div>
              </div>
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
            ← Précédent
          </button>
          <span class="num text-sm">Page {{ r.meta.current_page }} / {{ r.meta.last_page }}</span>
          <button
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
export class OrdersList {
  private ordersApi = inject(OrdersApi);
  result = signal<Paginated<Order> | null>(null);
  page = signal(1);
  loading = signal(true);
  error = signal('');
  statusMeta = ORDER_STATUS_META;

  private requests = new Subject<number>();
  constructor() {
    this.requests
      .pipe(
        switchMap((page) =>
          this.ordersApi.myOrders(page).pipe(
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
        if (failed) this.error.set('Impossible de charger vos commandes.');
        this.loading.set(false);
      });
    this.load(1);
  }

  load(page: number) {
    if (page < 1) return;
    this.loading.set(true);
    this.error.set('');
    this.requests.next(page);
  }
}
