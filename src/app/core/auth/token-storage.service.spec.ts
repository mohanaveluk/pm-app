import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';
import { User } from '../../models/user.models';

const testUser: User = {
  id: 'u1',
  email: 'a@b.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  role: 'ProjectManager',
  role_guid: 'g1',
  createdAt: new Date('2026-01-01'),
  lastActive: new Date('2026-01-01'),
  avatar: '',
  organizationId: 'org1',
};

function fakeJwt(expSecondsFromNow: number): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + expSecondsFromNow };
  return `header.${btoa(JSON.stringify(payload))}.signature`;
}

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenStorageService);
  });

  it('starts with no session', () => {
    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.getUser()).toBeNull();
  });

  it('round-trips a full session through setSession', () => {
    service.setSession(fakeJwt(3600), 'refresh-abc', testUser);

    expect(service.getRefreshToken()).toBe('refresh-abc');
    // getUser() round-trips through JSON via localStorage, so Date fields
    // come back as ISO strings rather than Date instances.
    expect(service.getUser()).toEqual(JSON.parse(JSON.stringify(testUser)));
    expect(service.isAccessTokenExpired()).toBe(false);
  });

  it('clearSession wipes token, refresh token, and user', () => {
    service.setSession(fakeJwt(3600), 'refresh-abc', testUser);
    service.clearSession();

    expect(service.getAccessToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.getUser()).toBeNull();
  });

  it('treats a missing or expired token as expired', () => {
    expect(service.isAccessTokenExpired()).toBe(true);

    service.setAccessToken(fakeJwt(-10));
    expect(service.isAccessTokenExpired()).toBe(true);
  });

  it('shouldNotifyExpiry only fires within the given threshold window', () => {
    service.setAccessToken(fakeJwt(30));
    expect(service.shouldNotifyExpiry(60)).toBe(true);
    expect(service.shouldNotifyExpiry(10)).toBe(false);
  });
});
