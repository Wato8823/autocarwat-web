import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Part } from '../../core/models';
import { PartCard } from './part-card';

const mockPart: Part = {
  id: 1,
  name: 'Filtre à huile Mann',
  reference: 'FLT-MN-W68',
  oem_number: '90915-YZZD2',
  description: 'Filtre moteur',
  price: 6500,
  stock: 10,
  image_url: null,
  brand: 'Mann-Filter',
  category: 'Filtration',
};

describe('PartCard', () => {
  let component: PartCard;
  let fixture: ComponentFixture<PartCard>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PartCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PartCard);
    fixture.componentRef.setInput('part', mockPart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should render part name and stock status', () => {
    expect(component).toBeTruthy();
    expect(component.badge().label).toBe('En stock');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Filtre à huile Mann');
  });
});
