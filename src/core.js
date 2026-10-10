/**
 * Rabin–Karp substring search.
 *
 * Why rolling hash: each window's hash is derived from the previous one in O(1),
 * so scanning a text of length n for a pattern of length m takes O(n + m) on
 * average (plus O(n·m) worst case from hash collisions, which we handle with
 * explicit character-by-character confirmation).
 *
 * Hash design: we treat the window as a base-B number modulo a prime P.
 * B = 256 (one byte per char, covers all 8-bit code units cleanly). P is a
 * Fermat prime (65537) large enough to keep the false-positive rate down for
 * typical inputs while staying well within JS's safe-integer range so no
 * BigInt is needed.
 *
 * Determinism note: we precompute base powers, so the rolling step is
 * `hash = (hash - outgoing * powB[m-1]) * B + incoming`, all mod P. No
 * wall-clock dependence, no randomness, no float comparison.
 */

const BASE = 256;
const PRIME = 65537; // 2^16 + 1; keeps intermediate products under 2^33.

/**
 * Build a table of BASE^i mod PRIME for i in [0, n].
 * Hoisting this out of the hot loop turns the rolling step into two mults.
 */
function precomputePowers(n) {
  const pow = new Array(n + 1);
  pow[0] = 1;
  for (let i = 1; i <= n; i++) {
    pow[i] = (pow[i - 1] * BASE) % PRIME;
  }
  return pow;
}

function hashWindow(text, from, len) {
  let h = 0;
  for (let i = 0; i < len; i++) {
    h = (h * BASE + text.charCodeAt(from + i)) % PRIME;
  }
  return h;
}

/**
 * Returns true only when text[pos .. pos+len] actually equals pattern.
 * The hash can collide, so this guard is mandatory, not optional.
 */
function confirmsAt(text, pos, pattern, len) {
  for (let i = 0; i < len; i++) {
    if (text.charCodeAt(pos + i) !== pattern.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Find all start indices of `pattern` within `text`.
 *
 * Returns an empty array when pattern is the empty string. We deliberately
 * pick this interpretation (over "return every position") because an empty
 * pattern is almost always a caller bug, and silently returning n indices
 * would mask it in a way that is hard to debug.
 *
 * Overlapping matches are reported independently (e.g. "aaa" in "aaaa"
 * yields [0, 1]). This is the natural reading of "all occurrences" for a
 * single-pattern search and is what most callers expect.
 *
 * @param {string} text
 * @param {string} pattern
 * @returns {number[]} ascending start indices
 */
export function search(text, pattern) {
  if (typeof text !== 'string' || typeof pattern !== 'string') {
    throw new TypeError('search expects (string, string)');
  }
  const n = text.length;
  const m = pattern.length;
  if (m === 0) return [];
  if (m > n) return [];

  const pow = precomputePowers(m);
  const patternHash = hashWindow(pattern, 0, m);
  let windowHash = hashWindow(text, 0, m);
  const results = [];

  const removeFactor = pow[m - 1]; // BASE^(m-1) mod PRIME

  for (let i = 0; i <= n - m; i++) {
    if (windowHash === patternHash && confirmsAt(text, i, pattern, m)) {
      results.push(i);
    }
    if (i < n - m) {
      const outgoing = text.charCodeAt(i);
      const incoming = text.charCodeAt(i + m);
      windowHash = (windowHash - (outgoing * removeFactor) % PRIME + PRIME) % PRIME;
      windowHash = (windowHash * BASE + incoming) % PRIME;
    }
  }

  return results;
}

/**
 * Convenience alias. Same semantics as `search`; exists for readers who
 * prefer a verb that signals "return all matches".
 */
export const findAll = search;

/**
 * Class wrapper that precomputes the pattern's hash and powers so repeated
 * scans against the same pattern avoid recomputation. Use this when you
 * search the same pattern across many texts.
 */
export class RabinKarpSearch {
  constructor(pattern) {
    if (typeof pattern !== 'string') {
      throw new TypeError('RabinKarpSearch expects a string pattern');
    }
    this.pattern = pattern;
    this.length = pattern.length;
    this.patternHash = pattern.length === 0 ? 0 : hashWindow(pattern, 0, pattern.length);
    this.pow = precomputePowers(Math.max(1, pattern.length));
    this.removeFactor = this.pow[Math.max(1, pattern.length) - 1];
  }

  /** @param {string} text @returns {number[]} */
  searchIn(text) {
    if (typeof text !== 'string') {
      throw new TypeError('searchIn expects a string');
    }
    const n = text.length;
    const m = this.length;
    if (m === 0) return [];
    if (m > n) return [];

    let windowHash = hashWindow(text, 0, m);
    const results = [];

    for (let i = 0; i <= n - m; i++) {
      if (windowHash === this.patternHash && confirmsAt(text, i, this.pattern, m)) {
        results.push(i);
      }
      if (i < n - m) {
        const outgoing = text.charCodeAt(i);
        const incoming = text.charCodeAt(i + m);
        windowHash = (windowHash - (outgoing * this.removeFactor) % PRIME + PRIME) % PRIME;
        windowHash = (windowHash * BASE + incoming) % PRIME;
      }
    }

    return results;
  }
}
