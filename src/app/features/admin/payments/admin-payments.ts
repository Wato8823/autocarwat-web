import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { AdminApi } from '../../../core/admin';
import {
  OPERATOR_META,
  PAYMENT_STATUS_META,
  Paginated,
  Payment,
  PaymentStatus,
} from '../../../core/models';
import { ToastStore } from '../../../core/toast';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-admin-payments',
  imports: [FormsModule, DatePipe, FcfaPipe],
  template: `
    <div class="mb-6">
      <h1 class="font-display text-3xl font-bold text-primary sm:text-4xl">
        Paiements Mobile Money
      </h1>
      <p class="mt-1 text-sm text-muted">
        Vérifiez les transactions auprès de l’opérateur avant de confirmer un paiement.
      </p>
    </div>
    <div class="mb-5 rounded-2xl border border-line bg-surface p-4">
      <label for="payment-status" class="mb-1 block text-xs font-semibold uppercase text-muted"
        >Statut du paiement</label
      >
      <select
        id="payment-status"
        [ngModel]="status()"
        (ngModelChange)="setStatus($event)"
        class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm sm:max-w-xs"
      >
        <option value="initiated">Initié / à vérifier</option>
        <option value="confirmed">Validé</option>
        <option value="rejected">Rejeté</option>
      </select>
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
          Aucun paiement pour ce statut.
        </div>
      } @else {
        <p class="mb-3 text-sm text-muted">{{ r.meta.total }} paiement(s)</p>
        <div class="space-y-4">
          @for (p of r.data; track p.id) {
            <article class="rounded-2xl border border-line bg-surface p-5">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                      [class]="opMeta[p.provider].cls"
                      >{{ opMeta[p.provider].label }}</span
                    >
                    <span
                      class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      [class]="payMeta[p.status].cls"
                      >{{ payMeta[p.status].label }}</span
                    >
                    <span class="num text-xs text-muted"
                      >Commande n°{{ p.order_id }} · Paiement n°{{ p.id }}</span
                    >
                  </div>
                  <p class="num mt-2 text-base font-bold">
                    Référence SMS :
                    <span class="text-primary">{{
                      p.transaction_reference || 'Non renseignée'
                    }}</span>
                  </p>
                  <p class="num mt-1 text-sm text-muted">
                    {{ p.order?.user?.name || 'Client' }} · Numéro payeur :
                    <strong class="text-text">{{ p.payer_phone }}</strong> · Initié le
                    {{ p.created_at | date: 'dd/MM/yyyy à HH:mm' }}
                  </p>
                  @if (p.status === 'initiated' && !p.transaction_reference) {
                    <p class="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      Le client n’a pas encore transmis de référence SMS.
                    </p>
                  }
                </div>
                <div class="flex flex-col items-end gap-3">
                  <span class="num text-2xl font-extrabold text-primary">{{
                    p.amount | fcfa
                  }}</span>
                  @if (p.status === 'initiated') {
                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        (click)="confirmPayment(p)"
                        [disabled]="busyId() !== null || !p.transaction_reference"
                        class="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        ✓ Confirmer
                      </button>
                      <button
                        type="button"
                        (click)="reject(p)"
                        [disabled]="busyId() !== null"
                        class="rounded-lg border border-red-300 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300"
                      >
                        ✕ Rejeter
                      </button>
                    </div>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      }
      @if (r.meta.last_page > 1) {
        <nav
          class="mt-6 flex items-center justify-center gap-4"
          aria-label="Pagination des paiements"
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
export class AdminPayments {
  private adminApi = inject(AdminApi);
  private toast = inject(ToastStore);
  result = signal<Paginated<Payment> | null>(null);
  status = signal<PaymentStatus>('initiated');
  page = signal(1);
  loading = signal(true);
  error = signal('');
  busyId = signal<number | null>(null);
  opMeta = OPERATOR_META;
  payMeta = PAYMENT_STATUS_META;

  private requests = new Subject<{ status: PaymentStatus; page: number }>();
  constructor() {
    this.requests
      .pipe(
        switchMap((request) =>
          this.adminApi.payments(request.status, request.page).pipe(
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
        if (failed) this.error.set('Impossible de charger les paiements.');
        this.loading.set(false);
      });
    this.load(1);
  }
  setStatus(status: PaymentStatus) {
    this.status.set(status);
    this.load(1);
  }
  load(page: number) {
    if (page < 1) return;
    this.loading.set(true);
    this.error.set('');
    this.requests.next({ status: this.status(), page });
  }
  confirmPayment(p: Payment) {
    if (
      this.busyId() !== null ||
      !p.transaction_reference ||
      !confirm(
        `Avez-vous vérifié la réception du paiement et la référence ${p.transaction_reference} auprès de l’opérateur ?`,
      )
    )
      return;
    this.busyId.set(p.id);
    this.adminApi.confirmPayment(p.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success('Paiement confirmé. La commande est marquée payée.');
        this.load(this.page());
      },
      error: (e: HttpErrorResponse) => {
        this.busyId.set(null);
        this.toast.error(e.error?.message ?? 'Impossible de confirmer ce paiement.');
      },
    });
  }
  reject(p: Payment) {
    if (
      this.busyId() !== null ||
      !confirm(
        `Rejeter le paiement n°${p.id} ? La commande repassera en attente et le stock pourra être libéré.`,
      )
    )
      return;
    this.busyId.set(p.id);
    this.adminApi.rejectPayment(p.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.info('Paiement rejeté.');
        this.load(this.page());
      },
      error: (e: HttpErrorResponse) => {
        this.busyId.set(null);
        this.toast.error(e.error?.message ?? 'Impossible de rejeter ce paiement.');
      },
    });
  }
}
