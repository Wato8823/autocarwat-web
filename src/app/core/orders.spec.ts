import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { demoInterceptor } from './demo.interceptor';
import { DemoModeService } from './demo-mode';
import { normalizeCameroonPhone, safeDialUri } from './models';
import { OrdersApi } from './orders';

describe('Contrat commandes et paiements', () => {
  let api: OrdersApi;
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([demoInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    api = TestBed.inject(OrdersApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('envoie uniquement les articles puis provider et phone, et ensuite la référence SMS', () => {
    api.create({ items: [{ part_id: 4, quantity: 2 }] }).subscribe();
    const create = http.expectOne('/api/orders');
    expect(create.request.body).toEqual({ items: [{ part_id: 4, quantity: 2 }] });
    create.flush(
      { id: 11, status: 'pending', total: 15000, created_at: '2026-01-01', items: [] },
      { status: 201, statusText: 'Created' },
    );

    api.initiatePayment(11, { provider: 'mtn', phone: '694123456' }).subscribe();
    const initiate = http.expectOne('/api/orders/11/payment');
    expect(initiate.request.method).toBe('POST');
    expect(initiate.request.body).toEqual({ provider: 'mtn', phone: '694123456' });
    initiate.flush(
      {
        payment_id: 12,
        order_status: 'awaiting_payment',
        provider: 'mtn',
        amount: 15000,
        cashier_number: '600000000',
        ussd_code: '*126#',
        dial_uri: 'tel:*126%23',
        instructions: 'Instructions',
      },
      { status: 201, statusText: 'Created' },
    );

    api.submitReference(11, 'MP240101.1234').subscribe();
    const reference = http.expectOne('/api/orders/11/payment/reference');
    expect(reference.request.body).toEqual({ transaction_reference: 'MP240101.1234' });
    reference.flush({ message: 'En attente de validation.' });
  });

  it('normalise la pagination Laravel et conserve les pages de commandes', () => {
    api.myOrders(2).subscribe((result) => {
      expect(result.meta).toEqual({ current_page: 2, last_page: 3, total: 22, per_page: 10 });
      expect(result.data[0].id).toBe(11);
    });
    const req = http.expectOne((r) => r.url === '/api/orders' && r.params.get('page') === '2');
    req.flush({
      data: [{ id: 11, status: 'pending', total: 0, created_at: '', items: [] }],
      current_page: 2,
      last_page: 3,
      total: 22,
      per_page: 10,
    });
  });

  it('ne remplace pas une erreur 503 de paiement par une démo', () => {
    TestBed.inject(DemoModeService).reconnectApi();
    let status = 0;
    api
      .initiatePayment(11, { provider: 'orange', phone: '694123456' })
      .subscribe({ error: (e) => (status = e.status) });
    http
      .expectOne('/api/orders/11/payment')
      .flush(
        { message: 'Moyen indisponible.' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    expect(status).toBe(503);
    expect(TestBed.inject(DemoModeService).isActive()).toBe(false);
  });
});

describe('Validation Mobile Money', () => {
  it('accepte uniquement les formats camerounais documentés', () => {
    expect(normalizeCameroonPhone('694 12 34 56')).toBe('694123456');
    expect(normalizeCameroonPhone('+237 694 12 34 56')).toBe('694123456');
    expect(normalizeCameroonPhone('594123456')).toBeNull();
    expect(normalizeCameroonPhone('69412345')).toBeNull();
    expect(normalizeCameroonPhone('+2376941234567')).toBeNull();
    expect(normalizeCameroonPhone('69412345a')).toBeNull();
  });
  it('ne permet que les liens téléphoniques USSD', () => {
    expect(safeDialUri('tel:*150*600000000*5000%23')).toBe('tel:*150*600000000*5000%23');
    expect(safeDialUri('javascript:alert(1)')).toBeNull();
    expect(safeDialUri('https://example.com')).toBeNull();
  });
});
