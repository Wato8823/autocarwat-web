import { TestBed } from '@angular/core/testing';
import { ThemeStore } from './theme';

describe('ThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('should toggle between light and dark themes', () => {
    const store = TestBed.inject(ThemeStore);
    expect(store.theme()).toBe('light');
    store.toggle();
    expect(store.theme()).toBe('dark');
    store.toggle();
    expect(store.theme()).toBe('light');
  });
});
