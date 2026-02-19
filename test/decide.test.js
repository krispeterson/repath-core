import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import test from 'node:test';
import { loadMergedPack } from '../tools/lib/pack-loader.js';
import { decide, decideWithPack } from '../tools/lib/decide.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function findPathway(response, action) {
  return (response.pathways || []).find((pathway) => pathway.action === action) || null;
}

test('pack extends merge combines base, country, and municipality channels', () => {
  const pack = loadMergedPack('repath.muni.us-co-fort-collins.v1');
  const channelIds = new Set((pack.channels || []).map((channel) => channel.id));
  assert.equal(pack.extends[0], 'repath.country.us.channels.v1');
  assert.ok(channelIds.has('freecycle-town-finder'));
  assert.ok(channelIds.has('craigslist'));
  assert.ok(channelIds.has('fort-collins-local-gifting'));
  assert.ok((pack.locations || []).some((location) => location.id === 'goodwill-fort-collins'));
});

test('craigslist url renders with configured craigslistSubdomain and requires no question', () => {
  const response = decide({
    packId: 'repath.muni.us-co-fort-collins.v1',
    label: 'chair',
    context: {
      municipalityId: 'repath.muni.us-co-fort-collins.v1',
      countryCode: 'US'
    }
  });
  const reuse = findPathway(response, 'reuse');
  assert.ok(reuse);
  const craigslist = (reuse.channels || []).find((channel) => channel.id === 'craigslist');
  assert.ok(craigslist);
  assert.ok(craigslist.url);
  assert.match(craigslist.url, /fortcollins\.craigslist\.org/);
  assert.equal((response.questions || []).length, 0);
});

test('craigslist requires city/citySlug when subdomain and city are unavailable', () => {
  const pack = loadMergedPack('repath.muni.us-co-fort-collins.v1');
  delete pack.variables.craigslistSubdomain;
  const response = decideWithPack(pack, {
    packId: pack.pack_id,
    label: 'chair',
    context: {
      municipalityId: pack.pack_id,
      countryCode: 'US'
    }
  });
  const reuse = findPathway(response, 'reuse');
  const craigslist = (reuse.channels || []).find((channel) => channel.id === 'craigslist');
  assert.ok(craigslist);
  assert.equal(craigslist.url, null);
  assert.ok(Array.isArray(craigslist.missing) && craigslist.missing.includes('citySlug'));
  assert.ok((response.questions || []).some((question) => question.id === 'city'));
});

test('fort collins pathways include reuse channels and donation locations', () => {
  const response = decide({
    packId: 'fort-collins-co-us',
    label: 'chair',
    context: {
      municipalityId: 'fort-collins-co-us',
      countryCode: 'US'
    }
  });
  const reuse = findPathway(response, 'reuse');
  const donate = findPathway(response, 'donate');
  assert.ok(reuse);
  assert.ok(donate);
  assert.ok((reuse.channels || []).length >= 4);
  const donateLocationIds = new Set((donate.locations || []).map((location) => location.id));
  assert.ok(donateLocationIds.has('goodwill-fort-collins'));
  assert.ok(donateLocationIds.has('habitat-restore-fort-collins'));
});

test('channel filtering respects country and municipality scope', () => {
  const response = decide({
    packId: 'repath.muni.us-co-fort-collins.v1',
    label: 'chair',
    context: {
      municipalityId: 'some-other-municipality',
      countryCode: 'CA'
    }
  });
  const reuse = findPathway(response, 'reuse');
  const channelIds = new Set((reuse.channels || []).map((channel) => channel.id));
  assert.ok(!channelIds.has('craigslist'));
  assert.ok(!channelIds.has('fort-collins-local-gifting'));
  assert.ok(channelIds.has('ebay'));
});

test('decide response snapshot stays stable for fort collins chair flow', () => {
  const response = decide({
    packId: 'fort-collins-co-us',
    label: 'chair',
    context: {
      municipalityId: 'fort-collins-co-us',
      countryCode: 'US'
    }
  });
  const stableView = {
    query: response.query,
    item: response.item,
    pathways: (response.pathways || []).map((pathway) => ({
      id: pathway.id,
      action: pathway.action,
      title: pathway.title,
      channelIds: (pathway.channels || []).map((channel) => channel.id),
      locationIds: (pathway.locations || []).map((location) => location.id)
    })),
    questions: response.questions,
    ruleTrace: response.ruleTrace
  };
  const snapshotPath = path.join(process.cwd(), 'test', 'fixtures', 'fort-collins-chair.snapshot.json');
  const expected = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  assert.deepEqual(clone(stableView), expected);
});

test('us default fallback pack returns reuse guidance and asks for city when needed', () => {
  const response = decide({
    packId: 'repath.country.us.default.v1',
    label: 'chair',
    context: {
      municipalityId: 'repath.country.us.default.v1',
      countryCode: 'US',
      zip: '80525'
    }
  });
  const reuse = findPathway(response, 'reuse');
  const donate = findPathway(response, 'donate');
  assert.ok(reuse);
  assert.ok((reuse.channels || []).length >= 3);
  assert.ok((response.questions || []).some((question) => question.id === 'city'));
  assert.ok(donate);
  const goodwill = (donate.channels || []).find((channel) => channel.id === 'goodwill-locator');
  assert.ok(goodwill && typeof goodwill.url === 'string' && goodwill.url.includes('zip=80525'));
});
