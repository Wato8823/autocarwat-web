import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ShopLayout } from './shop-layout';

describe('ShopLayout', () => {
  let component: ShopLayout;
  let fixture: ComponentFixture<ShopLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShopLayout],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ShopLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create and display AutoCarWat header', () => {
    expect(component).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('AUTOCARWAT');
  });
});
