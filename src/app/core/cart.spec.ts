import { TestBed } from '@angular/core/testing';
import { CartStore } from './cart';
import { Part } from './models';

const samplePart: Part = {
  id: 1,
  name: 'Plaquettes Brembo',
  reference: 'BRK-01',
  oem_number: '04465-02220',
  description: null,
  price: 25000,
  stock: 3,
  image_url: null,
  brand: 'Brembo',
  category: 'Freinage',
};

describe('CartStore', () => {
  let cart: CartStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    cart = TestBed.inject(CartStore);
  });

  it('adds items, caps quantity at stock, and computes subtotal & free shipping', () => {
    expect(cart.isEmpty()).toBe(true);
    expect(cart.add(samplePart, 2)).toBe(true);
    expect(cart.totalItems()).toBe(2);
    expect(cart.subtotal()).toBe(50000);
    expect(cart.shippingFor('Douala')).toBe(2000);

    // Adding more than remaining stock caps at 3
    expect(cart.add(samplePart, 5)).toBe(true);
    expect(cart.totalItems()).toBe(3);

    // Already at max stock
    expect(cart.add(samplePart, 1)).toBe(false);

    cart.remove(samplePart.id);
    expect(cart.isEmpty()).toBe(true);
  });
});
