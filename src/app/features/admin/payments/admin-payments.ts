import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/admin';
import {
  OPERATOR_META,
  PAYMENT_STATUS_META,
  Payment,
  PaymentOperator,
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
      <p class="text-sm text-muted">
        Vérifiez les références de transaction Orange Money et MTN MoMo envoyées par les clients.
      </p>
    </div>

    <!-- Filtres -->
    <div class="mb-6 grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-3">
      <div>
        <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="psearch">
          Recherche
        </label>
        <input
          id="psearch"
          type="search"
          [ngModel]="search()"
          (ngModelChange)="search.set($event); load()"
          placeholder="Réf. SMS, N° commande, téléphone, client…"
          class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
        />
      </div>

      <div>
        <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="pstatus">
          Statut
        </label>
        <select
          id="pstatus"
          [ngModel]="statusFilter()"
          (ngModelChange)="statusFilter.set($event); load()"
          class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">À vérifier</option>
          <option value="approved">Validés</option>
          <option value="rejected">Rejetés</option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-xs font-semibold uppercase text-muted" for="pop">
          Opérateur
        </label>
        <select
          id="pop"
          [ngModel]="operatorFilter()"
          (ngModelChange)="operatorFilter.set($event); load()"
          class="h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm"
        >
          <option value="">Orange Money & MTN MoMo</option>
          <option value="orange_money">Orange Money</option>
          <option value="mtn_momo">MTN Mobile Money</option>
        </select>
      </div>
    </div>

    @if (loading()) {
      <div class="space-y-3">
        @for (i of [1, 2, 3]; track i) {
          <div class="h-28 animate-pulse rounded-2xl border border-line bg-surface"></div>
        }
      </div>
    } @else if (payments().length === 0) {
      <div class="rounded-2xl border border-line bg-surface p-10 text-center text-muted">
        Aucun paiement ne correspond à vos critères.
      </div>
    } @else {
      <div class="space-y-4">
        @for (p of payments(); track p.id) {
          <article class="rounded-2xl border border-line bg-surface p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-bold"
                    [class]="opMeta[p.operator].cls"
                  >
                    {{ opMeta[p.operator].label }}
                  </span>
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    [class]="payMeta[p.status].cls"
                  >
                    {{ payMeta[p.status].label }}
                  </span>
                  <span class="num text-xs text-muted">
                    Commande <strong>{{ p.order_number || '#' + p.order_id }}</strong>
                  </span>
                </div>

                <p class="num text-lg font-bold">
                  Réf. SMS : <span class="text-primary">{{ p.transaction_ref }}</span>
                </p>

                <p class="num text-sm text-muted">
                  Client : <strong class="text-text">{{ p.customer_name || 'Client' }}</strong> ·
                  Téléphone émetteur : <strong class="text-text">{{ p.sender_phone }}</strong> ·
                  Reçu le {{ p.created_at | date: 'dd/MM/yyyy à HH:mm' }}
                </p>

                @if (p.notes) {
                  <p class="text-xs text-muted">Note client : « {{ p.notes }} »</p>
                }

                @if (p.status === 'rejected' && p.rejection_reason) {
                  <p class="text-xs font-semibold text-red-600 dark:text-red-400">
                    Motif du rejet : {{ p.rejection_reason }}
                  </p>
                }
              </div>

              <div class="flex flex-col items-end gap-2">
                <span class="num text-2xl font-extrabold text-primary">{{ p.amount | fcfa }}</span>

                <div class="flex flex-wrap items-center gap-2">
                  @if (p.proof_url) {
                    <button
                      type="button"
                      (click)="previewUrl.set(p.proof_url)"
                      class="rounded-lg border border-line bg-bg px-3 py-1.5 text-xs font-semibold hover:border-action"
                    >
                      🖼️ Voir la capture
                    </button>
                  }

                  @if (p.status === 'pending') {
                    <button
                      type="button"
                      (click)="approve(p)"
                      [disabled]="busyId() === p.id"
                      class="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      ✓ Valider
                    </button>
                    <button
                      type="button"
                      (click)="openReject(p)"
                      [disabled]="busyId() === p.id"
                      class="rounded-lg border border-red-300 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300"
                    >
                      ✕ Rejeter
                    </button>
                  }
                </div>
              </div>
            </div>

            <!-- Formulaire de rejet inline -->
            @if (rejectingId() === p.id) {
              <div class="mt-4 rounded-xl border border-red-300 bg-red-50/60 p-4 dark:border-red-800 dark:bg-red-950/30">
                <p class="mb-2 text-xs font-bold uppercase text-red-800 dark:text-red-200">
                  Indiquer le motif du rejet au client :
                </p>
                <div class="mb-2 flex flex-wrap gap-1.5">
                  @for (preset of rejectPresets; track preset) {
                    <button
                      type="button"
                      (click)="rejectReason.set(preset)"
                      class="rounded-full border border-line bg-surface px-2.5 py-1 text-xs hover:border-action"
                    >
                      {{ preset }}
                    </button>
                  }
                </div>
                <div class="flex flex-wrap gap-2">
                  <input
                    type="text"
                    [ngModel]="rejectReason()"
                    (ngModelChange)="rejectReason.set($event)"
                    placeholder="Motif précis du rejet…"
                    class="h-10 flex-1 rounded-lg border border-line bg-surface px-3 text-sm"
                  />
                  <button
                    type="button"
                    (click)="confirmReject(p)"
                    [disabled]="!rejectReason().trim() || busyId() === p.id"
                    class="h-10 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Confirmer le rejet
                  </button>
                  <button
                    type="button"
                    (click)="rejectingId.set(null)"
                    class="h-10 rounded-lg border border-line bg-surface px-3 text-xs"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            }
          </article>
        }
      </div>
    }

    <!-- Modale aperçu capture -->
    @if (previewUrl()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        (click)="previewUrl.set(null)"
      >
        <div
          class="max-h-[90vh] max-w-lg overflow-auto rounded-2xl bg-surface p-4"
          (click)="$event.stopPropagation()"
        >
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-display text-xl font-bold text-primary">Capture justificative</h2>
            <button
              type="button"
              (click)="previewUrl.set(null)"
              class="rounded-lg border border-line px-2.5 py-1 text-sm"
            >
              Fermer ✕
            </button>
          </div>
          <img [src]="previewUrl()!" alt="Justificatif paiement" class="max-h-[75vh] w-full rounded-lg object-contain" />
        </div>
      </div>
    }
  `,
})
export class AdminPayments {
  private adminApi = inject(AdminApi);
  private toast = inject(ToastStore);

  payments = signal<Payment[]>([]);
  loading = signal(true);
  search = signal('');
  statusFilter = signal<PaymentStatus | ''>('');
  operatorFilter = signal<PaymentOperator | ''>('');

  busyId = signal<number | null>(null);
  rejectingId = signal<number | null>(null);
  rejectReason = signal('');
  previewUrl = signal<string | null>(null);

  opMeta = OPERATOR_META;
  payMeta = PAYMENT_STATUS_META;

  rejectPresets = [
    'Référence SMS introuvable sur le relevé marchand',
    'Montant reçu inférieur au total de la commande',
    'Numéro de transaction erroné ou incomplet',
  ];

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.adminApi
      .payments({
        status: this.statusFilter(),
        operator: this.operatorFilter(),
        search: this.search(),
      })
      .subscribe({
        next: list => {
          this.payments.set(list);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  approve(p: Payment) {
    this.busyId.set(p.id);
    this.adminApi.approvePayment(p.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(`Paiement ${p.transaction_ref} approuvé. Commande marquée payée.`);
        this.load();
      },
      error: () => {
        this.busyId.set(null);
        this.toast.error('Erreur lors de la validation du paiement.');
      },
    });
  }

  openReject(p: Payment) {
    this.rejectingId.set(p.id);
    this.rejectReason.set(this.rejectPresets[0]);
  }

  confirmReject(p: Payment) {
    const reason = this.rejectReason().trim();
    if (!reason) return;
    this.busyId.set(p.id);
    this.adminApi.rejectPayment(p.id, reason).subscribe({
      next: () => {
        this.busyId.set(null);
        this.rejectingId.set(null);
        this.toast.info(`Paiement ${p.transaction_ref} rejeté.`);
        this.load();
      },
      error: () => {
        this.busyId.set(null);
        this.toast.error('Erreur lors du rejet.');
      },
    });
  }
}
