import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthStore } from '../../../core/auth';
import { CartStore } from '../../../core/cart';
import { PaymentSessionStore } from '../../../core/payment-session';
import { Checkout } from './checkout';

describe('Checkout', () => {
  let http: HttpTestingController;
  let cart: CartStore;
  let checkout: Checkout;
  let navigate: ReturnType<typeof vi.spyOn>;
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    TestBed.inject(AuthStore).user.set({
      id: 4,
      name: 'Client',
      email: 'client@example.com',
      is_admin: false,
    });
    cart = TestBed.inject(CartStore);
    cart.add(
      {
        id: 7,
        name: 'Filtre',
        reference: 'REF-7',
        oem_number: null,
        description: null,
        price: 5000,
        stock: 3,
        image_url: null,
      },
      2,
    );
    checkout = TestBed.createComponent(Checkout).componentInstance;
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('crée une seule commande et initie le paiement avec le numéro du client', () => {
    checkout.phone.set('+237 694 12 34 56');
    checkout.operator.set('mtn');
    checkout.submit();
    checkout.submit();
    // Le choix initial reste figé même si le formulaire change pendant la requête.
    checkout.operator.set('orange');
    const create = http.expectOne('/api/orders');
    expect(create.request.body).toEqual({ items: [{ part_id: 7, quantity: 2 }] });
    create.flush({ id: 11, status: 'pending', total: 11000, created_at: '', items: [] });
    expect(cart.isEmpty()).toBe(true);
    const payment = http.expectOne('/api/orders/11/payment');
    expect(payment.request.body).toEqual({ provider: 'mtn', phone: '694123456' });
    const info = {
      payment_id: 12,
      order_status: 'awaiting_payment',
      provider: 'mtn',
      amount: 11000,
      cashier_number: '600000000',
      ussd_code: '*126#',
      dial_uri: 'tel:*126%23',
      instructions: 'Payer puis saisir la référence.',
    };
    payment.flush(info, { status: 201, statusText: 'Created' });
    expect(TestBed.inject(PaymentSessionStore).get(4, 11)?.instructions).toEqual(info);
    expect(navigate).toHaveBeenCalledWith(
      ['/commandes', 11],
      expect.objectContaining({ state: expect.objectContaining({ orderId: 11 }) }),
    );
  });

  it('conserve la commande créée et propose de reprendre si le paiement échoue', () => {
    checkout.phone.set('694123456');
    checkout.submit();
    http
      .expectOne('/api/orders')
      .flush({ id: 22, status: 'pending', total: 10000, created_at: '', items: [] });
    http
      .expectOne('/api/orders/22/payment')
      .flush({ message: 'Compte non configuré.' }, { status: 503, statusText: 'Unavailable' });
    expect(cart.isEmpty()).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/commandes', 22], {
      state: { orderId: 22, paymentStartError: 'Compte non configuré.' },
    });
  });

  it('ne crée pas de commande avec un numéro invalide', () => {
    checkout.phone.set('123');
    checkout.submit();
    http.expectNone('/api/orders');
    expect(cart.isEmpty()).toBe(false);
  });
});
