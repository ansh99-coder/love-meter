/**
 * Love Meter ❤️ — User-Agent parsing (device + browser + OS).
 *
 * Lightweight, dependency-free detection used for analytics.
 */

export function parseUserAgent(ua = '') {
  const s = String(ua);

  let device = 'Desktop';
  if (/ipad/i.test(s)) device = 'iPad';
  else if (/iphone/i.test(s)) device = 'iPhone';
  else if (/android/i.test(s)) device = 'Android';
  else if (/mobile/i.test(s)) device = 'Mobile';
  else if (/tablet/i.test(s)) device = 'Tablet';

  let browser = 'Unknown';
  if (/edg\//i.test(s)) browser = 'Edge';
  else if (/opr\/|opera/i.test(s)) browser = 'Opera';
  else if (/chrome\/|chromium/i.test(s)) browser = 'Chrome';
  else if (/firefox\/|fxios/i.test(s)) browser = 'Firefox';
  else if (/safari\//i.test(s)) browser = 'Safari';

  let os = 'Unknown';
  if (/windows nt/i.test(s)) os = 'Windows';
  else if (/iphone|ipad|ios/i.test(s)) os = 'iOS';
  else if (/android/i.test(s)) os = 'Android';
  else if (/mac os x/i.test(s)) os = 'macOS';
  else if (/linux/i.test(s)) os = 'Linux';

  return { device, browser, os };
}

