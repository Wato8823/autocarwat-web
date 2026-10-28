import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  LaravelPage,
  Order,
  OrderStatus,
  Part,
  PartUpsertPayload,
  Payment,
  PaymentStatus,
  normalizePage,
} from './models';
import { resolvePartImage } from './catalog';

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  payments(status: PaymentStatus = 'initiated', page = 1) {
    const params = new HttpParams().set('status', status).set('page', page);
    return this.http
      .get<LaravelPage<Payment> | Payment[]>(`${this.api}/admin/payments`, { params })
      .pipe(map(normalizePage<Payment>));
  }

  confirmPayment(id: number) {
    return this.http.post<Payment>(`${this.api}/admin/payments/${id}/confirm`, {});
  }

  rejectPayment(id: number) {
    return this.http.post<Payment>(`${this.api}/admin/payments/${id}/reject`, {});
  }

  orders(status: OrderStatus | '' = '', page = 1) {
    let params = new HttpParams().set('page', page);
    if (status) params = params.set('status', status);
    return this.http
      .get<LaravelPage<Order> | Order[]>(`${this.api}/admin/orders`, { params })
      .pipe(map(normalizePage<Order>));
  }

  updateOrderStatus(id: number, status: OrderStatus) {
    return this.http
      .patch<{ data: Order } | Order>(`${this.api}/admin/orders/${id}/status`, { status })
      .pipe(map((res) => ('data' in res ? res.data : res)));
  }

  createPart(payload: PartUpsertPayload) {
    return this.http
      .post<{ data: Part } | Part>(`${this.api}/admin/parts`, this.toFormData(payload))
      .pipe(map((res) => resolvePartImage('data' in res ? res.data : res)));
  }

  updatePart(id: number, payload: PartUpsertPayload) {
    const { image, ...fields } = payload;
    const body = image ? this.toFormData(payload) : fields;
    return this.http
      .put<{ data: Part } | Part>(`${this.api}/admin/parts/${id}`, body)
      .pipe(map((res) => resolvePartImage('data' in res ? res.data : res)));
  }

  syncPartVehicles(id: number, vehicleIds: number[]) {
    return this.http.put<{ message: string }>(`${this.api}/admin/parts/${id}/vehicles`, {
      vehicle_ids: vehicleIds,
    });
  }

  deletePart(id: number) {
    return this.http.delete<void>(`${this.api}/admin/parts/${id}`);
  }

  private toFormData(payload: PartUpsertPayload): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined) continue;
      data.append(key, value instanceof File ? value : value === null ? '' : String(value));
    }
    return data;
  }
}
