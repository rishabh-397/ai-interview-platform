const { checkSimilarity } = require('../services/similarityChecker');

describe('similarityChecker', () => {
  test('returns 0 similarity and not flagged for an empty prior list', () => {
    const result = checkSimilarity('function add(a, b) { return a + b; }', []);
    expect(result.maxSimilarity).toBe(0);
    expect(result.flagged).toBe(false);
  });

  test('does not flag short submissions regardless of similarity', () => {
    const result = checkSimilarity('x=1', ['x=1']);
    expect(result.flagged).toBe(false);
  });

  test('flags near-identical code as similar', () => {
    const codeA = 'function add(a, b) {\n  return a + b;\n}\nconsole.log(add(2, 3));';
    const codeB = 'function add(a, b) {\n  return a + b; // same logic\n}\nconsole.log(add(2, 3));';
    const result = checkSimilarity(codeA, [codeB]);
    expect(result.flagged).toBe(true);
    expect(result.maxSimilarity).toBeGreaterThan(0.85);
  });

  test('does not flag genuinely different implementations', () => {
    const codeA = 'function add(a, b) { return a + b; }';
    const codeB = 'class Stack { constructor() { this.items = []; } push(x) { this.items.push(x); } }';
    const result = checkSimilarity(codeA, [codeB]);
    expect(result.flagged).toBe(false);
  });

  test('picks the highest similarity across multiple prior submissions', () => {
    const submitted = 'function multiply(a, b) { return a * b; }';
    const priors = [
      'class Queue { constructor() { this.items = []; } }',
      'function multiply(a, b) { return a * b; }',
    ];
    const result = checkSimilarity(submitted, priors);
    expect(result.maxSimilarity).toBeGreaterThan(0.9);
  });
});