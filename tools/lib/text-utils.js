import { createRequire } from 'module';

let stemToken = null;
if (process.env.REPATH_DISABLE_STEMMER !== '1') {
  try {
    const require = createRequire(import.meta.url);
    const module = require('stemmer');
    stemToken = module.stemmer;
  } catch (error) {
    stemToken = null;
  }
}

function normalizeToken(token) {
  if (!token) {
    return '';
  }
  if (token.length > 3 && token.endsWith('es')) {
    return token.slice(0, -2);
  }
  if (token.length > 3 && token.endsWith('s')) {
    return token.slice(0, -1);
  }
  return token;
}

function interpretToken(token) {
  const normalized = normalizeToken(token);
  if (!normalized) {
    return '';
  }
  if (stemToken && /[a-z]/.test(normalized)) {
    return stemToken(normalized);
  }
  return normalized;
}

export function tokenize(text) {
  if (!text) {
    return [];
  }
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => interpretToken(token.trim()))
    .filter((token) => token.length > 0);
}

export function scoreItem(item, tokens) {
  if (!item || !Array.isArray(tokens) || tokens.length === 0) {
    return 0;
  }
  let score = 0;
  const nameTokens = tokenize(item.name);
  const keywordTokens = Array.isArray(item.keywords) ? item.keywords.flatMap(tokenize) : [];
  const actionTokens = Array.isArray(item.option_cards)
    ? item.option_cards.flatMap((card) =>
        Array.isArray(card.actions)
          ? card.actions.flatMap((action) => tokenize(action.text))
          : []
      )
    : [];

  const nameSet = new Set(nameTokens);
  const keywordSet = new Set(keywordTokens);
  const actionSet = new Set(actionTokens);

  for (const token of tokens) {
    if (nameSet.has(token)) {
      score += 5;
      continue;
    }
    if (keywordSet.has(token)) {
      score += 3;
      continue;
    }
    if (actionSet.has(token)) {
      score += 1;
    }
  }

  if (score === 0) {
    return 0;
  }

  const fullQuery = tokens.join(' ');
  if (String(item.name || '').toLowerCase().includes(fullQuery)) {
    score += 4;
  }

  return score;
}

export function toCitySlug(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

