import { HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DemoBackendService } from './demo-backend';
import { Order, PaymentInstructions } from './models';

describe('DemoBackendService', () => {
  let demo: DemoBackendService;
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    demo = TestBed.inject(DemoBackendService);
  });

  async function login(email: string, password: string) {
    const response = await firstValueFrom(
      demo.handle(new HttpRequest('POST', '/api/login', { email, password })),
    );
    return (response.body as { token: string }).token;
  }
  function authed(method: string, url: string, body: unknown, token: string) {
    return new HttpRequest(method, url, body).clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  it('simule création, initiation, référence puis confirmation manuelle sans transfert réel', async () => {
    const client = await login('client@autocarwat.cm', 'Client123456');
    const created = await firstValueFrom(
      demo.handle(authed('POST', '/api/orders', { items: [{ part_id: 1, quantity: 1 }] }, client)),
    );
    const order = created.body as Order;
    expect(order.status).toBe('pending');
    expect(order.total).toBe(24500);

    const initiated = await firstValueFrom(
      demo.handle(
        authed(
          'POST',
          `/api/orders/${order.id}/payment`,
          { provider: 'orange', phone: '+237 694 12 34 56' },
          client,
        ),
      ),
    );
    const instructions = initiated.body as PaymentInstructions;
    expect(instructions.order_status).toBe('awaiting_payment');
    expect(instructions.dial_uri).toBe('');
    expect(instructions.instructions).toContain('aucun transfert réel');

    const admin = await login('admin@autocarwat.cm', 'Admin123456');
    await expect(
      firstValueFrom(
        demo.handle(
          authed('POST', `/api/admin/payments/${instructions.payment_id}/confirm`, {}, admin),
        ),
      ),
    ).rejects.toMatchObject({ status: 422 });
    await firstValueFrom(
      demo.handle(
        authed(
          'POST',
          `/api/orders/${order.id}/payment/reference`,
          { transaction_reference: 'SIMULATION-123' },
          client,
        ),
      ),
    );
    const awaiting = await firstValueFrom(
      demo.handle(authed('GET', `/api/orders/${order.id}`, null, client)),
    );
    expect((awaiting.body as Order).status).toBe('awaiting_payment');
    await firstValueFrom(
      demo.handle(
        authed('POST', `/api/admin/payments/${instructions.payment_id}/confirm`, {}, admin),
      ),
    );
    const paid = await firstValueFrom(
      demo.handle(authed('GET', `/api/orders/${order.id}`, null, client)),
    );
    expect((paid.body as Order).status).toBe('paid');
  });

  it('ne diminue aucun stock si un article de la commande est indisponible', async () => {
    const client = await login('client@autocarwat.cm', 'Client123456');
    const before = await firstValueFrom(demo.handle(new HttpRequest('GET', '/api/parts/1')));
    await expect(
      firstValueFrom(
        demo.handle(
          authed(
            'POST',
            '/api/orders',
            {
              items: [
                { part_id: 1, quantity: 1 },
                { part_id: 2, quantity: 9999 },
              ],
            },
            client,
          ),
        ),
      ),
    ).rejects.toMatchObject({ status: 422 });
    const after = await firstValueFrom(demo.handle(new HttpRequest('GET', '/api/parts/1')));
    expect((after.body as { stock: number }).stock).toBe((before.body as { stock: number }).stock);
  });
});
