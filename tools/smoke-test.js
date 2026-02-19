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

const decideRun = run('node', [
  'tools/repath-decide.js',
  '--packId',
  'repath.muni.us-co-fort-collins.v1',
  '--label',
  'chair',
  '--countryCode',
  'US'
]);

if (decideRun.status !== 0) {
  console.error(decideRun.stdout || '');
  console.error(decideRun.stderr || '');
  process.exit(1);
}

let decision = null;
try {
  decision = JSON.parse(decideRun.stdout.trim());
} catch (error) {
  console.error('Failed to parse decide output as JSON');
  console.error(decideRun.stdout || '');
  process.exit(1);
}

const reusePathway = Array.isArray(decision.pathways)
  ? decision.pathways.find((pathway) => pathway.action === 'reuse')
  : null;

if (!reusePathway || !Array.isArray(reusePathway.channels) || reusePathway.channels.length < 2) {
  console.error('Smoke test failed: expected reuse pathway with channels in decide output');
  process.exit(1);
}

console.log('Smoke test passed');
