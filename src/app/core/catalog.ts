import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Paginated, Part, PartFilters, Vehicle } from './models';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  parts(f: PartFilters) {
    let params = new HttpParams().set('page', f.page ?? 1);
    if (f.per_page) params = params.set('per_page', f.per_page);
    if (f.search?.trim()) params = params.set('search', f.search.trim());
    if (f.vehicle_id) params = params.set('vehicle_id', f.vehicle_id);
    if (f.category?.trim()) params = params.set('category', f.category.trim());
    if (f.brand?.trim()) params = params.set('brand', f.brand.trim());
    if (f.in_stock) params = params.set('in_stock', '1');
    if (f.sort && f.sort !== 'newest') params = params.set('sort', f.sort);
    return this.http.get<Paginated<Part>>(`${this.api}/parts`, { params });
  }

  part(id: number | string) {
    return this.http
      .get<{ data: Part } | Part>(`${this.api}/parts/${id}`)
      .pipe(map(res => ('data' in res ? res.data : res)));
  }

  vehicles() {
    return this.http
      .get<{ data: Vehicle[] } | Vehicle[]>(`${this.api}/vehicles`)
      .pipe(map(res => (Array.isArray(res) ? res : res.data)));
  }
}

/** Véhicule choisi par le client, mémorisé dans le navigateur. */
@Injectable({ providedIn: 'root' })
export class VehicleStore {
  private api = inject(CatalogApi);

  readonly all = signal<Vehicle[]>([]);
  readonly selected = signal<Vehicle | null>(this.read());

  load(force = false) {
    if (this.all().length && !force) return;
    this.api.vehicles().subscribe({ next: v => this.all.set(v), error: () => {} });
  }

  select(v: Vehicle | null) {
    this.selected.set(v);
    try {
      v ? localStorage.setItem('vehicle', JSON.stringify(v)) : localStorage.removeItem('vehicle');
    } catch {}
  }

  private read(): Vehicle | null {
    try {
      return JSON.parse(localStorage.getItem('vehicle') ?? 'null');
    } catch {
      return null;
    }
  }
}
