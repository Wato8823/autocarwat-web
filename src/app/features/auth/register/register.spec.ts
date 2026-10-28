import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('validates password rules and confirmation', () => {
    expect(component.canSubmit()).toBe(false);
    component.name.set('Jean-Marc');
    component.email.set('jm@autocarwat.cm');
    component.password.set('Pass123456');
    component.confirm.set('Pass123456');
    expect(component.canSubmit()).toBe(true);
  });
});
