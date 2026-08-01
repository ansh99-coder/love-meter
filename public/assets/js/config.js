/**
 * Love Meter ❤️ — Configuration & Constants.
 *
 * Centralized app constants: score messages, loading messages, daily quotes,
 * themes, and helper functions.
 */

export const APP_NAME = 'Love Meter';
export const APP_TAGLINE = 'Discover your romantic compatibility in seconds.';

export const API_BASE = '/api';

/** Loading messages shown during calculation. */
export const LOADING_MESSAGES = [
  'Finding your soulmate...',
  'Analyzing hearts...',
  'Reading destiny...',
  'Matching emotions...',
  'Checking compatibility...',
  'Consulting the stars...',
  'Measuring the butterflies...',
  'Counting the sparks...',
  'Decoding the chemistry...',
  'Looking for magic...'
];

/**
 * Score message tiers matching the exact product spec:
 *   100  → Perfect Soulmates ❤️
 *   90+  → Made For Each Other 💕
 *   80+  → Amazing Match 💖
 *   70+  → Strong Chemistry 💘
 *   60+  → Looking Great 💞
 *   50+  → Potential Love 🌹
 *   30+  → Needs More Time 💫
 *   10+  → Maybe Just Friends 💔
 *   else → Just Friends 😅
 */
export const SCORE_MESSAGES = [
  { min: 100, max: 100, title: 'Perfect Soulmates', emoji: '❤️', subtitle: 'An ethereal bond destined to last forever.' },
  { min: 90, max: 99, title: 'Made For Each Other', emoji: '💕', subtitle: 'A match written in the stars!' },
  { min: 80, max: 89, title: 'Amazing Match', emoji: '💖', subtitle: 'Sparks fly every time you are together.' },
  { min: 70, max: 79, title: 'Strong Chemistry', emoji: '💘', subtitle: 'Something electric is definitely happening.' },
  { min: 60, max: 69, title: 'Looking Great', emoji: '💞', subtitle: 'A lovely connection worth exploring.' },
  { min: 50, max: 59, title: 'Potential Love', emoji: '🌹', subtitle: 'The foundation of something beautiful is here.' },
  { min: 30, max: 49, title: 'Needs More Time', emoji: '💫', subtitle: 'The spark might grow with a little more time.' },
  { min: 10, max: 29, title: 'Maybe Just Friends', emoji: '💔', subtitle: 'The friend zone is cozy too!' },
  { min: 0, max: 9, title: 'Just Friends', emoji: '😅', subtitle: 'A wholesome connection, and that is okay.' }
];

/** Daily love quotes. */
export const DAILY_QUOTES = [
  { quote: 'Love is not about how many days, months, or years you have been together. Love is about how much you love each other every single day.', author: 'Unknown' },
  { quote: 'The best thing to hold onto in life is each other.', author: 'Audrey Hepburn' },
  { quote: 'Love is composed of a single soul inhabiting two bodies.', author: 'Aristotle' },
  { quote: 'Love all, trust a few, do wrong to none.', author: 'William Shakespeare' },
  { quote: 'The only thing we never get enough of is love.', author: 'Henry Miller' },
  { quote: 'Love is the bridge between you and everything.', author: 'Rumi' },
  { quote: 'We are most alive when we are in love.', author: 'John Updike' },
  { quote: 'Love is the beauty of the soul.', author: 'Saint Augustine' },
  { quote: 'To love is to burn, to be on fire.', author: 'Jane Austen' },
  { quote: 'Love is when the other person\'s happiness is more important than your own.', author: 'H. Jackson Brown Jr.' },
  { quote: 'The greatest happiness of life is the conviction that we are loved.', author: 'Victor Hugo' },
  { quote: 'Love is not something you find. Love is something that finds you.', author: 'Loretta Young' },
  { quote: 'You know you are in love when you can\'t fall asleep because reality is finally better than your dreams.', author: 'Dr. Seuss' },
  { quote: 'Love is the master key that opens the gates of happiness.', author: 'Oliver Wendell Holmes' },
  { quote: 'The only thing that matters in life is love.', author: 'Mother Teresa' }
];

export const THEMES = [
  { id: 'dark', name: 'Dark Romance', icon: '🌙' },
  { id: 'light', name: 'Light Rose', icon: '🌹' },
  { id: 'valentine', name: 'Valentine', icon: '❤️' },
  { id: 'anniversary', name: 'Anniversary', icon: '💎' }
];

/** Get the daily quote deterministically based on the day of year. */
export function getDailyQuote() {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 0);
  const diff = today - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

/** Get the message object for a given score. */
export function getMessageForScore(score) {
  for (const msg of SCORE_MESSAGES) {
    if (score >= msg.min && score <= msg.max) return msg;
  }
  return SCORE_MESSAGES[SCORE_MESSAGES.length - 1];
}

/** Get a random loading message. */
export function getRandomLoadingMessage() {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
}

