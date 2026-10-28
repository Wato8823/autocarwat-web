import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AdminStats,
  Order,
  OrderStatus,
  Part,
  PartUpsertPayload,
  Payment,
  PaymentOperator,
  PaymentStatus,
  Vehicle,
} from './models';

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  stats() {
    return this.http
      .get<{ data: AdminStats } | AdminStats>(`${this.api}/admin/stats`)
      .pipe(map(res => ('data' in res ? res.data : res)));
  }

  payments(filters?: { status?: PaymentStatus | ''; operator?: PaymentOperator | ''; search?: string }) {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.operator) params = params.set('operator', filters.operator);
    if (filters?.search?.trim()) params = params.set('search', filters.search.trim());
    return this.http
      .get<{ data: Payment[] } | Payment[]>(`${this.api}/admin/payments`, { params })
      .pipe(map(res => (Array.isArray(res) ? res : res.data)));
  }

  approvePayment(id: number) {
    return this.http
      .post<{ data: Payment } | Payment>(`${this.api}/admin/payments/${id}/approve`, {})
      .pipe(map(res => ('data' in res ? res.data : res)));
  }

  rejectPayment(id: number, reason: string) {
    return this.http
      .post<{ data: Payment } | Payment>(`${this.api}/admin/payments/${id}/reject`, {
        rejection_reason: reason,
        reason,
      })
      .pipe(map(res => ('data' in res ? res.data : res)));
  }

  orders(filters?: { status?: OrderStatus | ''; search?: string }) {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search?.trim()) params = params.set('search', filters.search.trim());
    return this.http
      .get<{ data: Order[] } | Order[]>(`${this.api}/admin/orders`, { params })
      .pipe(map(res => (Array.isArray(res) ? res : res.data)));
  }

  updateOrderStatus(id: number, status: OrderStatus) {
    return this.http
      .patch<{ data: Order } | Order>(`${this.api}/admin/orders/${id}/status`, { status })
      .pipe(map(res => ('data' in res ? res.data : res)));
  }

  parts(filters?: { search?: string; category?: string; stock?: 'all' | 'low' | 'out' }) {
    let params = new HttpParams();
    if (filters?.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters?.category?.trim()) params = params.set('category', filters.category.trim());
    if (filters?.stock && filters.stock !== 'all') params = params.set('stock', filters.stock);
    return this.http
      .get<{ data: Part[] } | Part[]>(`${this.api}/admin/parts`, { params })
      .pipe(map(res => (Array.isArray(res) ? res : res.data)));
  }

  createPart(payload: PartUpsertPayload) {
    return this.http
      .post<{ data: Part } | Part>(`${this.api}/admin/parts`, payload)
      .pipe(map(res => ('data' in res ? res.data : res)));
  }

  updatePart(id: number, payload: PartUpsertPayload) {
    return this.http
      .put<{ data: Part } | Part>(`${this.api}/admin/parts/${id}`, payload)
      .pipe(map(res => ('data' in res ? res.data : res)));
  }

  deletePart(id: number) {
    return this.http.delete(`${this.api}/admin/parts/${id}`);
  }

  createVehicle(payload: { make: string; model: string; year: number }) {
    return this.http
      .post<{ data: Vehicle } | Vehicle>(`${this.api}/admin/vehicles`, payload)
      .pipe(map(res => ('data' in res ? res.data : res)));
  }

  deleteVehicle(id: number) {
    return this.http.delete(`${this.api}/admin/vehicles/${id}`);
  }
}
