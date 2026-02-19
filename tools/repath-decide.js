import { decide } from './lib/decide.js';

function usage() {
  console.error(
    'Usage: node tools/repath-decide.js --packId <pack-id> (--label <text> | --queryText <text>) [--countryCode US] [--city "Fort Collins"] [--zip 80525] [--obs key=value]'
  );
}

function parseObsValue(rawValue) {
  const value = String(rawValue || '').trim();
  const lower = value.toLowerCase();
  if (lower === 'true') {
    return true;
  }
  if (lower === 'false') {
    return false;
  }
  return value;
}

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const parsed = {
    packId: '',
    label: '',
    queryText: '',
    countryCode: '',
    city: '',
    zip: '',
    obs: {}
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--packId' || arg === '--pack') {
      parsed.packId = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--packId=')) {
      parsed.packId = arg.split('=')[1] || '';
      continue;
    }
    if (arg === '--label') {
      parsed.label = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--label=')) {
      parsed.label = arg.slice('--label='.length).trim();
      continue;
    }
    if (arg === '--queryText') {
      parsed.queryText = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--queryText=')) {
      parsed.queryText = arg.slice('--queryText='.length).trim();
      continue;
    }
    if (arg === '--countryCode') {
      parsed.countryCode = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--countryCode=')) {
      parsed.countryCode = arg.slice('--countryCode='.length).trim();
      continue;
    }
    if (arg === '--city') {
      parsed.city = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--city=')) {
      parsed.city = arg.slice('--city='.length).trim();
      continue;
    }
    if (arg === '--zip') {
      parsed.zip = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (arg.startsWith('--zip=')) {
      parsed.zip = arg.slice('--zip='.length).trim();
      continue;
    }
    if (arg === '--obs') {
      const entry = String(args[i + 1] || '').trim();
      i += 1;
      const split = entry.indexOf('=');
      if (split > 0) {
        const key = entry.slice(0, split).trim();
        const value = entry.slice(split + 1).trim();
        if (key) {
          parsed.obs[key] = parseObsValue(value);
        }
      }
      continue;
    }
    if (arg.startsWith('--obs=')) {
      const entry = arg.slice('--obs='.length).trim();
      const split = entry.indexOf('=');
      if (split > 0) {
        const key = entry.slice(0, split).trim();
        const value = entry.slice(split + 1).trim();
        if (key) {
          parsed.obs[key] = parseObsValue(value);
        }
      }
      continue;
    }
  }

  return parsed;
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  usage();
  process.exit(0);
}

const args = parseArgs(process.argv.slice(2));
const query = args.label || args.queryText;

if (!args.packId || !query) {
  usage();
  process.exit(1);
}

const response = decide({
  packId: args.packId,
  label: args.label || undefined,
  queryText: args.queryText || undefined,
  context: {
    municipalityId: args.packId,
    countryCode: args.countryCode || undefined,
    city: args.city || undefined,
    zip: args.zip || undefined,
    obs: args.obs
  }
});

console.log(JSON.stringify(response, null, 2));

