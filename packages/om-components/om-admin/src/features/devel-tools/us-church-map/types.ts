/**
 * types.ts — Types for USChurchMapPage.
 */

export interface StateGeo {
  name: string;
  path: string;
  cx: number;
  cy: number;
}

export interface ChurchCountsResponse {
  states: Record<string, number>;
  min: number;
  max: number;
  total: number;
  stateCount: number;
}

export interface StatusCounts {
  total: number;
  directory: number;
  pipeline: number;
  onboarding: number;
  live: number;
}

export interface StatusCountsResponse {
  states: Record<string, StatusCounts>;
  totals: StatusCounts;
}

export interface JurisdictionCount {
  jurisdiction: string;
  count: number;
}

export interface EnrichedChurch {
  id: number | string;
  name: string;
  street: string | null;
  city: string | null;
  state_code: string;
  zip: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  jurisdiction: string;
  pipeline_stage: string | null;
  stage_label: string | null;
  stage_color: string | null;
  priority: string | null;
  is_client: number;
  provisioned_church_id: number | null;
  source: 'crm' | 'onboarded';
  op_status: OpStatus;
  onboarded_church_id: number | null;
}

export interface StateChurchesEnriched {
  state: string;
  total: number;
  totalAll: number;
  jurisdictions: JurisdictionCount[];
  statusCounts: Record<string, number>;
  churches: EnrichedChurch[];
}

export interface OMChurch {
  id: number;
  name: string;
  church_name: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
}

export type OpStatus = 'directory' | 'pipeline' | 'onboarding' | 'live' | 'client';
export type ViewMode = 'all' | 'pipeline' | 'onboarding' | 'live';
export type MapMode = 'national' | 'parish';
