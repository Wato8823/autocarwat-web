import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from './auth';

describe('AuthStore', () => {
  let service: AuthStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should start logged out when no token exists', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.isAdmin()).toBe(false);
  });

  it('should store token and load user on login', () => {
    service.login('admin@autocarwat.cm', 'Admin123456').subscribe(user => {
      expect(user.email).toBe('admin@autocarwat.cm');
    });

    const loginReq = httpMock.expectOne('/api/login');
    expect(loginReq.request.method).toBe('POST');
    loginReq.flush({ token: 'tok_123' });

    const meReq = httpMock.expectOne('/api/me');
    expect(meReq.request.method).toBe('GET');
    meReq.flush({ id: 1, name: 'Admin', email: 'admin@autocarwat.cm', is_admin: true });

    expect(service.isLoggedIn()).toBe(true);
    expect(service.isAdmin()).toBe(true);
  });
});
