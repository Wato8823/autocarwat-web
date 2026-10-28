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
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    cart = TestBed.inject(CartStore);
  });

  it('adds items, caps quantity at stock and computes the subtotal', () => {
    expect(cart.isEmpty()).toBe(true);
    expect(cart.add(samplePart, 2)).toBe(true);
    expect(cart.totalItems()).toBe(2);
    expect(cart.subtotal()).toBe(50000);
    expect(cart.add(samplePart, 5)).toBe(true);
    expect(cart.totalItems()).toBe(3);
    expect(cart.add(samplePart, 1)).toBe(false);
    cart.remove(samplePart.id);
    expect(cart.isEmpty()).toBe(true);
  });

  it('rejects fractional and invalid quantities', () => {
    expect(cart.add(samplePart, 1.5)).toBe(false);
    expect(cart.add(samplePart, NaN)).toBe(false);
    cart.add(samplePart);
    cart.setQuantity(samplePart.id, 2.5);
    expect(cart.totalItems()).toBe(1);
  });
});
