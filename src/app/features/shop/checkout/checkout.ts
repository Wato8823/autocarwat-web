import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { fieldErrors, globalError } from '../../../core/api-errors';
import { AuthStore } from '../../../core/auth';
import { CartStore } from '../../../core/cart';
import { CAMEROON_CITIES, CreateOrderPayload, PaymentOperator } from '../../../core/models';
import { OrdersApi } from '../../../core/orders';
import { ToastStore } from '../../../core/toast';
import { FcfaPipe } from '../../../shared/fcfa-pipe';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, FcfaPipe],
  template: `
    <div class="mb-6">
      <a routerLink="/panier" class="text-sm text-muted underline hover:text-primary">
        ← Retour au panier
      </a>
      <h1 class="mt-1 font-display text-4xl font-bold text-primary">Finaliser ma commande</h1>
    </div>

    @if (cart.isEmpty()) {
      <div class="rounded-2xl border border-line bg-surface p-8 text-center">
        <p class="text-lg font-semibold">Votre panier est vide.</p>
        <a
          routerLink="/pieces"
          class="mt-4 inline-flex h-11 items-center rounded-lg bg-action px-5 font-semibold text-on-action"
        >
          Parcourir le catalogue
        </a>
      </div>
    } @else {
      <form (ngSubmit)="submit()" class="grid gap-6 lg:grid-cols-12">
        <div class="space-y-6 lg:col-span-7">
          <!-- Étape 1 : Livraison -->
          <section class="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 class="mb-4 font-display text-2xl font-bold text-primary">
              1. Coordonnées & Adresse de livraison
            </h2>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium" for="cname">Nom du destinataire *</label>
                <input
                  id="cname"
                  name="cname"
                  [ngModel]="customerName()"
                  (ngModelChange)="customerName.set($event)"
                  required
                  class="h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                />
                @if (errors()['customer_name']) {
                  <p class="mt-1 text-xs text-red-600">{{ errors()['customer_name'] }}</p>
                }
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium" for="cphone">Téléphone joignable *</label>
                <input
                  id="cphone"
                  name="cphone"
                  type="tel"
                  [ngModel]="customerPhone()"
                  (ngModelChange)="customerPhone.set($event)"
                  required
                  placeholder="Ex. 694 12 34 56"
                  class="num h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                />
                @if (errors()['customer_phone']) {
                  <p class="mt-1 text-xs text-red-600">{{ errors()['customer_phone'] }}</p>
                }
              </div>
            </div>

            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm font-medium" for="scity">Ville *</label>
                <select
                  id="scity"
                  name="scity"
                  [ngModel]="shippingCity()"
                  (ngModelChange)="shippingCity.set($event)"
                  class="h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                >
                  @for (c of cities; track c.name) {
                    <option [value]="c.name">{{ c.name }} ({{ c.delay }})</option>
                  }
                </select>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium" for="saddr">Quartier & repère précis *</label>
                <input
                  id="saddr"
                  name="saddr"
                  [ngModel]="shippingAddress()"
                  (ngModelChange)="shippingAddress.set($event)"
                  required
                  placeholder="Ex. Akwa, face Pharmacie du Centre"
                  class="h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                />
                @if (errors()['shipping_address']) {
                  <p class="mt-1 text-xs text-red-600">{{ errors()['shipping_address'] }}</p>
                }
              </div>
            </div>

            <div class="mt-4">
              <label class="mb-1 block text-sm font-medium" for="snotes">
                Instructions pour le livreur <span class="text-xs font-normal text-muted">(optionnel)</span>
              </label>
              <input
                id="snotes"
                name="snotes"
                [ngModel]="notes()"
                (ngModelChange)="notes.set($event)"
                placeholder="Ex. Appeler 15 minutes avant l'arrivée…"
                class="h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
              />
            </div>
          </section>

          <!-- Étape 2 : Paiement Mobile Money -->
          <section class="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 class="mb-1 font-display text-2xl font-bold text-primary">
              2. Paiement Mobile Money
            </h2>
            <p class="mb-4 text-sm text-muted">
              Effectuez le règlement sur notre compte marchand puis indiquez la référence SMS pour validation par l’administrateur.
            </p>

            <!-- Choix opérateur -->
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                (click)="operator.set('orange_money')"
                class="flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition"
                [class]="
                  operator() === 'orange_money'
                    ? 'border-action bg-orange-50/70 dark:bg-orange-950/30'
                    : 'border-line bg-bg'
                "
              >
                <span class="text-2xl" aria-hidden="true">🟠</span>
                <div>
                  <span class="block font-bold">Orange Money</span>
                  <span class="num text-xs text-muted">{{ merchant.orangeMoney.code }}</span>
                </div>
              </button>

              <button
                type="button"
                (click)="operator.set('mtn_momo')"
                class="flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition"
                [class]="
                  operator() === 'mtn_momo'
                    ? 'border-action bg-yellow-50/70 dark:bg-yellow-950/30'
                    : 'border-line bg-bg'
                "
              >
                <span class="text-2xl" aria-hidden="true">🟡</span>
                <div>
                  <span class="block font-bold">MTN Mobile Money</span>
                  <span class="num text-xs text-muted">{{ merchant.mtnMomo.code }}</span>
                </div>
              </button>
            </div>

            <!-- Instructions marchand -->
            <div class="mt-4 rounded-xl border border-line bg-bg p-4 text-sm">
              <p class="font-semibold text-primary">
                Coordonnées de paiement {{ operator() === 'orange_money' ? 'Orange Money' : 'MTN MoMo' }} :
              </p>
              <div class="mt-2 grid gap-2 sm:grid-cols-3">
                <div>
                  <span class="block text-xs text-muted">Numéro marchand</span>
                  <button
                    type="button"
                    (click)="copy(activeMerchant().number)"
                    class="num font-bold hover:text-action"
                  >
                    {{ activeMerchant().number }} 📋
                  </button>
                </div>
                <div>
                  <span class="block text-xs text-muted">Nom du compte</span>
                  <span class="font-bold">{{ activeMerchant().holder }}</span>
                </div>
                <div>
                  <span class="block text-xs text-muted">Montant exact</span>
                  <span class="num font-bold text-primary">{{ total() | fcfa }}</span>
                </div>
              </div>
            </div>

            <!-- Option envoyer maintenant vs plus tard -->
            <div class="mt-4 flex flex-wrap gap-3 text-sm">
              <label class="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="payTiming"
                  [checked]="submitProofNow()"
                  (change)="submitProofNow.set(true)"
                  class="accent-[#F26A0F]"
                />
                <span class="font-medium">J'ai déjà payé — envoyer la référence maintenant</span>
              </label>
              <label class="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="payTiming"
                  [checked]="!submitProofNow()"
                  (change)="submitProofNow.set(false)"
                  class="accent-[#F26A0F]"
                />
                <span class="text-muted">Payer et envoyer la référence juste après</span>
              </label>
            </div>

            @if (submitProofNow()) {
              <div class="mt-4 space-y-4 border-t border-line pt-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-sm font-medium" for="sphone">
                      Numéro émetteur {{ operator() === 'orange_money' ? 'OM' : 'MoMo' }} *
                    </label>
                    <input
                      id="sphone"
                      name="sphone"
                      type="tel"
                      [ngModel]="senderPhone()"
                      (ngModelChange)="senderPhone.set($event)"
                      required
                      placeholder="Ex. 694 12 34 56"
                      class="num h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
                    />
                  </div>

                  <div>
                    <label class="mb-1 block text-sm font-medium" for="txref">
                      Référence / ID de transaction SMS *
                    </label>
                    <input
                      id="txref"
                      name="txref"
                      [ngModel]="transactionRef()"
                      (ngModelChange)="transactionRef.set($event)"
                      required
                      placeholder="Ex. MP261028.1432.A84921"
                      class="num h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label class="mb-1 block text-sm font-medium" for="proof">
                    Capture d’écran du SMS / reçu <span class="text-xs font-normal text-muted">(optionnel, max 2 Mo)</span>
                  </label>
                  <input
                    id="proof"
                    type="file"
                    accept="image/*"
                    (change)="onFileSelected($event)"
                    class="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white dark:file:text-[#0F1B2A]"
                  />
                  @if (proofPreview()) {
                    <div class="mt-2 flex items-center gap-3">
                      <img
                        [src]="proofPreview()!"
                        alt="Aperçu justificatif"
                        class="h-16 w-16 rounded-lg border border-line object-cover"
                      />
                      <span class="truncate text-xs text-muted">{{ proofName() }}</span>
                      <button
                        type="button"
                        (click)="clearProof()"
                        class="text-xs text-red-600 underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          </section>
        </div>

        <!-- Colonne Récapitulatif -->
        <aside class="lg:col-span-5">
          <div class="sticky top-20 rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 class="mb-4 font-display text-2xl font-bold text-primary">
              Votre commande ({{ cart.totalItems() }})
            </h2>

            <ul class="max-h-64 divide-y divide-line overflow-y-auto pr-1 text-sm">
              @for (item of cart.items(); track item.part.id) {
                <li class="flex items-center justify-between gap-3 py-2.5">
                  <div class="min-w-0">
                    <p class="truncate font-medium">{{ item.part.name }}</p>
                    <p class="num text-xs text-muted">
                      Qté {{ item.quantity }} × {{ item.part.price | fcfa }}
                    </p>
                  </div>
                  <span class="num shrink-0 font-semibold">
                    {{ item.part.price * item.quantity | fcfa }}
                  </span>
                </li>
              }
            </ul>

            <dl class="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div class="flex justify-between">
                <dt class="text-muted">Sous-total</dt>
                <dd class="num font-semibold">{{ cart.subtotal() | fcfa }}</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-muted">Livraison ({{ shippingCity() }})</dt>
                <dd class="num font-semibold">
                  {{ shippingFee() === 0 ? 'Offerte' : (shippingFee() | fcfa) }}
                </dd>
              </div>
              <div class="flex justify-between border-t border-line pt-3 text-base font-bold">
                <dt>Total à payer</dt>
                <dd class="num text-xl text-primary">{{ total() | fcfa }}</dd>
              </div>
            </dl>

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
              [disabled]="submitting() || !canSubmit()"
              class="mt-5 h-12 w-full rounded-lg bg-action font-semibold text-on-action transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{
                submitting()
                  ? 'Enregistrement…'
                  : submitProofNow()
                    ? 'Valider ma commande & envoyer la preuve'
                    : 'Enregistrer ma commande'
              }}
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
  private toast = inject(ToastStore);
  private router = inject(Router);

  cities = CAMEROON_CITIES;
  merchant = environment.merchant;

  customerName = signal(this.auth.user()?.name ?? '');
  customerPhone = signal(this.auth.user()?.phone ?? '');
  shippingCity = signal(CAMEROON_CITIES[0].name);
  shippingAddress = signal('');
  notes = signal('');

  operator = signal<PaymentOperator>('orange_money');
  submitProofNow = signal(true);
  senderPhone = signal(this.auth.user()?.phone ?? '');
  transactionRef = signal('');
  proofPreview = signal<string | null>(null);
  proofName = signal<string | null>(null);

  submitting = signal(false);
  error = signal('');
  errors = signal<Record<string, string>>({});

  shippingFee = computed(() => this.cart.shippingFor(this.shippingCity()));
  total = computed(() => this.cart.subtotal() + this.shippingFee());

  activeMerchant = computed(() =>
    this.operator() === 'orange_money' ? this.merchant.orangeMoney : this.merchant.mtnMomo,
  );

  canSubmit = computed(() => {
    const baseOk =
      !!this.customerName().trim() &&
      !!this.customerPhone().trim() &&
      !!this.shippingCity().trim() &&
      !!this.shippingAddress().trim() &&
      !this.cart.isEmpty();
    if (!baseOk) return false;
    if (this.submitProofNow()) {
      return !!this.senderPhone().trim() && !!this.transactionRef().trim();
    }
    return true;
  });

  copy(text: string) {
    navigator.clipboard?.writeText(text.replace(/\s+/g, ''));
    this.toast.info(`Numéro ${text} copié.`);
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.toast.error('L’image dépasse la limite de 2 Mo.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.proofPreview.set(typeof reader.result === 'string' ? reader.result : null);
      this.proofName.set(file.name);
    };
    reader.readAsDataURL(file);
  }

  clearProof() {
    this.proofPreview.set(null);
    this.proofName.set(null);
  }

  submit() {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.error.set('');
    this.errors.set({});

    const payload: CreateOrderPayload = {
      customer_name: this.customerName().trim(),
      customer_phone: this.customerPhone().trim(),
      shipping_city: this.shippingCity().trim(),
      shipping_address: this.shippingAddress().trim(),
      notes: this.notes().trim() || undefined,
      items: this.cart.items().map(i => ({ part_id: i.part.id, quantity: i.quantity })),
      payment: this.submitProofNow()
        ? {
            operator: this.operator(),
            sender_phone: this.senderPhone().trim(),
            transaction_ref: this.transactionRef().trim(),
            proof_url: this.proofPreview(),
            proof_name: this.proofName(),
          }
        : undefined,
    };

    this.ordersApi.create(payload).subscribe({
      next: order => {
        this.cart.clear();
        this.toast.success(`Commande ${order.order_number} créée avec succès !`);
        this.router.navigate(['/commandes', order.id]);
      },
      error: (e: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errors.set(fieldErrors(e));
        this.error.set(globalError(e) || e.error?.message || 'Erreur lors de la commande.');
      },
    });
  }
}
