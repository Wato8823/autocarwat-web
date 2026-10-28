import { HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DemoBackendService } from './demo-backend';

describe('DemoBackendService', () => {
  let demo: DemoBackendService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    demo = TestBed.inject(DemoBackendService);
  });

  it('authenticates demo client, lists parts, and approves pending payments as admin', async () => {
    const loginRes = await firstValueFrom(
      demo.handle(
        new HttpRequest('POST', '/api/login', {
          email: 'admin@autocarwat.cm',
          password: 'Admin123456',
        }),
      ),
    );
    const token = (loginRes.body as { token: string }).token;
    expect(token).toContain('demo_');

    const partsRes = await firstValueFrom(demo.handle(new HttpRequest('GET', '/api/parts')));
    const partsBody = partsRes.body as { data: unknown[]; meta: { total: number } };
    expect(partsBody.meta.total).toBeGreaterThan(10);

    // Approve seeded pending payment #2 as admin
    const authReq = new HttpRequest('POST', '/api/admin/payments/2/approve', {}).clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    const approveRes = await firstValueFrom(demo.handle(authReq));
    const approved = (approveRes.body as { data: { status: string } }).data;
    expect(approved.status).toBe('approved');
  });
});
