function normalizeCode(code) {
  return code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenize(code) {
  return normalizeCode(code).split(/[^a-z0-9_]+/).filter(Boolean);
}

function jaccardSimilarity(codeA, codeB) {
  const setA = new Set(tokenize(codeA));
  const setB = new Set(tokenize(codeB));

  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter((token) => setB.has(token)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

function checkSimilarity(submittedCode, priorSubmissions, threshold = 0.85) {
  if (!submittedCode || submittedCode.trim().length < 20) {
    return { maxSimilarity: 0, flagged: false };
  }

  let maxSimilarity = 0;
  for (const prior of priorSubmissions) {
    if (!prior) continue;
    const similarity = jaccardSimilarity(submittedCode, prior);
    if (similarity > maxSimilarity) maxSimilarity = similarity;
  }

  return {
    maxSimilarity: parseFloat(maxSimilarity.toFixed(3)),
    flagged: maxSimilarity >= threshold,
  };
}

module.exports = { checkSimilarity };