import { loadMergedPack } from './pack-loader.js';
import { scoreItem, tokenize, toCitySlug } from './text-utils.js';

const ACTION_DEFAULT_RANK = {
  reuse: 10,
  sell: 12,
  giveaway: 14,
  exchange: 16,
  repair: 20,
  donate: 30,
  recycle: 60,
  trash: 100,
  unknown: 150
};

const ACTION_DEFAULT_TITLE = {
  reuse: 'Reuse first',
  sell: 'Sell or pass along',
  giveaway: 'Give away locally',
  exchange: 'Exchange with community',
  repair: 'Repair if practical',
  donate: 'Donate to a local organization',
  recycle: 'Recycle',
  trash: 'Trash (last resort)',
  unknown: 'Need more information'
};

const LEGACY_KIND_TO_ACTION = {
  reuse: 'reuse',
  sell: 'sell',
  curbside_recycle: 'recycle',
  dropoff_recycle: 'recycle',
  dropoff_other: 'recycle',
  dropoff_hhw: 'recycle',
  compost: 'recycle',
  trash: 'trash'
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeContext(rawContext, pack, requestPackId) {
  const context = isPlainObject(rawContext) ? rawContext : {};
  return {
    municipalityId: String(
      context.municipalityId || pack.pack_id || requestPackId || ''
    ).trim(),
    countryCode: String(
      context.countryCode ||
        (pack.municipality && pack.municipality.country) ||
        (pack.jurisdiction && pack.jurisdiction.country) ||
        ''
    )
      .trim()
      .toUpperCase(),
    city: String(context.city || '').trim(),
    zip: String(context.zip || '').trim(),
    citySlug: String(context.citySlug || '').trim(),
    geo: isPlainObject(context.geo) ? context.geo : undefined,
    userPrefs: isPlainObject(context.userPrefs) ? context.userPrefs : undefined,
    obs: isPlainObject(context.obs) ? context.obs : {}
  };
}

function defaultRankForAction(action) {
  return ACTION_DEFAULT_RANK[action] || ACTION_DEFAULT_RANK.unknown;
}

function defaultTitleForAction(action) {
  return ACTION_DEFAULT_TITLE[action] || ACTION_DEFAULT_TITLE.unknown;
}

function resolveBestItem(pack, queryText) {
  const items = Array.isArray(pack.items) ? pack.items : [];
  const query = String(queryText || '').trim();
  if (!query) {
    return null;
  }

  const queryLower = query.toLowerCase();
  const byId = items.find((item) => String(item.id || '').toLowerCase() === queryLower);
  if (byId) {
    return byId;
  }
  const byName = items.find((item) => String(item.name || '').toLowerCase() === queryLower);
  if (byName) {
    return byName;
  }
  const byKeyword = items.find((item) =>
    (Array.isArray(item.keywords) ? item.keywords : []).some(
      (keyword) => String(keyword || '').toLowerCase() === queryLower
    )
  );
  if (byKeyword) {
    return byKeyword;
  }

  const tokens = tokenize(query);
  const scored = items
    .map((item) => ({ item, score: scoreItem(item, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return scored[0].item;
  }

  return items.find((item) => String(item.name || '').toLowerCase().includes(queryLower)) || null;
}

function normalizeObsValue(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true') {
      return true;
    }
    if (trimmed === 'false') {
      return false;
    }
  }
  return value;
}

function ruleMatches(rule, context, item, queryTokens) {
  if (!isPlainObject(rule)) {
    return false;
  }

  const when = isPlainObject(rule.when) ? rule.when : {};

  if (Array.isArray(when.itemIds) && when.itemIds.length > 0) {
    if (!item || !when.itemIds.includes(item.id)) {
      return false;
    }
  }

  if (Array.isArray(when.keywords) && when.keywords.length > 0) {
    const sourceTokens = new Set([
      ...queryTokens,
      ...tokenize(item && item.name),
      ...((item && Array.isArray(item.keywords) ? item.keywords : []).flatMap(tokenize))
    ]);
    const hasMatch = when.keywords.some((keyword) =>
      tokenize(keyword).some((token) => sourceTokens.has(token))
    );
    if (!hasMatch) {
      return false;
    }
  }

  if (isPlainObject(when.obs)) {
    const observations = context.obs || {};
    const keys = Object.keys(when.obs);
    for (const key of keys) {
      const expected = normalizeObsValue(when.obs[key]);
      const actual = normalizeObsValue(observations[key]);
      if (actual !== expected) {
        return false;
      }
    }
  }

  return true;
}

function filterChannelByScope(channel, context) {
  const scope = channel.scope || 'global';

  if (scope === 'global') {
    return true;
  }

  if (scope === 'country') {
    if (!context.countryCode) {
      return false;
    }
    const countries = Array.isArray(channel.countries)
      ? channel.countries.map((code) => String(code).toUpperCase())
      : [];
    return countries.includes(context.countryCode);
  }

  if (scope === 'municipality') {
    if (!context.municipalityId) {
      return false;
    }
    const municipalityIds = Array.isArray(channel.municipalityIds)
      ? channel.municipalityIds
      : [];
    return municipalityIds.includes(context.municipalityId);
  }

  return false;
}

function buildTemplateValues(query, context, variables) {
  const baseVariables = isPlainObject(variables) ? variables : {};
  const contextCitySlug = context.citySlug ? toCitySlug(context.citySlug) : toCitySlug(context.city);
  const fallbackCitySlug = toCitySlug(baseVariables.craigslistSubdomain || '');

  return {
    ...baseVariables,
    query: String(query || '').trim(),
    city: context.city || '',
    zip: context.zip || '',
    citySlug: contextCitySlug || fallbackCitySlug
  };
}

function renderUrlTemplate(template, values) {
  const missing = new Set();
  const rendered = String(template || '').replace(/{{\s*([^}]+?)\s*}}/g, (_match, keyRaw) => {
    const key = String(keyRaw || '').trim();
    const value = values[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      missing.add(key);
      return `{{${key}}}`;
    }
    return encodeURIComponent(String(value));
  });

  return {
    url: missing.size === 0 ? rendered : null,
    missing: Array.from(missing)
  };
}

function resolveRuleChannels(thenClause, pack, context, query) {
  const channelsById = new Map(
    (Array.isArray(pack.channels) ? pack.channels : [])
      .filter((channel) => channel && channel.id)
      .map((channel) => [channel.id, channel])
  );
  const variables = isPlainObject(pack.variables) ? pack.variables : {};
  const requestedIds = Array.isArray(thenClause.channelIds) ? thenClause.channelIds : [];
  const resolved = [];

  requestedIds.forEach((channelId) => {
    const source = channelsById.get(channelId);
    if (!source || !filterChannelByScope(source, context)) {
      return;
    }

    const requires = Array.isArray(source.requires) ? source.requires : [];
    const templateValues = buildTemplateValues(query, context, variables);
    const missingRequired = requires.filter((field) => {
      const value = templateValues[field];
      return value === undefined || value === null || String(value).trim() === '';
    });

    let url = null;
    let missing = new Set(missingRequired);

    if (source.urlTemplate) {
      const rendered = renderUrlTemplate(source.urlTemplate, templateValues);
      rendered.missing.forEach((key) => missing.add(key));
      if (missing.size === 0) {
        url = rendered.url;
      }
    }

    resolved.push({
      ...source,
      url,
      missing: missing.size > 0 ? Array.from(missing) : undefined
    });
  });

  return resolved;
}

function resolveRuleLocations(thenClause, pack) {
  const allLocations = Array.isArray(pack.locations) ? pack.locations : [];
  const locationsById = new Map(
    allLocations.filter((location) => location && location.id).map((location) => [location.id, location])
  );
  const locationIds = Array.isArray(thenClause.locationIds) ? thenClause.locationIds : [];
  const locationTypes = Array.isArray(thenClause.locationTypes) ? thenClause.locationTypes : [];

  if (locationIds.length > 0) {
    return locationIds.map((id) => locationsById.get(id)).filter(Boolean);
  }

  if (locationTypes.length > 0) {
    const wanted = new Set(locationTypes);
    return allLocations.filter((location) => wanted.has(location.type));
  }

  if (thenClause.action === 'donate') {
    return allLocations.filter((location) => location.type === 'donation');
  }

  return [];
}

function makePathwayFromRule(rule, pack, context, query) {
  const thenClause = isPlainObject(rule.then) ? rule.then : {};
  const action = String(thenClause.action || rule.action || 'unknown');
  const priority =
    typeof thenClause.priority === 'number'
      ? thenClause.priority
      : typeof rule.priority === 'number'
        ? rule.priority
        : defaultRankForAction(action);

  return {
    id: String(rule.id || `${action}-${priority}`),
    action,
    title: String(thenClause.title || rule.title || defaultTitleForAction(action)),
    rationale: String(thenClause.rationale || rule.rationale || '').trim(),
    steps: Array.isArray(thenClause.steps) ? thenClause.steps.slice() : [],
    channels: resolveRuleChannels(thenClause, pack, context, query),
    locations: resolveRuleLocations(thenClause, pack),
    rank: priority,
    source: 'rule',
    ruleId: String(rule.id || '')
  };
}

function makePathwaysFromLegacyCards(item, pack) {
  if (!item || !Array.isArray(item.option_cards)) {
    return [];
  }
  const locationsById = new Map(
    (Array.isArray(pack.locations) ? pack.locations : [])
      .filter((location) => location && location.id)
      .map((location) => [location.id, location])
  );

  return item.option_cards.map((card) => {
    const action = LEGACY_KIND_TO_ACTION[card.kind] || 'unknown';
    const texts = Array.isArray(card.actions)
      ? card.actions
          .filter((actionEntry) => actionEntry && actionEntry.type === 'copy_text' && actionEntry.text)
          .map((actionEntry) => String(actionEntry.text))
      : [];
    const locationIds = Array.isArray(card.actions)
      ? card.actions
          .filter((actionEntry) => actionEntry && actionEntry.type === 'navigate')
          .map((actionEntry) =>
            (actionEntry.payload && actionEntry.payload.location_id) || actionEntry.location_id || null
          )
          .filter(Boolean)
      : [];
    const locations = locationIds.map((id) => locationsById.get(id)).filter(Boolean);

    return {
      id: String(card.id || `${item.id}-${action}`),
      action,
      title: String(card.title || defaultTitleForAction(action)),
      rationale: texts[0] || '',
      steps: texts.slice(1),
      channels: [],
      locations,
      rank: 200 + (typeof card.priority === 'number' ? card.priority : defaultRankForAction(action)),
      source: 'legacy_option_card',
      ruleId: null
    };
  });
}

function mergePathways(rulePathways, legacyPathways) {
  const output = [];
  const coveredActions = new Set();

  rulePathways.forEach((pathway) => {
    output.push(pathway);
    coveredActions.add(pathway.action);
  });

  legacyPathways.forEach((pathway) => {
    if (!coveredActions.has(pathway.action)) {
      output.push(pathway);
    }
  });

  return output
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return String(a.id).localeCompare(String(b.id));
    })
    .map((pathway) => {
      const next = { ...pathway };
      if (!next.channels || next.channels.length === 0) {
        delete next.channels;
      }
      if (!next.locations || next.locations.length === 0) {
        delete next.locations;
      }
      if (!next.steps || next.steps.length === 0) {
        delete next.steps;
      }
      if (!next.rationale) {
        delete next.rationale;
      }
      return next;
    });
}

