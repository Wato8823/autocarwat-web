import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth';
import {
  OPERATOR_META,
  ORDER_STATUS_META,
  Order,
  PaymentInstructions,
  PaymentOperator,
  normalizeCameroonPhone,
  safeDialUri,
} from '../../../core/models';
import { OrdersApi } from '../../../core/orders';
import { PaymentSessionStore } from '../../../core/payment-session';
import { ToastStore } from '../../../core/toast';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, FormsModule, DatePipe, FcfaPipe],
  template: `
    <div class="mb-5">
      <a routerLink="/commandes" class="text-sm text-muted underline hover:text-primary"
        >← Retour à mes commandes</a
      >
    </div>

    @if (loading()) {
      <div class="space-y-4" aria-busy="true">
        <div class="h-32 animate-pulse rounded-2xl border border-line bg-surface"></div>
        <div class="h-64 animate-pulse rounded-2xl border border-line bg-surface"></div>
      </div>
    } @else if (error()) {
      <div class="rounded-2xl border border-line bg-surface p-8 text-center" role="alert">
        <p class="text-lg font-bold text-primary">{{ error() }}</p>
        <button
          type="button"
          (click)="load(id())"
          class="mt-4 h-11 rounded-lg bg-action px-5 font-semibold text-on-action"
        >
          Réessayer
        </button>
      </div>
    } @else if (order(); as o) {
      <div class="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-2.5">
              <h1 class="num font-display text-3xl font-bold text-primary">
                Commande n°{{ o.id }}
              </h1>
              <span
                class="rounded-full px-3 py-1 text-xs font-semibold"
                [class]="statusMeta[o.status].cls"
                >{{ statusMeta[o.status].label }}</span
              >
            </div>
            <p class="num mt-1 text-sm text-muted">
              Enregistrée le {{ o.created_at | date: 'dd/MM/yyyy à HH:mm' }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              (click)="load(id())"
              class="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold hover:border-action"
            >
              ↻ Actualiser le statut
            </button>
            @if (canCancel()) {
              <button
                type="button"
                (click)="cancelOrder(o)"
                [disabled]="cancelling() || busy()"
                class="rounded-lg border border-red-300 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50"
              >
                {{ cancelling() ? 'Annulation…' : 'Annuler la commande' }}
              </button>
            }
          </div>
        </div>
        @if (o.status !== 'cancelled') {
          <ol class="mt-6 grid gap-2 sm:grid-cols-4" aria-label="Progression de la commande">
            @for (step of timelineSteps; track step; let idx = $index) {
              <li
                class="flex items-center gap-2 rounded-xl border p-3 text-xs"
                [class]="
                  idx <= currentStepIndex()
                    ? 'border-emerald-400 bg-emerald-50/70 font-semibold text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
                    : 'border-line bg-bg text-muted'
                "
              >
                <span
                  class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  [class]="
                    idx <= currentStepIndex()
                      ? 'bg-emerald-600 text-white'
                      : 'bg-surface text-muted'
                  "
                  >{{ idx < currentStepIndex() ? '✓' : idx + 1 }}</span
                >{{ step }}
              </li>
            }
          </ol>
        } @else {
          <p
            class="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
          >
            Cette commande a été annulée.
          </p>
        }
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-12">
        <div class="space-y-6 lg:col-span-7">
          @if (o.status !== 'cancelled') {
            <section class="rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <h2 class="font-display text-2xl font-bold text-primary">Paiement Mobile Money</h2>
              @if (o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered') {
                <div
                  class="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
                >
                  <p class="font-bold">✓ Paiement confirmé par la boutique</p>
                  <p class="mt-1">
                    Le statut de cette commande a été mis à jour par l’administrateur.
                  </p>
                </div>
              } @else {
                @if (paymentError()) {
                  <p
                    role="alert"
                    class="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
                  >
                    {{ paymentError() }}
                  </p>
                }
                @if (previousAttempt()) {
                  <p
                    class="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
                  >
                    Cette commande est revenue à l’état « À payer ». Si un paiement a été rejeté,
                    contactez la boutique et vérifiez la disponibilité avant toute nouvelle
                    tentative.
                  </p>
                }

                @if (o.status === 'awaiting_payment') {
                  @if (instructions(); as info) {
                    <div class="mt-4 rounded-xl border border-line bg-bg p-4">
                      <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                        Instructions fournies par la boutique
                      </p>
                      <div class="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <span class="block text-xs text-muted">Opérateur</span
                          ><strong>{{ opMeta[info.provider].label }}</strong>
                        </div>
                        <div>
                          <span class="block text-xs text-muted">Montant à régler</span
                          ><strong class="num text-primary">{{ info.amount | fcfa }}</strong>
                        </div>
                        <div>
                          <span class="block text-xs text-muted">Numéro de la boutique</span
                          ><strong class="num">{{ info.cashier_number }}</strong>
                        </div>
                        @if (info.cashier_name) {
                          <div>
                            <span class="block text-xs text-muted">Compte marchand</span
                            ><strong>{{ info.cashier_name }}</strong>
                          </div>
                        }
                        <div>
                          <span class="block text-xs text-muted">Code à composer</span
                          ><strong class="num break-all">{{ info.ussd_code }}</strong>
                        </div>
                      </div>
                      <p class="mt-4 text-sm">{{ info.instructions }}</p>
                      <p class="mt-2 text-xs text-muted">
                        Instructions de votre dernière tentative dans cet onglet. Si vous avez déjà
                        effectué un transfert, ne payez pas une seconde fois.
                      </p>
                      <div class="mt-4 flex flex-wrap gap-2">
                        @if (dialLink(); as link) {
                          <a
                            [href]="link"
                            class="inline-flex h-10 items-center rounded-lg bg-action px-4 text-sm font-semibold text-on-action"
                            >Ouvrir sur mon téléphone</a
                          >
                        }
                        @if (info.ussd_code && dialLink()) {
                          <button
                            type="button"
                            (click)="copy(info.ussd_code)"
                            class="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold"
                          >
                            Copier le code
                          </button>
                        }
                      </div>
                    </div>
                  } @else {
                    <p class="mt-4 rounded-xl bg-bg p-4 text-sm text-muted">
                      Un paiement a été initié pour cette commande. Si vous avez déjà effectué le
                      transfert, saisissez la référence reçue par SMS ci-dessous. Si vous l’avez
                      déjà envoyée, attendez la vérification de la boutique.
                    </p>
                  }
                  <p class="mt-3 text-xs text-muted">
                    🔒 Ne partagez jamais votre code PIN : saisissez-le uniquement sur votre
                    téléphone.
                  </p>

                  @if (referenceSubmitted() && !editingReference()) {
                    <div
                      role="status"
                      class="mt-5 rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100"
                    >
                      <p class="font-bold">Référence enregistrée</p>
                      <p class="mt-1">
                        Le paiement reste en attente jusqu’à sa validation manuelle par un
                        administrateur. Actualisez cette page pour suivre le statut.
                      </p>
                      <button
                        type="button"
                        (click)="editingReference.set(true)"
                        class="mt-2 font-semibold underline"
                      >
                        Saisir une autre référence
                      </button>
                    </div>
                  } @else {
                    <form (ngSubmit)="submitReference(o)" class="mt-5 border-t border-line pt-4">
                      <label for="transaction-reference" class="mb-1 block text-sm font-semibold"
                        >Référence de transaction reçue par SMS</label
                      >
                      <div class="flex flex-col gap-2 sm:flex-row">
                        <input
                          id="transaction-reference"
                          name="reference"
                          [ngModel]="transactionReference()"
                          (ngModelChange)="transactionReference.set($event)"
                          required
                          maxlength="255"
                          placeholder="Ex. MP240101.1234"
                          class="num h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm"
                        />
                        <button
                          type="submit"
                          [disabled]="busy() || !transactionReference().trim()"
                          class="h-11 rounded-lg bg-action px-5 text-sm font-semibold text-on-action disabled:opacity-50"
                        >
                          {{ busy() ? 'Envoi…' : 'Envoyer la référence' }}
                        </button>
                      </div>
                      <p class="mt-2 text-xs text-muted">
                        L’envoi de la référence ne marque pas automatiquement la commande comme
                        payée.
                      </p>
                    </form>
                  }

                  <div class="mt-5 border-t border-line pt-4">
                    <button
                      type="button"
                      (click)="showInitiation.set(!showInitiation())"
                      class="text-sm font-semibold text-primary underline"
                    >
                      {{
                        showInitiation()
                          ? 'Masquer le formulaire'
                          : 'Obtenir de nouvelles instructions de paiement'
                      }}
                    </button>
                    @if (showInitiation()) {
                      <p class="mt-2 text-xs text-muted">
                        Cela peut créer une nouvelle tentative. Ne refaites pas de transfert si vous
                        avez déjà payé.
                      </p>
                    }
                  </div>
                }

                @if (o.status === 'pending' || showInitiation()) {
                  <form (ngSubmit)="initiate(o)" class="mt-5 space-y-4">
                    <fieldset>
                      <legend class="mb-2 text-sm font-semibold">Votre opérateur</legend>
                      <div class="grid gap-3 sm:grid-cols-2">
                        <label
                          class="flex cursor-pointer items-center gap-2 rounded-xl border-2 p-3 text-sm"
                          [class]="
                            operator() === 'orange'
                              ? 'border-action bg-orange-50/60 dark:bg-orange-950/30'
                              : 'border-line bg-bg'
                          "
                        >
                          <input
                            type="radio"
                            name="provider"
                            value="orange"
                            [ngModel]="operator()"
                            (ngModelChange)="operator.set($event)"
                            class="accent-[#F26A0F]"
                          />
                          🟠 <span class="font-bold">Orange Money</span>
                        </label>
                        <label
                          class="flex cursor-pointer items-center gap-2 rounded-xl border-2 p-3 text-sm"
                          [class]="
                            operator() === 'mtn'
                              ? 'border-action bg-yellow-50/60 dark:bg-yellow-950/30'
                              : 'border-line bg-bg'
                          "
                        >
                          <input
                            type="radio"
                            name="provider"
                            value="mtn"
                            [ngModel]="operator()"
                            (ngModelChange)="operator.set($event)"
                            class="accent-[#F26A0F]"
                          />
                          🟡 <span class="font-bold">MTN Mobile Money</span>
                        </label>
                      </div>
                    </fieldset>
                    <div>
                      <label for="pay-phone" class="mb-1 block text-sm font-semibold"
                        >Votre numéro Mobile Money</label
                      >
                      <input
                        id="pay-phone"
                        name="phone"
                        type="tel"
                        inputmode="tel"
                        autocomplete="tel"
                        [ngModel]="phone()"
                        (ngModelChange)="phone.set($event)"
                        (blur)="phoneTouched.set(true)"
                        [attr.aria-invalid]="phoneTouched() && !validPhone() ? 'true' : null"
                        required
                        placeholder="Ex. 694 12 34 56"
                        class="num h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                      />
                      <p class="mt-1 text-xs text-muted">
                        9 chiffres commençant par 6, avec ou sans +237.
                      </p>
                      @if (phoneTouched() && !validPhone()) {
                        <p class="mt-1 text-xs text-red-600">
                          Saisissez un numéro camerounais valide.
                        </p>
                      }
                    </div>
                    <button
                      type="submit"
                      [disabled]="busy() || !validPhone()"
                      class="h-11 w-full rounded-lg bg-action font-semibold text-on-action disabled:opacity-50"
                    >
                      {{ busy() ? 'Préparation…' : 'Obtenir les instructions de paiement' }}
                    </button>
                  </form>
                }
              }
            </section>
          }

          <section class="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 class="mb-4 font-display text-2xl font-bold text-primary">
              Pièces commandées <span class="text-muted">({{ o.items.length }})</span>
            </h2>
            <ul class="divide-y divide-line">
              @for (item of o.items; track $index) {
                <li class="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p class="font-semibold">{{ item.part }}</p>
                    <p class="num text-xs text-muted">
                      Réf. {{ item.reference }} · {{ item.quantity }} × {{ item.unit_price | fcfa }}
                    </p>
                  </div>
                  <span class="num shrink-0 font-bold">{{
                    item.quantity * item.unit_price | fcfa
                  }}</span>
                </li>
              }
            </ul>
          </section>
        </div>
        <aside class="lg:col-span-5">
          <div class="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 class="font-display text-2xl font-bold text-primary">Récapitulatif</h2>
            <div class="mt-4 flex justify-between border-t border-line pt-4 font-bold">
              <span>Montant de la commande</span
              ><span class="num text-xl text-primary">{{ o.total | fcfa }}</span>
            </div>
            <p class="mt-3 text-xs text-muted">
              Ce montant est celui confirmé par la boutique lors de la commande.
            </p>
          </div>
        </aside>
      </div>
    }
  `,
})
export class OrderDetail {
  id = input.required<string>();
  private ordersApi = inject(OrdersApi);
  private sessions = inject(PaymentSessionStore);
  private auth = inject(AuthStore);
  private toast = inject(ToastStore);
  private loadGeneration = 0;

