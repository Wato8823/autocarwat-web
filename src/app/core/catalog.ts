import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, expand, map, reduce } from 'rxjs';
import { environment } from '../../environments/environment';
import { LaravelPage, Paginated, Part, PartFilters, Vehicle, normalizePage } from './models';
import { DemoModeService } from './demo-mode';

/** Les URL de stockage locales retournées par Laravel passent par le même proxy que l'API. */
export function resolvePartImage(part: Part): Part {
  if (!part.image_url) return part;
  try {
    const url = new URL(part.image_url, window.location.origin);
    if (
      ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) &&
      url.pathname.startsWith('/storage/')
    ) {
      return { ...part, image_url: url.pathname + url.search };
    }
  } catch {
    /* Une URL relative ou invalide est laissée au navigateur. */
  }
  return part;
}

@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  parts(f: PartFilters = {}) {
    let params = new HttpParams().set('page', f.page ?? 1);
    if (f.search?.trim()) params = params.set('search', f.search.trim());
    if (f.vehicle_id) params = params.set('vehicle_id', f.vehicle_id);
    if (f.category_id) params = params.set('category_id', f.category_id);
    if (f.brand_id) params = params.set('brand_id', f.brand_id);
    if (f.make?.trim()) params = params.set('make', f.make.trim());
    return this.http.get<LaravelPage<Part> | Part[]>(`${this.api}/parts`, { params }).pipe(
      map(normalizePage<Part>),
      map((page) => ({ ...page, data: page.data.map(resolvePartImage) })),
    );
  }

  part(id: number | string) {
    return this.http
      .get<{ data: Part } | Part>(`${this.api}/parts/${id}`)
      .pipe(map((res) => resolvePartImage('data' in res ? res.data : res)));
  }

  private vehiclesPage(page: number) {
    return this.http
      .get<LaravelPage<Vehicle> | Vehicle[]>(`${this.api}/vehicles`, {
        params: new HttpParams().set('page', page),
      })
      .pipe(map(normalizePage<Vehicle>));
  }

  /** Le sélecteur doit également proposer les véhicules au-delà de la première page. */
  vehicles() {
    return this.vehiclesPage(1).pipe(
      expand((page: Paginated<Vehicle>) =>
        page.meta.current_page < page.meta.last_page
          ? this.vehiclesPage(page.meta.current_page + 1)
          : EMPTY,
      ),
      reduce((all: Vehicle[], page) => [...all, ...page.data], []),
    );
  }
}

@Injectable({ providedIn: 'root' })
export class VehicleStore {
  private api = inject(CatalogApi);
  private demo = inject(DemoModeService);
  private storageKey = this.demo.isActive() ? 'autocarwat_demo_vehicle' : 'vehicle';
  readonly all = signal<Vehicle[]>([]);
  readonly selected = signal<Vehicle | null>(this.read());
  readonly loading = signal(false);
  readonly error = signal(false);
  private loaded = false;

  load(force = false) {
    if (this.loading() || (this.loaded && !force)) return;
    this.loading.set(true);
    this.error.set(false);
    this.api.vehicles().subscribe({
      next: (vehicles) => {
        this.all.set(vehicles);
        this.loaded = true;
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  select(v: Vehicle | null) {
    this.selected.set(v);
    try {
      v
        ? localStorage.setItem(this.storageKey, JSON.stringify(v))
        : localStorage.removeItem(this.storageKey);
    } catch {}
  }

  private read(): Vehicle | null {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) ?? 'null');
    } catch {
      return null;
    }
  }
}
