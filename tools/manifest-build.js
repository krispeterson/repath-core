import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

const packsRoot = path.join('packages', 'packs');
const distDir = 'dist';
const manifestPath = path.join(distDir, 'manifest.json');
const searchIndexPath = path.join(distDir, 'search.json');
const schemaPath = path.join('schema', 'pack.schema.json');
const SCHEMA_VERSION = '1.1.0';
const schemaRaw = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, 'utf8') : '';
const schemaSha256 = schemaRaw
  ? crypto.createHash('sha256').update(schemaRaw).digest('hex')
  : null;
const packBaseUrlRaw = String(process.env.REPATH_PACK_BASE_URL || '').trim();
const packBaseUrl = packBaseUrlRaw ? packBaseUrlRaw.replace(/\/+$/, '') : '';

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

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function loadPack(packPath) {
  const raw = fs.readFileSync(packPath, 'utf8');
  return JSON.parse(raw);
}

function buildPackUrl(packId) {
  if (packBaseUrl) {
    return `${packBaseUrl}/${packId}.json`;
  }
  return `packages/packs/${packId}/pack.json`;
}

if (!fs.existsSync(packsRoot)) {
  console.error(`Missing packs directory: ${packsRoot}`);
  process.exit(1);
}

const packDirs = fs
  .readdirSync(packsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const manifest = {};
const searchIndex = {
  version: 1,
  generated_at: new Date().toISOString(),
  packs: {}
};

for (const dir of packDirs) {
  const packPath = path.join(packsRoot, dir, 'pack.json');
  if (!fs.existsSync(packPath)) {
    continue;
  }
  const pack = loadPack(packPath);
  const packId = pack.pack_id || dir;
  const jurisdiction = pack.jurisdiction || pack.municipality;
  const packSchemaVersion = pack.pack_schema_version || SCHEMA_VERSION;

  manifest[packId] = {
    url: buildPackUrl(packId),
    sha256: sha256File(packPath),
    pack_version: pack.pack_version,
    pack_schema_version: packSchemaVersion,
    pack_schema_sha256: schemaSha256,
    retrieved_at: pack.retrieved_at,
    jurisdiction,
    municipality: pack.municipality
  };

  const itemsById = {};
  const tokenToItems = {};

  pack.items.forEach((item) => {
    itemsById[item.id] = item.name;

    const tokens = [
      ...tokenize(item.name),
      ...(Array.isArray(item.keywords) ? item.keywords.flatMap(tokenize) : []),
      ...(Array.isArray(item.option_cards)
        ? item.option_cards.flatMap((card) =>
            Array.isArray(card.actions)
              ? card.actions.flatMap((action) => tokenize(action.text))
              : []
          )
        : [])
    ];

    const uniqueTokens = new Set(tokens);
    uniqueTokens.forEach((token) => {
      if (!tokenToItems[token]) {
        tokenToItems[token] = [];
      }
      tokenToItems[token].push(item.id);
    });
  });

  Object.keys(tokenToItems).forEach((token) => {
    tokenToItems[token] = Array.from(new Set(tokenToItems[token])).sort();
  });

  const orderedTokenToItems = Object.keys(tokenToItems)
    .sort()
    .reduce((acc, key) => {
      acc[key] = tokenToItems[key];
      return acc;
    }, {});

  const orderedItemsById = Object.keys(itemsById)
    .sort()
    .reduce((acc, key) => {
      acc[key] = itemsById[key];
      return acc;
    }, {});

  searchIndex.packs[packId] = {
    pack_version: pack.pack_version,
    pack_schema_version: packSchemaVersion,
    pack_schema_sha256: schemaSha256,
    retrieved_at: pack.retrieved_at,
    items: orderedItemsById,
    index: orderedTokenToItems
  };
}

const ordered = Object.keys(manifest)
  .sort()
  .reduce((acc, key) => {
    acc[key] = manifest[key];
    return acc;
  }, {});

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

fs.writeFileSync(manifestPath, JSON.stringify(ordered, null, 2) + '\n');
const orderedSearchPacks = Object.keys(searchIndex.packs)
  .sort()
  .reduce((acc, key) => {
    acc[key] = searchIndex.packs[key];
    return acc;
  }, {});
const orderedSearchIndex = {
  ...searchIndex,
  packs: orderedSearchPacks
};

fs.writeFileSync(searchIndexPath, JSON.stringify(orderedSearchIndex, null, 2) + '\n');
console.log(`Wrote ${manifestPath}`);
console.log(`Wrote ${searchIndexPath}`);
