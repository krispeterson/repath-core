import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

function fail(errors) {
  console.error(errors.join('\n'));
  process.exit(1);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validatePack(pack, filePath, schemaValidator) {
  const errors = [];
  const prefix = filePath ? `${filePath}: ` : '';

  if (!pack || typeof pack !== 'object') {
    errors.push(`${prefix}Pack is not an object`);
    return errors;
  }

  if (schemaValidator) {
    const valid = schemaValidator(pack);
    if (!valid && schemaValidator.errors) {
      schemaValidator.errors.forEach((err) => {
        const at = err.instancePath || '(root)';
        errors.push(`${prefix}schema ${at} ${err.message}`);
      });
    }
  }

  if (!isNonEmptyString(pack.pack_id)) {
    errors.push(`${prefix}pack_id must be a non-empty string`);
  }
  if (!isNonEmptyString(pack.pack_version)) {
    errors.push(`${prefix}pack_version must be a non-empty string`);
  }
  if (pack.pack_schema_version !== undefined && !isNonEmptyString(pack.pack_schema_version)) {
    errors.push(`${prefix}pack_schema_version must be a non-empty string`);
  }
  if (!isNonEmptyString(pack.retrieved_at)) {
    errors.push(`${prefix}retrieved_at must be a non-empty string`);
  }

  const hasMunicipality = pack.municipality && typeof pack.municipality === 'object';
  const hasJurisdiction = pack.jurisdiction && typeof pack.jurisdiction === 'object';

  if (!hasMunicipality && !hasJurisdiction) {
    errors.push(`${prefix}Either municipality or jurisdiction must be provided`);
  }

  if (hasMunicipality) {
    if (!isNonEmptyString(pack.municipality.name)) {
      errors.push(`${prefix}municipality.name must be a non-empty string`);
    }
    if (!isNonEmptyString(pack.municipality.region)) {
      errors.push(`${prefix}municipality.region must be a non-empty string`);
    }
    if (!isNonEmptyString(pack.municipality.country)) {
      errors.push(`${prefix}municipality.country must be a non-empty string`);
    }
  }

  if (hasJurisdiction) {
    if (!isNonEmptyString(pack.jurisdiction.name)) {
      errors.push(`${prefix}jurisdiction.name must be a non-empty string`);
    }
    if (!isNonEmptyString(pack.jurisdiction.country)) {
      errors.push(`${prefix}jurisdiction.country must be a non-empty string`);
    }
    if (
      pack.jurisdiction.admin_areas !== undefined &&
      !Array.isArray(pack.jurisdiction.admin_areas)
    ) {
      errors.push(`${prefix}jurisdiction.admin_areas must be an array`);
    }
  }

  if (!Array.isArray(pack.locations)) {
    errors.push(`${prefix}locations must be an array`);
  } else {
    pack.locations.forEach((loc, i) => {
      if (!loc || typeof loc !== 'object') {
        errors.push(`${prefix}locations[${i}] must be an object`);
        return;
      }
      if (!isNonEmptyString(loc.id)) {
        errors.push(`${prefix}locations[${i}].id must be a non-empty string`);
      }
      if (!isNonEmptyString(loc.name)) {
        errors.push(`${prefix}locations[${i}].name must be a non-empty string`);
      }
      if (!isNonEmptyString(loc.country)) {
        errors.push(`${prefix}locations[${i}].country must be a non-empty string`);
      }
    });
  }

  if (!Array.isArray(pack.items)) {
    errors.push(`${prefix}items must be an array`);
  } else {
    pack.items.forEach((item, i) => {
      if (!item || typeof item !== 'object') {
        errors.push(`${prefix}items[${i}] must be an object`);
        return;
      }
      if (!isNonEmptyString(item.id)) {
        errors.push(`${prefix}items[${i}].id must be a non-empty string`);
      }
      if (!isNonEmptyString(item.name)) {
        errors.push(`${prefix}items[${i}].name must be a non-empty string`);
      }
      if (!Array.isArray(item.option_cards)) {
        errors.push(`${prefix}items[${i}].option_cards must be an array`);
      } else {
        item.option_cards.forEach((card, j) => {
          if (!card || typeof card !== 'object') {
            errors.push(`${prefix}items[${i}].option_cards[${j}] must be an object`);
            return;
          }
          if (!isNonEmptyString(card.id)) {
            errors.push(`${prefix}items[${i}].option_cards[${j}].id must be a non-empty string`);
          }
          if (!isNonEmptyString(card.kind)) {
            errors.push(`${prefix}items[${i}].option_cards[${j}].kind must be a non-empty string`);
          }
          if (!isNonEmptyString(card.title)) {
            errors.push(`${prefix}items[${i}].option_cards[${j}].title must be a non-empty string`);
          }
          if (typeof card.priority !== 'number') {
            errors.push(`${prefix}items[${i}].option_cards[${j}].priority must be a number`);
          }
          if (typeof card.confidence !== 'number') {
            errors.push(`${prefix}items[${i}].option_cards[${j}].confidence must be a number`);
          }
          if (!Array.isArray(card.actions)) {
            errors.push(`${prefix}items[${i}].option_cards[${j}].actions must be an array`);
          }
        });
      }
    });
  }

  return errors;
}

function readPackFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function resolvePackPaths(packId) {
  if (packId) {
    return [path.join('packages', 'packs', packId, 'pack.json')];
  }
  const packsDir = path.join('packages', 'packs');
  if (!fs.existsSync(packsDir)) {
    return [];
  }
  return fs
    .readdirSync(packsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(packsDir, entry.name, 'pack.json'))
    .filter((packPath) => fs.existsSync(packPath));
}

const args = process.argv.slice(2);
const packFlagIndex = args.findIndex((arg) => arg === '--pack' || arg.startsWith('--pack='));
let packId = null;

if (packFlagIndex !== -1) {
  const arg = args[packFlagIndex];
  if (arg.indexOf('=') !== -1) {
    packId = arg.split('=')[1];
  } else {
    packId = args[packFlagIndex + 1];
  }
}

const packPaths = resolvePackPaths(packId);
if (packPaths.length === 0) {
  fail([packId ? `No pack found for ${packId}` : 'No packs found under packages/packs']);
}

const require = createRequire(import.meta.url);
let schemaValidator = null;
const schemaPath = path.join('schema', 'pack.schema.json');
if (fs.existsSync(schemaPath)) {
  try {
    const Ajv2020 = require('ajv/dist/2020');
    const addFormats = require('ajv-formats');
    const ajv = new Ajv2020({ allErrors: true });
    addFormats(ajv);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    schemaValidator = ajv.compile(schema);
  } catch (error) {
    console.warn('Schema validation skipped:', error.message);
  }
}

const allErrors = [];
for (const packPath of packPaths) {
  try {
    const pack = readPackFile(packPath);
    const errors = validatePack(pack, packPath, schemaValidator);
    allErrors.push(...errors);
  } catch (error) {
    allErrors.push(`${packPath}: ${error.message}`);
  }
}

if (allErrors.length > 0) {
  fail(allErrors);
}

console.log(`Validated ${packPaths.length} pack(s)`);
