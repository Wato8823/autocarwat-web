import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CatalogApi } from './catalog';

describe('CatalogApi', () => {
  let api: CatalogApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CatalogApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('gère la pagination Laravel et réécrit les images localhost pour le proxy', () => {
    api.parts({ search: 'filtre', page: 2 }).subscribe((result) => {
      expect(result.meta.last_page).toBe(3);
      expect(result.data[0].image_url).toBe('/storage/parts/filtre.jpg');
    });
    const req = http.expectOne((r) => r.url === '/api/parts' && r.params.get('page') === '2');
    expect(req.request.params.get('search')).toBe('filtre');
    expect(req.request.params.has('sort')).toBe(false);
    req.flush({
      current_page: 2,
      last_page: 3,
      total: 40,
      per_page: 15,
      data: [{ id: 1, image_url: 'http://localhost:8000/storage/parts/filtre.jpg' }],
    });
  });

  it('charge toutes les pages de véhicules pour le sélecteur', () => {
    let ids: number[] = [];
    api.vehicles().subscribe((vehicles) => (ids = vehicles.map((v) => v.id)));
    http
      .expectOne((r) => r.url === '/api/vehicles' && r.params.get('page') === '1')
      .flush({ data: [{ id: 1 }], current_page: 1, last_page: 2, total: 2, per_page: 1 });
    http
      .expectOne((r) => r.url === '/api/vehicles' && r.params.get('page') === '2')
      .flush({ data: [{ id: 2 }], current_page: 2, last_page: 2, total: 2, per_page: 1 });
    expect(ids).toEqual([1, 2]);
  });
});