function buildQuestions(pathways) {
  if (!Array.isArray(pathways) || pathways.length === 0) {
    return [];
  }

  const topPathway = pathways[0];
  const missing = new Set();

  (Array.isArray(topPathway.channels) ? topPathway.channels : []).forEach((channel) => {
    (Array.isArray(channel.missing) ? channel.missing : []).forEach((field) => missing.add(field));
  });

  const questions = [];
  if (missing.has('city') || missing.has('citySlug')) {
    questions.push({
      id: 'city',
      type: 'text',
      label: 'City',
      prompt: 'What city are you in?'
    });
  }
  if (missing.has('zip')) {
    questions.push({
      id: 'zip',
      type: 'text',
      label: 'ZIP code',
      prompt: 'What ZIP code are you in?'
    });
  }

  return questions;
}

export function decideWithPack(pack, request = {}) {
  if (!isPlainObject(pack)) {
    throw new Error('decideWithPack requires a pack object');
  }

  const packId = String(request.packId || pack.pack_id || '').trim();
  const queryText = String(request.label || request.queryText || '').trim();
  const context = normalizeContext(request.context, pack, packId);
  const item = resolveBestItem(pack, queryText);
  const canonicalQuery = String(queryText || (item && item.name) || '').trim();
  const queryTokens = tokenize(canonicalQuery || queryText);
  const rules = Array.isArray(pack.rules) ? pack.rules : [];

  const matchedRules = rules.filter((rule) => ruleMatches(rule, context, item, queryTokens));
  const rulePathways = matchedRules.map((rule) => makePathwayFromRule(rule, pack, context, canonicalQuery));
  const legacyPathways = makePathwaysFromLegacyCards(item, pack);
  const pathways = mergePathways(rulePathways, legacyPathways);
  const questions = buildQuestions(pathways);

  return {
    packId,
    query: canonicalQuery || queryText,
    item: item
      ? {
          id: item.id,
          name: item.name
        }
      : null,
    pathways,
    questions,
    ruleTrace: {
      itemId: item ? item.id : null,
      matchedRuleIds: matchedRules.map((rule) => String(rule.id || '')),
      pathwayIds: pathways.map((pathway) => pathway.id)
    }
  };
}

export function decide(request = {}, options = {}) {
  const packId = String(
    request.packId || (request.context && request.context.municipalityId) || ''
  ).trim();
  if (!packId) {
    throw new Error('packId is required');
  }
  const pack = options.pack || loadMergedPack(packId, { rootDir: options.rootDir || '.' });
  return decideWithPack(pack, { ...request, packId });
}
