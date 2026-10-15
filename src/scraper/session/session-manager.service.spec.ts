import { SessionManagerService } from './session-manager.service';

describe('SessionManagerService', () => {
  let sessions: SessionManagerService;

  beforeEach(() => {
    jest.useFakeTimers();
    sessions = new SessionManagerService();
  });

  afterEach(() => {
    sessions.onModuleDestroy();
    jest.useRealTimers();
  });

  it('saves and retrieves a session', () => {
    sessions.save('a', [{ name: 'li_at', value: 'x' }]);
    expect(sessions.get('a')?.cookies).toEqual([{ name: 'li_at', value: 'x' }]);
  });

  it('returns null for an expired session', () => {
    sessions.save('a', []);
    jest.advanceTimersByTime(31 * 60 * 1000);
    expect(sessions.get('a')).toBeNull();
  });

  it('invalidate() removes a session', () => {
    sessions.save('a', []);
    sessions.invalidate('a');
    expect(sessions.get('a')).toBeNull();
  });

  it('purgeExpired() removes only expired sessions', () => {
    sessions.save('old', []);
    jest.advanceTimersByTime(20 * 60 * 1000);
    sessions.save('fresh', []);
    jest.advanceTimersByTime(11 * 60 * 1000);

    expect(sessions.purgeExpired()).toBe(1);
    expect(sessions.size()).toBe(1);
    expect(sessions.get('fresh')).not.toBeNull();
  });

  it('purges automatically on the interval once initialised', () => {
    sessions.onModuleInit();
    sessions.save('a', []);
    jest.advanceTimersByTime(35 * 60 * 1000);
    expect(sessions.size()).toBe(0);
  });
});
