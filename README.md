# tiny-rabin-karp-search

Finds all start indices of a pattern string within a text string using the
Rabin–Karp rolling-hash algorithm, with explicit character-by-character
confirmation of every hash hit so collisions never produce false positives.

## Usage

```js
import { search, RabinKarpSearch } from 'tiny-rabin-karp-search';

search('the quick brown fox', 'fox');   // [16]
search('aaaa', 'aa');                    // [0, 1, 2]  (overlaps reported)

const rks = new RabinKarpSearch('na');
rks.searchIn('banana');                  // [2, 4]
```

`search(text, pattern)` and `findAll(text, pattern)` (an alias) return an
ascending array of indices. `RabinKarpSearch` precomputes the pattern hash and
base powers once, then exposes `searchIn(text)` for scanning many texts against
the same pattern.

## Why

Naive substring search compares the pattern at every position, which is
O(n·m). Rabin–Karp hashes each window in O(1) from the previous one, giving
O(n + m) on average and a clean building block for multi-pattern matching
(where several patterns share the rolling scan). The trade-off: a 16-bit
modular hash means occasional collisions, so each candidate is confirmed by a
real substring compare. That keeps the worst case at O(n·m) — identical to
naive search — while the common case stays linear. No BigInt is used; the prime
65537 keeps all intermediate products inside JS's safe-integer range.

## The awkward edge

An empty pattern returns `[]` rather than every index in the text. An empty
pattern is almost always a caller bug, and returning `n` results would mask
it. If you need a different convention, wrap `search` before calling it.

Overlapping matches are reported independently: searching `"aaaa"` for `"aa"`
returns `[0, 1, 2]`, not `[0, 2]`. This is the natural single-pattern reading;
pair it with a filter if you need non-overlapping spans.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

## Limitations

Values are coerced to floats, so very large integers lose precision. If you need
exact integer aggregates over a window, this is the wrong tool.

