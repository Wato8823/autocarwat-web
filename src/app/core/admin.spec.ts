import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminApi } from './admin';

describe('AdminApi', () => {
  let api: AdminApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('utilise les vrais statuts et les routes confirm/reject', () => {
    api.payments('initiated', 2).subscribe((result) => expect(result.meta.total).toBe(21));
    http
      .expectOne(
        (r) =>
          r.url === '/api/admin/payments' &&
          r.params.get('status') === 'initiated' &&
          r.params.get('page') === '2',
      )
      .flush({ data: [], current_page: 2, last_page: 2, total: 21, per_page: 20 });
    api.confirmPayment(12).subscribe();
    const confirm = http.expectOne('/api/admin/payments/12/confirm');
    expect(confirm.request.body).toEqual({});
    confirm.flush({ id: 12, status: 'confirmed' });
    api.rejectPayment(13).subscribe();
    const reject = http.expectOne('/api/admin/payments/13/reject');
    expect(reject.request.body).toEqual({});
    reject.flush({ id: 13, status: 'rejected' });
  });

  it('crée la pièce en multipart et synchronise les véhicules séparément', () => {
    api
      .createPart({
        name: 'Filtre',
        reference: 'F-1',
        category_id: 3,
        brand_id: 2,
        price: 5000,
        stock: 4,
      })
      .subscribe();
    const create = http.expectOne('/api/admin/parts');
    expect(create.request.body instanceof FormData).toBe(true);
    expect(create.request.body.get('category_id')).toBe('3');
    expect(create.request.body.get('brand_id')).toBe('2');
    create.flush({ id: 4, name: 'Filtre', image_url: null });
    api.syncPartVehicles(4, [1, 3]).subscribe();
    const sync = http.expectOne('/api/admin/parts/4/vehicles');
    expect(sync.request.method).toBe('PUT');
    expect(sync.request.body).toEqual({ vehicle_ids: [1, 3] });
    sync.flush({ message: 'Compatibilité mise à jour.' });
  });
});
