import { ScraperTarget } from '../../api/jobs/dto/create-job.dto';

export type ResultCompleteness = 'success' | 'partial';

const hasText = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;

/**
 * A page can load and parse without errors yet yield nothing useful — an
 * authwall, an interstitial, a redirect page, or changed selectors. Such
 * results are kept but flagged `partial` so they are not mistaken for data.
 * Each target is judged by the field that identifies the entity.
 */
const RULES: Record<ScraperTarget, (data: Record<string, unknown>) => boolean> = {
  [ScraperTarget.LINKEDIN_PROFILE]: (data) => hasText(data.name),
  [ScraperTarget.LINKEDIN_COMPANY]: (data) => hasText(data.name),
  [ScraperTarget.LINKEDIN_JOBS]: (data) => Array.isArray(data.jobs) && data.jobs.length > 0,
};

export function assessCompleteness(target: string, data: Record<string, unknown>): ResultCompleteness {
  const isComplete = RULES[target as ScraperTarget];
  if (!isComplete) return 'success';
  return isComplete(data) ? 'success' : 'partial';
}
