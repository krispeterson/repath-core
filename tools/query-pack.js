import { loadMergedPack } from './lib/pack-loader.js';
import { scoreItem, tokenize } from './lib/text-utils.js';

function parseArgs(argv) {
  const args = [...argv];
  let packId = 'glenwood-springs-co-us';
  const queryParts = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--pack' || arg === '--packId') {
      packId = args[i + 1] || packId;
      i += 1;
      continue;
    }
    if (arg.startsWith('--pack=')) {
      packId = arg.split('=')[1] || packId;
      continue;
    }
    if (arg.startsWith('--packId=')) {
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

const pack = loadMergedPack(packId);

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
