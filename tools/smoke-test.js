import { spawnSync } from 'child_process';

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}

const validate = run('npm', ['run', 'validate']);
if (validate.status !== 0) {
  console.error(validate.stdout || '');
  console.error(validate.stderr || '');
  process.exit(1);
}

const query = run('node', ['tools/query-pack.js', '--pack', 'glenwood-springs-co-us', 'cardboard']);
if (query.status !== 0) {
  console.error(query.stdout || '');
  console.error(query.stderr || '');
  process.exit(1);
}

let options = null;
try {
  options = JSON.parse(query.stdout.trim());
} catch (error) {
  console.error('Failed to parse query output as JSON');
  console.error(query.stdout || '');
  process.exit(1);
}

const allowed = new Set(['reuse', 'dropoff_recycle', 'curbside_recycle', 'trash', 'unknown']);
const hasAllowed = Array.isArray(options) && options.some((o) => allowed.has(o.kind));

if (!hasAllowed) {
  console.error('Smoke test failed: no option cards with allowed kinds');
  process.exit(1);
}

console.log('Smoke test passed');
