import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import {
  OPERATOR_META,
  ORDER_STATUS_META,
  Order,
  OrderStatus,
  PAYMENT_STATUS_META,
  PaymentOperator,
} from '../../../core/models';
import { OrdersApi } from '../../../core/orders';
import { ToastStore } from '../../../core/toast';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, FormsModule, DatePipe, FcfaPipe],
  template: `
    <div class="mb-5">
      <a routerLink="/commandes" class="text-sm text-muted underline hover:text-primary">
        ← Retour à mes commandes
      </a>
    </div>

    @if (loading()) {
      <div class="space-y-4">
        <div class="h-32 animate-pulse rounded-2xl border border-line bg-surface"></div>
        <div class="h-64 animate-pulse rounded-2xl border border-line bg-surface"></div>
      </div>
    } @else if (error()) {
      <div class="rounded-2xl border border-line bg-surface p-8 text-center">
        <p class="text-lg font-bold text-primary">{{ error() }}</p>
        <a
          routerLink="/commandes"
          class="mt-4 inline-flex h-11 items-center rounded-lg bg-action px-5 font-semibold text-on-action"
        >
          Voir mes commandes
        </a>
      </div>
    } @else if (order(); as o) {
      <!-- En-tête commande -->
      <div class="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-2.5">
              <h1 class="num font-display text-3xl font-bold text-primary">
                Commande {{ o.order_number }}
              </h1>
              <span
                class="rounded-full px-3 py-1 text-xs font-semibold"
                [class]="statusMeta[o.status].cls"
              >
                {{ statusMeta[o.status].label }}
              </span>
            </div>
            <p class="num mt-1 text-sm text-muted">
              Enregistrée le {{ o.created_at | date: 'dd/MM/yyyy à HH:mm' }}
            </p>
          </div>

          @if (canCancel()) {
            <button
              type="button"
              (click)="cancelOrder(o)"
              [disabled]="cancelling()"
              class="rounded-lg border border-red-300 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              {{ cancelling() ? 'Annulation…' : 'Annuler la commande' }}
            </button>
          }
        </div>

        <!-- Timeline de suivi -->
        @if (o.status !== 'cancelled') {
          <ol class="mt-6 grid gap-3 sm:grid-cols-5">
            @for (s of timelineSteps; track s.label; let idx = $index) {
              <li
                class="flex items-center gap-2.5 rounded-xl border p-3 text-xs"
                [class]="
                  idx <= currentStepIndex()
                    ? 'border-emerald-400 bg-emerald-50/70 font-semibold text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
                    : 'border-line bg-bg text-muted'
                "
              >
                <span
                  class="num inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  [class]="
                    idx <= currentStepIndex()
                      ? 'bg-emerald-600 text-white'
                      : 'bg-surface text-muted'
                  "
                >
                  {{ idx < currentStepIndex() ? '✓' : idx + 1 }}
                </span>
                <span>{{ s.label }}</span>
              </li>
            }
          </ol>
        } @else {
          <div
            class="mt-4 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
          >
            Cette commande a été annulée. Les stocks réservés ont été remis à disposition.
          </div>
        }
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-12">
        <!-- Bloc Paiement Mobile Money -->
        <div class="space-y-6 lg:col-span-7">
          @if (o.status !== 'cancelled') {
            <section class="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <h2 class="mb-3 font-display text-2xl font-bold text-primary">
                Paiement Mobile Money
              </h2>

              @if (o.payment && o.payment.status === 'approved') {
                <div
                  class="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
                >
                  <p class="font-bold">✓ Paiement vérifié et validé</p>
                  <p class="num mt-1">
                    {{ opMeta[o.payment.operator].label }} · Réf.
                    <strong>{{ o.payment.transaction_ref }}</strong> · Émetteur
                    {{ o.payment.sender_phone }}
                  </p>
                  @if (o.payment.reviewed_at) {
                    <p class="num mt-1 text-xs opacity-80">
                      Confirmé le {{ o.payment.reviewed_at | date: 'dd/MM/yyyy à HH:mm' }}
                    </p>
                  }
                </div>
              } @else if (o.payment && o.payment.status === 'pending') {
                <div
                  class="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100"
                >
                  <p class="font-bold">⏳ Preuve de paiement en cours de vérification</p>
                  <p class="num mt-1">
                    Opérateur : <strong>{{ opMeta[o.payment.operator].label }}</strong> · Réf.
                    <strong>{{ o.payment.transaction_ref }}</strong> ({{ o.payment.sender_phone }})
                  </p>
                  <p class="mt-1 text-xs opacity-85">
                    Notre équipe vérifie votre transaction Mobile Money avant la mise en préparation.
                  </p>
                  @if (o.payment.proof_url) {
                    <img
                      [src]="o.payment.proof_url"
                      alt="Preuve transmise"
                      class="mt-3 max-h-40 rounded-lg border border-line object-contain"
                    />
                  }
                </div>
              } @else {
                @if (o.payment && o.payment.status === 'rejected') {
                  <div
                    class="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
                  >
                    <p class="font-bold">⚠️ Preuve précédente rejetée par l’administrateur</p>
                    <p class="mt-1">
                      Motif : <strong>{{ o.payment.rejection_reason || 'Référence invalide' }}</strong>
                    </p>
                    <p class="mt-1 text-xs">
                      Veuillez vérifier votre SMS de transfert et soumettre une nouvelle référence ci-dessous.
                    </p>
                  </div>
                }

                <!-- Formulaire d'envoi de référence / preuve -->
                <form (ngSubmit)="submitProof(o)" class="space-y-4">
                  <div class="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      (click)="operator.set('orange_money')"
                      class="flex items-center gap-2.5 rounded-xl border-2 p-3 text-left text-sm"
                      [class]="
                        operator() === 'orange_money' ? 'border-action bg-orange-50/60 dark:bg-orange-950/30' : 'border-line bg-bg'
                      "
                    >
                      <span class="text-xl">🟠</span>
                      <div>
                        <span class="block font-bold">Orange Money</span>
                        <span class="num text-xs text-muted">{{ merchant.orangeMoney.number }}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      (click)="operator.set('mtn_momo')"
                      class="flex items-center gap-2.5 rounded-xl border-2 p-3 text-left text-sm"
                      [class]="
                        operator() === 'mtn_momo' ? 'border-action bg-yellow-50/60 dark:bg-yellow-950/30' : 'border-line bg-bg'
                      "
                    >
                      <span class="text-xl">🟡</span>
                      <div>
                        <span class="block font-bold">MTN MoMo</span>
                        <span class="num text-xs text-muted">{{ merchant.mtnMomo.number }}</span>
                      </div>
                    </button>
                  </div>

                  <div class="rounded-xl border border-line bg-bg p-3.5 text-xs">
                    Transférez <strong class="num text-sm text-primary">{{ o.total | fcfa }}</strong>
                    au numéro marchand
                    <strong class="num">{{ activeMerchant().number }}</strong>
                    (<strong>{{ activeMerchant().holder }}</strong>), puis renseignez la référence reçue par SMS :
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label class="mb-1 block text-xs font-semibold" for="payPhone">
                        Numéro émetteur *
                      </label>
                      <input
                        id="payPhone"
                        name="payPhone"
                        type="tel"
                        [ngModel]="senderPhone()"
                        (ngModelChange)="senderPhone.set($event)"
                        required
                        placeholder="Ex. 694 12 34 56"
                        class="num h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-xs font-semibold" for="payRef">
                        Référence transaction SMS *
                      </label>
                      <input
                        id="payRef"
                        name="payRef"
                        [ngModel]="transactionRef()"
                        (ngModelChange)="transactionRef.set($event)"
                        required
                        placeholder="Ex. MP261028.1432.A84921"
                        class="num h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="mb-1 block text-xs font-semibold" for="payProof">
                      Capture d’écran justificative (optionnel)
                    </label>
                    <input
                      id="payProof"
                      type="file"
                      accept="image/*"
                      (change)="onFileSelected($event)"
                      class="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:font-semibold file:text-white dark:file:text-[#0F1B2A]"
                    />
                  </div>

                  <button
                    type="submit"
                    [disabled]="submittingProof() || !senderPhone().trim() || !transactionRef().trim()"
                    class="h-11 w-full rounded-lg bg-action font-semibold text-on-action disabled:opacity-50"
                  >
                    {{ submittingProof() ? 'Envoi en cours…' : 'Envoyer ma preuve de paiement' }}
                  </button>
                </form>
              }
            </section>
          }

          <!-- Articles commandés -->
          <section class="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 class="mb-4 font-display text-2xl font-bold text-primary">
              Pièces commandées ({{ o.items.length }})
            </h2>
            <ul class="divide-y divide-line">
              @for (item of o.items; track item.id) {
                <li class="flex items-center justify-between gap-4 py-3 text-sm">
                  <div class="min-w-0">
                    <a
                      [routerLink]="['/pieces', item.part_id]"
                      class="font-semibold hover:text-primary hover:underline"
                    >
                      {{ item.part_name }}
                    </a>
                    <p class="num text-xs text-muted">
                      Réf. {{ item.part_reference }} · {{ item.quantity }} × {{ item.unit_price | fcfa }}
                    </p>
                  </div>
                  <span class="num shrink-0 font-bold">{{ item.subtotal | fcfa }}</span>
                </li>
              }
            </ul>
          </section>
        </div>

        <!-- Livraison & Totaux -->
        <aside class="space-y-6 lg:col-span-5">
          <div class="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 class="mb-3 font-display text-2xl font-bold text-primary">Adresse de livraison</h2>
            <p class="font-semibold">{{ o.customer_name }}</p>
            <p class="num text-sm text-muted">📞 {{ o.customer_phone }}</p>
            <p class="mt-2 text-sm">
              📍 <strong>{{ o.shipping_city }}</strong> — {{ o.shipping_address }}
            </p>
            @if (o.notes) {
              <p class="mt-2 rounded-lg bg-bg p-2.5 text-xs text-muted">Note : {{ o.notes }}</p>
            }

            <dl class="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <div class="flex justify-between">
                <dt class="text-muted">Sous-total pièces</dt>
                <dd class="num font-semibold">{{ o.subtotal | fcfa }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-muted">Frais de livraison</dt>
                <dd class="num font-semibold">
                  {{ o.shipping_fee === 0 ? 'Offerte' : (o.shipping_fee | fcfa) }}
                </dd>
              </div>
              <div class="flex justify-between border-t border-line pt-3 text-base font-bold">
                <dt>Total TTC</dt>
                <dd class="num text-xl text-primary">{{ o.total | fcfa }}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    }
  `,
})
export class OrderDetail {
  id = input.required<string>();

