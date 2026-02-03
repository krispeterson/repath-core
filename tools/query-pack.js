import fs from 'fs';
import path from 'path';
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

function tokenize(text) {
  if (!text) {
    return [];
  }
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => interpretToken(token.trim()))
    .filter((token) => token.length > 0);
}

function scoreItem(item, tokens) {
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
  if (item.name.toLowerCase().includes(fullQuery)) {
    score += 4;
  }

  return score;
}

function parseArgs(argv) {
  const args = [...argv];
  let packId = 'glenwood-springs-co-us';
  const queryParts = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--pack') {
      packId = args[i + 1] || packId;
      i += 1;
      continue;
    }
    if (arg.startsWith('--pack=')) {
      packId = arg.split('=')[1] || packId;
      continue;
    }
    if (arg.startsWith('--')) {
      continue;
    }
    queryParts.push(arg);
  }

  return { packId, query: queryParts.join(' ') };
}

const { packId, query } = parseArgs(process.argv.slice(2));

if (!query.trim()) {
  console.error('Usage: npm run query -- --pack <pack-id> "search term"');
  process.exit(1);
}

const packPath = path.join('packages', 'packs', packId, 'pack.json');
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));

const tokens = tokenize(query);
const scored = pack.items
  .map((item) => ({ item, score: scoreItem(item, tokens) }))
  .filter((entry) => entry.score > 0)
  .sort((a, b) => b.score - a.score);

if (scored.length === 0) {
  console.log('No match');
} else {
  console.log(JSON.stringify(scored[0].item.option_cards, null, 2));
}
