import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateOrderPayload, Order, Payment, SubmitPaymentPayload } from './models';

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  myOrders() {
    return this.http
      .get<{ data: Order[] } | Order[]>(`${this.api}/orders`)
      .pipe(map(res => (Array.isArray(res) ? res : res.data)));
  }

  order(id: number | string) {
    return this.http
      .get<{ data: Order } | Order>(`${this.api}/orders/${id}`)
      .pipe(map(res => ('data' in res ? res.data : res)));
  }

  create(payload: CreateOrderPayload) {
    return this.http
      .post<{ data: Order } | Order>(`${this.api}/orders`, payload)
      .pipe(map(res => ('data' in res ? res.data : res)));
  }

  cancel(id: number | string) {
    return this.http
      .post<{ data: Order } | Order>(`${this.api}/orders/${id}/cancel`, {})
      .pipe(map(res => ('data' in res ? res.data : res)));
  }

  submitPayment(orderId: number | string, payload: SubmitPaymentPayload) {
    return this.http
      .post<{ data: Payment } | Payment>(`${this.api}/orders/${orderId}/payment`, payload)
      .pipe(map(res => ('data' in res ? res.data : res)));
  }
}
