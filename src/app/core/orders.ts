import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateOrderPayload,
  InitiatePaymentPayload,
  LaravelPage,
  Order,
  PaymentInstructions,
  normalizePage,
} from './models';

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  myOrders(page = 1) {
    const params = new HttpParams().set('page', page);
    return this.http
      .get<LaravelPage<Order> | Order[]>(`${this.api}/orders`, { params })
      .pipe(map(normalizePage<Order>));
  }

  order(id: number | string) {
    return this.http
      .get<{ data: Order } | Order>(`${this.api}/orders/${id}`)
      .pipe(map((res) => ('data' in res ? res.data : res)));
  }

  create(payload: CreateOrderPayload) {
    // L'API ne prend en charge que les articles, pas les adresses ni un paiement intégré.
    return this.http
      .post<{ data: Order } | Order>(`${this.api}/orders`, { items: payload.items })
      .pipe(map((res) => ('data' in res ? res.data : res)));
  }

  cancel(id: number | string) {
    return this.http
      .post<{ data: Order } | Order>(`${this.api}/orders/${id}/cancel`, {})
      .pipe(map((res) => ('data' in res ? res.data : res)));
  }

  initiatePayment(orderId: number | string, payload: InitiatePaymentPayload) {
    return this.http.post<PaymentInstructions>(`${this.api}/orders/${orderId}/payment`, {
      provider: payload.provider,
      phone: payload.phone,
    });
  }

  submitReference(orderId: number | string, transactionReference: string) {
    return this.http.post<{ message: string }>(`${this.api}/orders/${orderId}/payment/reference`, {
      transaction_reference: transactionReference,
    });
  }
}
