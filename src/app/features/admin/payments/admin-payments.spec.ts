import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminPayments } from './admin-payments';

describe('AdminPayments', () => {
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPayments],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('annule la requête précédente quand le filtre change rapidement', () => {
    const component = TestBed.createComponent(AdminPayments).componentInstance;
    const first = http.expectOne(
      (req) => req.url === '/api/admin/payments' && req.params.get('status') === 'initiated',
    );
    component.setStatus('confirmed');
    expect(first.cancelled).toBe(true);
    const second = http.expectOne(
      (req) => req.url === '/api/admin/payments' && req.params.get('status') === 'confirmed',
    );
    second.flush({ data: [], current_page: 1, last_page: 1, total: 0, per_page: 20 });
    expect(component.status()).toBe('confirmed');
    expect(component.loading()).toBe(false);
  });

  it('revient à la dernière page disponible après la suppression du dernier résultat', () => {
    const component = TestBed.createComponent(AdminPayments).componentInstance;
    http
      .expectOne((req) => req.url === '/api/admin/payments')
      .flush({ data: [], current_page: 1, last_page: 2, total: 21, per_page: 20 });
    component.load(2);
    http
      .expectOne((req) => req.params.get('page') === '2')
      .flush({ data: [], current_page: 2, last_page: 1, total: 20, per_page: 20 });
    http
      .expectOne((req) => req.params.get('page') === '1')
      .flush({ data: [], current_page: 1, last_page: 1, total: 20, per_page: 20 });
    expect(component.page()).toBe(1);
  });
});