  order = signal<Order | null>(null);
  loading = signal(true);
  error = signal('');
  paymentError = signal('');
  cancelling = signal(false);
  busy = signal(false);
  statusMeta = ORDER_STATUS_META;
  opMeta = OPERATOR_META;

  operator = signal<PaymentOperator>('orange');
  phone = signal('');
  phoneTouched = signal(false);
  transactionReference = signal('');
  instructions = signal<PaymentInstructions | null>(null);
  referenceSubmitted = signal(false);
  editingReference = signal(false);
  showInitiation = signal(false);
  previousAttempt = signal(false);
  timelineSteps = ['Commande créée', 'Paiement confirmé', 'Expédition', 'Livraison'];
  validPhone = computed(() => normalizeCameroonPhone(this.phone()) !== null);
  dialLink = computed(() => safeDialUri(this.instructions()?.dial_uri));
  canCancel = computed(() => ['pending', 'awaiting_payment'].includes(this.order()?.status ?? ''));
  currentStepIndex = computed(() => {
    switch (this.order()?.status) {
      case 'paid':
        return 1;
      case 'shipped':
        return 2;
      case 'delivered':
        return 3;
      default:
        return 0;
    }
  });

  constructor() {
    effect(() => {
      const orderId = this.id();
      untracked(() => this.load(orderId));
    });
  }