  private ordersApi = inject(OrdersApi);
  private toast = inject(ToastStore);

  order = signal<Order | null>(null);
  loading = signal(true);
  error = signal('');
  cancelling = signal(false);

  merchant = environment.merchant;
  statusMeta = ORDER_STATUS_META;
  payMeta = PAYMENT_STATUS_META;
  opMeta = OPERATOR_META;

  operator = signal<PaymentOperator>('orange_money');
  senderPhone = signal('');
  transactionRef = signal('');
  proofUrl = signal<string | null>(null);
  proofName = signal<string | null>(null);
  submittingProof = signal(false);

  timelineSteps = [
    { label: 'Commande créée' },
    { label: 'Preuve envoyée' },
    { label: 'Paiement validé' },
    { label: 'Expédition' },
    { label: 'Livrée' },
  ];

  activeMerchant = computed(() =>
    this.operator() === 'orange_money' ? this.merchant.orangeMoney : this.merchant.mtnMomo,
  );

  currentStepIndex = computed(() => {
    const st: OrderStatus | undefined = this.order()?.status;
    switch (st) {
      case 'pending_payment':
        return 0;
      case 'payment_submitted':
        return 1;
      case 'paid':
        return 2;
      case 'preparing':
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      default:
        return 0;
    }
  });

