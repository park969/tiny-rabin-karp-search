import { test } from 'node:test';
import assert from 'node:assert/strict';
import { search, findAll, RabinKarpSearch } from '../src/index.js';

test('single match at the start', () => {
  assert.deepEqual(search('hello world', 'hello'), [0]);
});

test('single match at the end', () => {
  assert.deepEqual(search('hello world', 'world'), [6]);
});

test('multiple non-overlapping matches', () => {
  assert.deepEqual(search('abXabYab', 'ab'), [0, 3, 6]);
});

test('overlapping matches are all reported', () => {
  assert.deepEqual(search('aaaa', 'aa'), [0, 1, 2]);
});

test('no match returns empty array', () => {
  assert.deepEqual(search('abcdef', 'xyz'), []);
});

test('empty pattern returns empty array', () => {
  assert.deepEqual(search('abcdef', ''), []);
});

test('empty text returns empty array', () => {
  assert.deepEqual(search('', 'a'), []);
});

test('pattern longer than text returns empty array', () => {
  assert.deepEqual(search('ab', 'abc'), []);
});

test('whole string equals pattern', () => {
  assert.deepEqual(search('abc', 'abc'), [0]);
});

test('findAll is an alias of search', () => {
  assert.equal(findAll, search);
  assert.deepEqual(findAll('ababab', 'ab'), [0, 2, 4]);
});

test('RabinKarpSearch.searchIn reproduces search for non-empty pattern', () => {
  const rks = new RabinKarpSearch('ab');
  assert.deepEqual(rks.searchIn('abXabYab'), [0, 3, 6]);
});

test('RabinKarpSearch handles empty pattern', () => {
  const rks = new RabinKarpSearch('');
  assert.deepEqual(rks.searchIn('abc'), []);
});

test('non-string arguments throw TypeError', () => {
  assert.throws(() => search(123, 'a'), TypeError);
  assert.throws(() => new RabinKarpSearch(null), TypeError);
  assert.throws(() => new RabinKarpSearch('a').searchIn(5), TypeError);
});

test('high-collision input still correct (hash collisions are confirmed)', () => {
  // Long identical runs stress the modular hash but correctness must hold.
  assert.deepEqual(search('a'.repeat(100), 'a'.repeat(10)),
    Array.from({ length: 91 }, (_, i) => i));
});
