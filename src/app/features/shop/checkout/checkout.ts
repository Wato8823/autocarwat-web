import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/auth';
import { CartStore } from '../../../core/cart';
import { PaymentOperator, normalizeCameroonPhone } from '../../../core/models';
import { OrdersApi } from '../../../core/orders';
import { PaymentSessionStore } from '../../../core/payment-session';
import { ToastStore } from '../../../core/toast';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, FcfaPipe],
  template: `
    <div class="mb-6">
      <a routerLink="/panier" class="text-sm text-muted underline hover:text-primary"
        >← Retour au panier</a
      >
      <h1 class="mt-1 font-display text-4xl font-bold text-primary">Finaliser ma commande</h1>
      <p class="mt-1 text-sm text-muted">Un paiement simple, en toute transparence.</p>
    </div>

    @if (submitting() && cart.isEmpty()) {
      <div class="rounded-2xl border border-line bg-surface p-8 text-center" role="status">
        <p class="font-semibold text-primary">
          Commande enregistrée. Préparation des instructions de paiement…
        </p>
        <p class="mt-2 text-sm text-muted">
          Ne fermez pas cette page. Vous retrouverez votre commande dans « Mes commandes ».
        </p>
      </div>
    } @else if (cart.isEmpty()) {
      <div class="rounded-2xl border border-line bg-surface p-8 text-center">
        <p class="text-lg font-semibold">Votre panier est vide.</p>
        <a
          routerLink="/pieces"
          class="mt-4 inline-flex h-11 items-center rounded-lg bg-action px-5 font-semibold text-on-action"
          >Parcourir le catalogue</a
        >
      </div>
    } @else {
      <form (ngSubmit)="submit()" class="grid gap-6 lg:grid-cols-12">
        <div class="space-y-5 lg:col-span-7">
          <section class="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div class="mb-5 flex items-start gap-3">
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-action/10 text-xl"
                aria-hidden="true"
                >📱</span
              >
              <div>
                <h2 class="font-display text-2xl font-bold text-primary">Paiement Mobile Money</h2>
                <p class="mt-1 text-sm text-muted">
                  Choisissez votre opérateur et indiquez uniquement le numéro qui effectuera le
                  paiement.
                </p>
              </div>
            </div>

            <fieldset>
              <legend class="mb-2 text-sm font-semibold">Votre opérateur</legend>
              <div class="grid gap-3 sm:grid-cols-2">
                <label
                  class="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition"
                  [class]="
                    operator() === 'orange'
                      ? 'border-action bg-orange-50/70 dark:bg-orange-950/30'
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
                  <span class="text-xl" aria-hidden="true">🟠</span>
                  <span class="font-bold">Orange Money</span>
                </label>
                <label
                  class="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition"
                  [class]="
                    operator() === 'mtn'
                      ? 'border-action bg-yellow-50/70 dark:bg-yellow-950/30'
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
                  <span class="text-xl" aria-hidden="true">🟡</span>
                  <span class="font-bold">MTN Mobile Money</span>
                </label>
              </div>
            </fieldset>

            <div class="mt-5">
              <label for="payer-phone" class="mb-1 block text-sm font-semibold"
                >Votre numéro Mobile Money</label
              >
              <input
                id="payer-phone"
                name="phone"
                type="tel"
                inputmode="tel"
                autocomplete="tel"
                [ngModel]="phone()"
                (ngModelChange)="phone.set($event)"
                (blur)="phoneTouched.set(true)"
                [attr.aria-invalid]="phoneTouched() && !validPhone() ? 'true' : null"
                aria-describedby="phone-help"
                required
                placeholder="Ex. 694 12 34 56"
                class="num h-12 w-full rounded-lg border border-line bg-bg px-3 text-sm focus-visible:outline-2 focus-visible:outline-action"
              />
              <p id="phone-help" class="mt-1.5 text-xs text-muted">
                9 chiffres commençant par 6, avec ou sans l’indicatif +237.
              </p>
              @if (phoneTouched() && !validPhone()) {
                <p class="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  Saisissez un numéro camerounais valide.
                </p>
              }
            </div>
          </section>

          <section class="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 class="font-display text-xl font-bold text-primary">Comment ça marche ?</h2>
            <ol class="mt-4 space-y-3 text-sm">
              <li class="flex gap-3">
                <span
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg font-bold text-primary"
                  >1</span
                ><span
                  >La commande est créée et les coordonnées de paiement sont fournies par la
                  boutique.</span
                >
              </li>
              <li class="flex gap-3">
                <span
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg font-bold text-primary"
                  >2</span
                ><span
                  >Effectuez le transfert depuis votre téléphone à l’aide des instructions
                  affichées.</span
                >
              </li>
              <li class="flex gap-3">
                <span
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg font-bold text-primary"
                  >3</span
                ><span
                  >Saisissez la référence reçue par SMS. Un administrateur vérifiera ensuite votre
                  paiement.</span
                >
              </li>
            </ol>
            <p class="mt-4 rounded-xl bg-bg p-3 text-xs text-muted">
              🔒 Votre code PIN reste sur votre téléphone. Ne le saisissez jamais sur ce site et ne
              le partagez pas.
            </p>
          </section>
        </div>

        <aside class="lg:col-span-5">
          <div class="sticky top-20 rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 class="mb-4 font-display text-2xl font-bold text-primary">
              Votre commande <span class="text-muted">({{ cart.totalItems() }})</span>
            </h2>
            <ul class="max-h-64 divide-y divide-line overflow-y-auto pr-1 text-sm">
              @for (item of cart.items(); track item.part.id) {
                <li class="flex justify-between gap-3 py-3">
                  <div class="min-w-0">
                    <p class="font-medium">{{ item.part.name }}</p>
                    <p class="num text-xs text-muted">
                      Qté {{ item.quantity }} × {{ item.part.price | fcfa }}
                    </p>
                  </div>
                  <span class="num shrink-0 font-semibold">{{
                    item.part.price * item.quantity | fcfa
                  }}</span>
                </li>
              }
            </ul>
            <div class="mt-3 flex justify-between border-t border-line pt-4 font-bold">
              <span>Total estimé</span
              ><span class="num text-xl text-primary">{{ cart.subtotal() | fcfa }}</span>
            </div>
            <p class="mt-2 text-xs text-muted">
              Le montant final et la disponibilité sont confirmés par l’API lors de la création de
              la commande.
            </p>
            @if (error()) {
              <p
                role="alert"
                class="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
              >
                {{ error() }}
              </p>
            }
            <button
              type="submit"
              [disabled]="submitting() || !validPhone()"
              class="mt-5 h-12 w-full rounded-lg bg-action font-semibold text-on-action transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ submitting() ? 'Création en cours…' : 'Créer la commande et continuer →' }}
            </button>
          </div>
        </aside>
      </form>
    }
  `,
})
export class Checkout {
  cart = inject(CartStore);
  private auth = inject(AuthStore);
  private ordersApi = inject(OrdersApi);
  private sessions = inject(PaymentSessionStore);
  private toast = inject(ToastStore);
  private router = inject(Router);

