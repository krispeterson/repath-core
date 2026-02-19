import fs from 'fs';
import path from 'path';

const ENTITY_ARRAY_KEYS = new Set(['channels', 'locations', 'rules', 'items', 'aliases']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeEntityArrays(baseEntries, childEntries) {
  const baseList = Array.isArray(baseEntries) ? baseEntries : [];
  const childList = Array.isArray(childEntries) ? childEntries : [];
  const output = baseList.map((entry) => clone(entry));
  const indexById = new Map();

  output.forEach((entry, index) => {
    if (isPlainObject(entry) && typeof entry.id === 'string' && entry.id.trim()) {
      indexById.set(entry.id, index);
    }
  });

  childList.forEach((entry) => {
    const copied = clone(entry);
    if (isPlainObject(copied) && typeof copied.id === 'string' && copied.id.trim()) {
      const existingIndex = indexById.get(copied.id);
      if (existingIndex !== undefined) {
        output[existingIndex] = copied;
      } else {
        indexById.set(copied.id, output.length);
        output.push(copied);
      }
      return;
    }
    output.push(copied);
  });

  return output;
}

export function mergePacks(basePack, childPack) {
  const base = isPlainObject(basePack) ? basePack : {};
  const child = isPlainObject(childPack) ? childPack : {};
  const merged = clone(base);

  Object.keys(child).forEach((key) => {
    const nextValue = child[key];

    if (ENTITY_ARRAY_KEYS.has(key)) {
      merged[key] = mergeEntityArrays(base[key], nextValue);
      return;
    }

    if (key === 'variables') {
      merged.variables = {
        ...(isPlainObject(base.variables) ? base.variables : {}),
        ...(isPlainObject(nextValue) ? nextValue : {})
      };
      return;
    }

    if (key === 'extends') {
      merged.extends = Array.isArray(nextValue) ? nextValue.slice() : [];
      return;
    }

    merged[key] = clone(nextValue);
  });

  return merged;
}

export function getPackPath(packId, rootDir = '.') {
  return path.join(rootDir, 'packages', 'packs', packId, 'pack.json');
}

export function loadPack(packId, rootDir = '.') {
  const packPath = getPackPath(packId, rootDir);
  if (!fs.existsSync(packPath)) {
    throw new Error(`Pack not found: ${packId}`);
  }
  return JSON.parse(fs.readFileSync(packPath, 'utf8'));
}

export function loadMergedPack(packId, options = {}) {
  const rootDir = options.rootDir || '.';
  const resolved = new Map();

  function resolveWithParents(currentPackId, stack = []) {
    if (stack.includes(currentPackId)) {
      const cycle = [...stack, currentPackId].join(' -> ');
      throw new Error(`Pack inheritance cycle detected: ${cycle}`);
    }

    if (resolved.has(currentPackId)) {
      return clone(resolved.get(currentPackId));
    }

    const currentPack = loadPack(currentPackId, rootDir);
    const parents = Array.isArray(currentPack.extends) ? currentPack.extends : [];
    let merged = {};

    parents.forEach((parentPackId) => {
      const parentMerged = resolveWithParents(parentPackId, [...stack, currentPackId]);
      merged = mergePacks(merged, parentMerged);
    });

    merged = mergePacks(merged, currentPack);
    resolved.set(currentPackId, merged);
    return clone(merged);
  }

  return resolveWithParents(packId, []);
}

