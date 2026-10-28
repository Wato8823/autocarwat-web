import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '../../../core/auth';
import { Order, PaymentInstructions } from '../../../core/models';
import { PaymentSessionStore } from '../../../core/payment-session';
import { OrderDetail } from './order-detail';

const order: Order = {
  id: 11,
  status: 'awaiting_payment',
  total: 5000,
  created_at: '2026-10-28T10:00:00Z',
  items: [{ part: 'Filtre', reference: 'F-1', quantity: 1, unit_price: 5000 }],
};
const instructions: PaymentInstructions = {
  payment_id: 12,
  order_status: 'awaiting_payment',
  provider: 'orange',
  amount: 5000,
  cashier_number: '600000000',
  ussd_code: '*150#',
  dial_uri: 'tel:*150%23',
  instructions: 'Confirmez sur votre téléphone.',
};

describe('OrderDetail', () => {
  let http: HttpTestingController;
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState({}, '', '/');
    await TestBed.configureTestingModule({
      imports: [OrderDetail],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    TestBed.inject(AuthStore).user.set({
      id: 4,
      name: 'Client',
      email: 'client@example.com',
      is_admin: false,
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('affiche les instructions de l’API et laisse le paiement en attente après la référence', () => {
    TestBed.inject(PaymentSessionStore).saveInstructions(4, 11, instructions);
    const fixture = TestBed.createComponent(OrderDetail);
    fixture.componentRef.setInput('id', '11');
    fixture.detectChanges();
    http.expectOne('/api/orders/11').flush(order);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.instructions()).toEqual(instructions);
    expect(fixture.nativeElement.textContent).toContain('600000000');
    component.transactionReference.set('MP240101.1234');
    component.submitReference(order);
    const request = http.expectOne('/api/orders/11/payment/reference');
    expect(request.request.body).toEqual({ transaction_reference: 'MP240101.1234' });
    request.flush({ message: 'Référence enregistrée. En attente de validation.' });
    expect(component.referenceSubmitted()).toBe(true);
    expect(component.order()?.status).toBe('awaiting_payment');
    expect(TestBed.inject(PaymentSessionStore).get(4, 11)?.referenceSubmitted).toBe(true);
  });

  it('permet de transmettre une référence même si les instructions ne sont plus en session', () => {
    const fixture = TestBed.createComponent(OrderDetail);
    fixture.componentRef.setInput('id', '11');
    fixture.detectChanges();
    http.expectOne('/api/orders/11').flush(order);
    fixture.detectChanges();
    expect(fixture.componentInstance.instructions()).toBeNull();
    expect(fixture.nativeElement.querySelector('#transaction-reference')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('déjà effectué le transfert');
  });
});