  operator = signal<PaymentOperator>('orange');
  phone = signal('');
  phoneTouched = signal(false);
  submitting = signal(false);
  error = signal('');
  validPhone = computed(() => normalizeCameroonPhone(this.phone()) !== null);

  submit() {
    const phone = normalizeCameroonPhone(this.phone());
    if (this.submitting() || !phone || this.cart.isEmpty()) return;
    this.submitting.set(true);
    this.error.set('');
    const userId = this.auth.user()?.id;
    const provider = this.operator();
    const items = this.cart.items().map((i) => ({ part_id: i.part.id, quantity: i.quantity }));

    this.ordersApi.create({ items }).subscribe({
      next: (order) => {
        // Dès que l'API a créé la commande, ne jamais recréer les mêmes articles sur une erreur de paiement.
        this.cart.clear();
        this.ordersApi.initiatePayment(order.id, { provider, phone }).subscribe({
          next: (instructions) => {
            if (userId != null) this.sessions.saveInstructions(userId, order.id, instructions);
            this.toast.success(
              `Commande n°${order.id} créée. Suivez les instructions de paiement.`,
            );
            this.router.navigate(['/commandes', order.id], {
              state: { orderId: order.id, instructions },
            });
          },
          error: (e: HttpErrorResponse) => {
            const message =
              e.error?.message || 'Impossible de préparer les instructions de paiement.';
            this.toast.error('Commande créée, mais le paiement n’a pas pu être initié.');
            this.router.navigate(['/commandes', order.id], {
              state: { orderId: order.id, paymentStartError: message },
            });
          },
        });
      },
      error: (e: HttpErrorResponse) => {
        this.submitting.set(false);
        const message =
          e.error?.message ||
          (e.status === 0
            ? 'Impossible de joindre le serveur.'
            : 'Impossible de créer la commande.');
        this.error.set(
          `${message} Si la connexion a été interrompue, vérifiez vos commandes avant de réessayer.`,
        );
      },
    });
  }
}
