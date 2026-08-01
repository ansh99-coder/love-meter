/**
 * Love Meter ❤️ — Tiny structured logger.
 *
 * No external dependency. Logs with timestamps and level colors in dev,
 * plain JSON lines in production.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const COLORS = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m'
};
const RESET = '\x1b[0m';

function ts() {
  return new Date().toISOString();
}

function write(level, args) {
  const isProd = process.env.NODE_ENV === 'production';
  const message = args
    .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
    .join(' ');

  if (isProd) {
    console[level === 'debug' ? 'log' : level](JSON.stringify({ level, time: ts(), message }));
    return;
  }

  const color = COLORS[level] || '';
  console[level === 'debug' ? 'log' : level](
    `${color}[${ts()}] [${level.toUpperCase()}]${RESET} ${message}`
  );
}

export default {
  debug: (...args) => write('debug', args),
  info: (...args) => write('info', args),
  warn: (...args) => write('warn', args),
  error: (...args) => write('error', args)
};

