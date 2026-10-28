import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { Paginated, Part, PartFilters, Vehicle } from './models';

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  parts(f: PartFilters) {
    let params = new HttpParams().set('page', f.page ?? 1);
    if (f.search?.trim()) params = params.set('search', f.search.trim());
    if (f.vehicle_id) params = params.set('vehicle_id', f.vehicle_id);
    return this.http.get<Paginated<Part>>(`${this.api}/parts`, { params });
  }

  part(id: number | string) {
    return this.http.get<{ data: Part }>(`${this.api}/parts/${id}`);
  }

  vehicles() {
    return this.http.get<Vehicle[]>(`${this.api}/vehicles`);
  }
}

/** Véhicule choisi par le client, mémorisé dans le navigateur. */
@Injectable({ providedIn: 'root' })
export class VehicleStore {
  private api = inject(CatalogApi);

  readonly all = signal<Vehicle[]>([]);
  readonly selected = signal<Vehicle | null>(this.read());

  load() {
    if (this.all().length) return;
    this.api.vehicles().subscribe({ next: v => this.all.set(v), error: () => {} });
  }

  select(v: Vehicle | null) {
    this.selected.set(v);
    try {
      v ? localStorage.setItem('vehicle', JSON.stringify(v)) : localStorage.removeItem('vehicle');
    } catch {}
  }

  private read(): Vehicle | null {
    try { return JSON.parse(localStorage.getItem('vehicle') ?? 'null'); } catch { return null; }
  }
}