  load(orderId: string) {
    const generation = ++this.loadGeneration;
    this.loading.set(true);
    this.error.set('');
    this.ordersApi.order(orderId).subscribe({
      next: (o) => {
        if (generation !== this.loadGeneration) return;
        const userId = this.auth.user()?.id;
        const session = userId == null ? null : this.sessions.get(userId, o.id);
        const navigationState = history.state as {
          orderId?: number;
          instructions?: PaymentInstructions;
          paymentStartError?: string;
        } | null;
        const fromNavigation =
          navigationState?.orderId === o.id ? navigationState.instructions : null;
        this.order.set(o);
        this.instructions.set(
          o.status === 'awaiting_payment'
            ? (session?.instructions ?? fromNavigation ?? null)
            : null,
        );
        this.referenceSubmitted.set(
          o.status === 'awaiting_payment' && !!session?.referenceSubmitted,
        );
        this.previousAttempt.set(o.status === 'pending' && !!session?.referenceSubmitted);
        this.paymentError.set(
          navigationState?.orderId === o.id ? (navigationState.paymentStartError ?? '') : '',
        );
        if (navigationState?.orderId === o.id && navigationState.paymentStartError) {
          const { paymentStartError: _, ...remainingState } = navigationState;
          history.replaceState(remainingState, '');
        }
        this.showInitiation.set(false);
        if (userId != null && ['paid', 'shipped', 'delivered', 'cancelled'].includes(o.status))
          this.sessions.clear(userId, o.id);
        this.loading.set(false);
      },
      error: (e: HttpErrorResponse) => {
        if (generation !== this.loadGeneration) return;
        this.loading.set(false);
        this.error.set(
          e.status === 404
            ? 'Commande introuvable.'
            : e.status === 403
              ? 'Vous ne pouvez pas accéder à cette commande.'
              : 'Impossible de charger cette commande.',
        );
      },
    });
  }