  canCancel = computed(() => {
    const st = this.order()?.status;
    return st === 'pending_payment' || st === 'payment_submitted';
  });

  constructor() {
    effect(() => {
      const orderId = this.id();
      untracked(() => this.load(orderId));
    });
  }

  private load(orderId: string) {
    this.loading.set(true);
    this.error.set('');
    this.ordersApi.order(orderId).subscribe({
      next: o => {
        this.order.set(o);
        this.senderPhone.set(o.customer_phone);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Commande introuvable.');
      },
    });
  }

  onFileSelected(ev: Event) {
    const inputEl = ev.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.toast.error('Image trop volumineuse (max 2 Mo).');
      inputEl.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.proofUrl.set(typeof reader.result === 'string' ? reader.result : null);
      this.proofName.set(file.name);
    };
    reader.readAsDataURL(file);
  }

  submitProof(o: Order) {
    if (!this.senderPhone().trim() || !this.transactionRef().trim()) return;
    this.submittingProof.set(true);
    this.ordersApi
      .submitPayment(o.id, {
        operator: this.operator(),
        sender_phone: this.senderPhone().trim(),
        transaction_ref: this.transactionRef().trim(),
        proof_url: this.proofUrl(),
        proof_name: this.proofName(),
      })
      .subscribe({
        next: () => {
          this.submittingProof.set(false);
          this.transactionRef.set('');
          this.proofUrl.set(null);
          this.toast.success('Preuve de paiement envoyée ! En attente de validation.');
          this.load(String(o.id));
        },
        error: (e: HttpErrorResponse) => {
          this.submittingProof.set(false);
          this.toast.error(e.error?.message ?? 'Impossible d’envoyer la preuve.');
        },
      });
  }

  cancelOrder(o: Order) {
    if (!confirm(`Voulez-vous vraiment annuler la commande ${o.order_number} ?`)) return;
    this.cancelling.set(true);
    this.ordersApi.cancel(o.id).subscribe({
      next: updated => {
        this.cancelling.set(false);
        this.order.set(updated);
        this.toast.info(`Commande ${o.order_number} annulée.`);
      },
      error: (e: HttpErrorResponse) => {
        this.cancelling.set(false);
        this.toast.error(e.error?.message ?? 'Annulation impossible.');
      },
    });
  }
}
