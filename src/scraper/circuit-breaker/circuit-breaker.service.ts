import { Injectable, Logger } from '@nestjs/common';

const FAILURE_THRESHOLD = 5;
const RECOVERY_MS = 5 * 60 * 1000; // 5 min half-open window

interface DomainState {
  failures: number;
  openedAt: number | null;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly state = new Map<string, DomainState>();

  isOpen(domain: string): boolean {
    const s = this.state.get(domain);
    if (!s || s.openedAt === null) return false;

    if (Date.now() - s.openedAt > RECOVERY_MS) {
      s.openedAt = null; // half-open: allow one probe
      this.logger.log(`Circuit half-open for ${domain}`);
      return false;
    }

    return true;
  }

  recordSuccess(domain: string): void {
    this.state.delete(domain);
  }

  recordFailure(domain: string): void {
    const s = this.state.get(domain) ?? { failures: 0, openedAt: null };
    s.failures += 1;

    if (s.failures >= FAILURE_THRESHOLD && s.openedAt === null) {
      s.openedAt = Date.now();
      this.logger.warn(`Circuit OPEN for ${domain} after ${s.failures} consecutive failures`);
    }

    this.state.set(domain, s);
  }

  getStats(): Record<string, { failures: number; open: boolean }> {
    const result: Record<string, { failures: number; open: boolean }> = {};
    for (const [domain, s] of this.state) {
      result[domain] = { failures: s.failures, open: s.openedAt !== null };
    }
    return result;
  }
}