  initiate(o: Order) {
    const phone = normalizeCameroonPhone(this.phone());
    if (this.busy() || !phone) return;
    this.busy.set(true);
    this.paymentError.set('');
    this.ordersApi.initiatePayment(o.id, { provider: this.operator(), phone }).subscribe({
      next: (info) => {
        const userId = this.auth.user()?.id;
        if (userId != null) this.sessions.saveInstructions(userId, o.id, info);
        this.instructions.set(info);
        history.replaceState(
          { ...history.state, orderId: o.id, instructions: info, paymentStartError: undefined },
          '',
        );
        this.order.set({ ...o, status: info.order_status });
        this.referenceSubmitted.set(false);
        this.previousAttempt.set(false);
        this.showInitiation.set(false);
        this.busy.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.paymentError.set(
          e.error?.errors?.phone?.[0] ?? e.error?.message ?? 'Impossible d’initier le paiement.',
        );
      },
    });
  }

  submitReference(o: Order) {
    const reference = this.transactionReference().trim();
    if (this.busy() || !reference) return;
    this.busy.set(true);
    this.paymentError.set('');
    this.ordersApi.submitReference(o.id, reference).subscribe({
      next: () => {
        const userId = this.auth.user()?.id;
        if (userId != null) this.sessions.markReferenceSubmitted(userId, o.id);
        this.referenceSubmitted.set(true);
        this.editingReference.set(false);
        this.transactionReference.set('');
        this.busy.set(false);
        this.toast.success('Référence enregistrée. En attente de validation.');
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.paymentError.set(
          e.error?.errors?.transaction_reference?.[0] ??
            e.error?.message ??
            'Impossible d’enregistrer la référence.',
        );
      },
    });
  }

  async copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.info('Code copié.');
    } catch {
      this.toast.error('Copie impossible. Vous pouvez recopier le code affiché.');
    }
  }

  cancelOrder(o: Order) {
    if (this.cancelling() || this.busy()) return;
    const warning =
      o.status === 'awaiting_payment'
        ? ' Si vous avez déjà payé, l’annulation ne déclenche pas automatiquement un remboursement : contactez la boutique.'
        : '';
    if (!confirm(`Voulez-vous vraiment annuler la commande n°${o.id} ?${warning}`)) return;
    this.cancelling.set(true);
    this.ordersApi.cancel(o.id).subscribe({
      next: (updated) => {
        const userId = this.auth.user()?.id;
        if (userId != null) this.sessions.clear(userId, o.id);
        this.order.set(updated);
        this.cancelling.set(false);
        this.toast.info(`Commande n°${o.id} annulée.`);
      },
      error: (e: HttpErrorResponse) => {
        this.cancelling.set(false);
        this.toast.error(e.error?.message ?? 'Annulation impossible.');
      },
    });
  }
}
