export type ChannelCategory =
  | 'marketplace'
  | 'giveaway'
  | 'exchange'
  | 'repair_directory'
  | 'donation_directory';

export type ChannelScope = 'global' | 'country' | 'municipality';
export type ChannelRequirement = 'query' | 'city' | 'zip' | 'citySlug';

export interface Channel {
  id: string;
  name: string;
  category: ChannelCategory;
  scope: ChannelScope;
  countries?: string[];
  municipalityIds?: string[];
  urlTemplate?: string;
  requires?: ChannelRequirement[];
  notes?: string;
}

export interface Location {
  id: string;
  name: string;
  country: string;
  type?: string;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  website?: string;
  phone?: string;
}

export interface Pathway {
  id: string;
  action: string;
  title: string;
  rationale?: string;
  steps?: string[];
  channels?: Array<Channel & { url?: string; missing?: string[] }>;
  locations?: Location[];
}

export interface DecideContext {
  municipalityId: string;
  countryCode?: string;
  city?: string;
  zip?: string;
  citySlug?: string;
  geo?: { lat: number; lon: number };
  userPrefs?: Record<string, unknown>;
  obs?: Record<string, string | boolean | number>;
}

export interface DecideRequest {
  packId: string;
  label?: string;
  queryText?: string;
  context: DecideContext;
}

export interface DecideQuestion {
  id: 'city' | 'zip' | string;
  type: 'text';
  label: string;
  prompt: string;
}

export interface DecideResponse {
  packId: string;
  query: string;
  item: { id: string; name: string } | null;
  pathways: Pathway[];
  questions: DecideQuestion[];
  ruleTrace: {
    itemId: string | null;
    matchedRuleIds: string[];
    pathwayIds: string[];
  };
}

