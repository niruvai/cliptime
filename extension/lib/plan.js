// ClipTime — what Free and Pro include. Change the numbers here to change the offer.
export const LIMITS = {
  free: {
    maxItems: 200,        // history size
    retentionDays: 30,    // longest history period (Pro: 60 / 90 / 365 / forever)
    snippets: 5,
    pins: 5,
    backup: false,        // export / import
    advancedTools: false, // camelCase, snake_case, sort, number lines, Bangla digits, strip HTML …
  },
  pro: {
    maxItems: 10000,
    retentionDays: 0,     // 0 = no limit (forever allowed)
    snippets: Infinity,
    pins: Infinity,
    backup: true,
    advancedTools: true,
  },
};

// Tools anyone can use; everything else in TOOLS is Pro
export const FREE_TOOLS = new Set([
  'removeBlankLines', 'smartClean', 'collapseBlankLines', 'removeExtraSpaces', 'trimLines', 'joinLines',
  'upper', 'lower', 'title', 'sentence',
]);

export function limitsFor(plan) {
  return plan === 'pro' ? LIMITS.pro : LIMITS.free;
}

// Settings actually applied, given the plan (stored settings are kept so they come back after renewing)
export function effectiveSettings(settings, plan) {
  const L = limitsFor(plan);
  const s = { ...settings };
  s.maxItems = Math.min(Number(s.maxItems) || L.maxItems, L.maxItems);
  if (L.retentionDays > 0) {
    const d = Number(s.retentionDays) || 0;
    s.retentionDays = d === 0 ? L.retentionDays : Math.min(d, L.retentionDays);
  }
  return s;
}
