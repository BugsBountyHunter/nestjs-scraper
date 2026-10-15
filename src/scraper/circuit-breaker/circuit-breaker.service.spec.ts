import { CircuitBreakerService } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  const domain = 'www.linkedin.com';
  let breaker: CircuitBreakerService;

  beforeEach(() => {
    breaker = new CircuitBreakerService();
  });

  afterEach(() => jest.useRealTimers());

  it('is closed for an unknown domain', () => {
    expect(breaker.isOpen(domain)).toBe(false);
  });

  it('stays closed below the failure threshold', () => {
    for (let i = 0; i < 4; i++) breaker.recordFailure(domain);
    expect(breaker.isOpen(domain)).toBe(false);
  });

  it('opens after 5 consecutive failures', () => {
    for (let i = 0; i < 5; i++) breaker.recordFailure(domain);
    expect(breaker.isOpen(domain)).toBe(true);
    expect(breaker.getStats()[domain]).toEqual({ failures: 5, open: true });
  });

  it('resets on success', () => {
    for (let i = 0; i < 5; i++) breaker.recordFailure(domain);
    breaker.recordSuccess(domain);
    expect(breaker.isOpen(domain)).toBe(false);
    expect(breaker.getStats()[domain]).toBeUndefined();
  });

  it('goes half-open after the recovery window', () => {
    jest.useFakeTimers();
    for (let i = 0; i < 5; i++) breaker.recordFailure(domain);
    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(breaker.isOpen(domain)).toBe(false);
  });

  it('tracks domains independently', () => {
    for (let i = 0; i < 5; i++) breaker.recordFailure(domain);
    expect(breaker.isOpen('example.com')).toBe(false);
  });
});
