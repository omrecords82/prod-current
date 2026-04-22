/**
 * ParishDetailMap — Mapbox GL parish-level interactive map
 *
 * Renders individual parish markers colored by jurisdiction/affiliation,
 * with clustering for dense areas, popups, and bidirectional selection
 * sync with the sidebar parish list.
 *
 * Ported from OMAI (/omai/ops/church-map/ParishDetailMap.tsx).
 * Adapted: react-map-gl v7 imports, MUI icons instead of Tabler.
 */

import {
  Language as WebIcon,
  Phone as PhoneIcon,
  Place as PlaceIcon,
} from '@mui/icons-material';
import {
  alpha,
  Box,
  Chip,
  Link,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import type { GeoJSONSource } from 'mapbox-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, NavigationControl, Popup, Source } from 'react-map-gl';
import type { MapRef } from 'react-map-gl';

import 'mapbox-gl/dist/mapbox-gl.css';

// ─── Affiliation color palette ──────────────────────────────────

export const AFFILIATION_COLORS: Record<string, string> = {
  'Greek Orthodox': '#1565C0',
  OCA: '#2E7D32',
  ROCOR: '#C62828',
  Antiochian: '#7B1FA2',
  Serbian: '#00838F',
  Romanian: '#E65100',
  Ukrainian: '#F9A825',
  Bulgarian: '#558B2F',
  Albanian: '#AD1457',
  'Carpatho-Russian': '#5D4037',
  Georgian: '#37474F',
  Other: '#757575',
};

export const AFFILIATION_ORDER = [
  'Greek Orthodox', 'OCA', 'ROCOR', 'Antiochian', 'Serbian',
  'Romanian', 'Ukrainian', 'Bulgarian', 'Albanian',
  'Carpatho-Russian', 'Georgian', 'Other',
];

// ─── Types ──────────────────────────────────────────────────────

export interface ParishProperties {
  id: number;
  name: string;
  city: string | null;
  state: string;
  street: string | null;
  zip: string | null;
  phone: string | null;
  website: string | null;
  affiliation: string | null;
  affiliation_normalized: string;
  op_status: string;
  stage_label: string | null;
  stage_color: string | null;
  priority: string | null;
  is_client: number;
  has_coordinates: boolean;
  directory_only: boolean;
}

export interface ParishFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] } | null;
  properties: ParishProperties;
}

export interface ParishGeoJSON {
  type: 'FeatureCollection';
  features: ParishFeature[];
  metadata: {
    state: string;
    total: number;
    withCoordinates: number;
    withoutCoordinates: number;
    affiliations: { name: string; count: number }[];
  };
}

interface ParishDetailMapProps {
  geoData: ParishGeoJSON;
  selectedParishId: number | null;
  affiliationFilter: Set<string>;
  statusFilter: string;
  onSelectParish: (id: number | null) => void;
  stateCode: string;
}

// ─── State center coordinates ───────────────────────────────────

const STATE_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  AL: { lat: 32.8, lng: -86.8, zoom: 6.5 },
  AK: { lat: 64.2, lng: -152.5, zoom: 3.5 },
  AZ: { lat: 34.3, lng: -111.7, zoom: 6 },
  AR: { lat: 34.8, lng: -92.2, zoom: 6.5 },
  CA: { lat: 37.2, lng: -119.4, zoom: 5.5 },
  CO: { lat: 39.0, lng: -105.5, zoom: 6 },
  CT: { lat: 41.6, lng: -72.7, zoom: 8.5 },
  DE: { lat: 39.0, lng: -75.5, zoom: 8.5 },
  DC: { lat: 38.9, lng: -77.0, zoom: 11 },
  FL: { lat: 28.6, lng: -82.4, zoom: 5.8 },
  GA: { lat: 32.7, lng: -83.5, zoom: 6.3 },
  HI: { lat: 20.5, lng: -157.5, zoom: 6 },
  ID: { lat: 44.4, lng: -114.7, zoom: 5.8 },
  IL: { lat: 40.0, lng: -89.2, zoom: 6 },
  IN: { lat: 39.8, lng: -86.2, zoom: 6.5 },
  IA: { lat: 42.0, lng: -93.5, zoom: 6.3 },
  KS: { lat: 38.5, lng: -98.3, zoom: 6 },
  KY: { lat: 37.8, lng: -85.7, zoom: 6.5 },
  LA: { lat: 31.0, lng: -92.0, zoom: 6.3 },
  ME: { lat: 45.4, lng: -69.2, zoom: 6.3 },
  MD: { lat: 39.0, lng: -76.7, zoom: 7.5 },
  MA: { lat: 42.2, lng: -71.8, zoom: 7.8 },
  MI: { lat: 44.3, lng: -84.5, zoom: 5.8 },
  MN: { lat: 46.3, lng: -94.3, zoom: 5.8 },
  MS: { lat: 32.7, lng: -89.7, zoom: 6.3 },
  MO: { lat: 38.4, lng: -92.5, zoom: 6 },
  MT: { lat: 47.0, lng: -109.6, zoom: 5.8 },
  NE: { lat: 41.5, lng: -99.8, zoom: 6 },
  NV: { lat: 39.3, lng: -116.6, zoom: 5.8 },
  NH: { lat: 43.7, lng: -71.6, zoom: 7.3 },
  NJ: { lat: 40.2, lng: -74.65, zoom: 7.8 },
  NM: { lat: 34.4, lng: -106.1, zoom: 6 },
  NY: { lat: 41.5, lng: -75.5, zoom: 6.5 },
  NC: { lat: 35.6, lng: -79.8, zoom: 6.3 },
  ND: { lat: 47.4, lng: -100.5, zoom: 6 },
  OH: { lat: 40.4, lng: -82.7, zoom: 6.5 },
  OK: { lat: 35.6, lng: -97.5, zoom: 6.3 },
  OR: { lat: 44.0, lng: -120.5, zoom: 6 },
  PA: { lat: 41.0, lng: -77.6, zoom: 6.5 },
  RI: { lat: 41.7, lng: -71.5, zoom: 9.5 },
  SC: { lat: 33.9, lng: -80.9, zoom: 6.8 },
  SD: { lat: 44.4, lng: -100.2, zoom: 6 },
  TN: { lat: 35.9, lng: -86.4, zoom: 6.3 },
  TX: { lat: 31.5, lng: -99.3, zoom: 5.3 },
  UT: { lat: 39.3, lng: -111.7, zoom: 6 },
  VT: { lat: 44.1, lng: -72.6, zoom: 7.5 },
  VA: { lat: 37.5, lng: -78.8, zoom: 6.5 },
  WA: { lat: 47.4, lng: -120.5, zoom: 6.3 },
  WV: { lat: 38.6, lng: -80.6, zoom: 6.8 },
  WI: { lat: 44.6, lng: -89.8, zoom: 6 },
  WY: { lat: 43.0, lng: -107.6, zoom: 6 },
};

const MAPBOX_TOKEN = import.meta.env.VITE_APP_MAPBOX_ACCESS_TOKEN;

// ─── Helpers ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  directory: { label: 'Directory Only', color: '#9e9e9e' },
  pipeline: { label: 'CRM Pipeline', color: '#2196f3' },
  onboarding: { label: 'Onboarding', color: '#ff9800' },
  live: { label: 'Live Client', color: '#4caf50' },
  client: { label: 'Client', color: '#4caf50' },
};

// ─── Component ──────────────────────────────────────────────────

export default function ParishDetailMap({
  geoData,
  selectedParishId,
  affiliationFilter,
  statusFilter,
  onSelectParish,
  stateCode,
}: ParishDetailMapProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const mapRef = useRef<MapRef>(null);
  const [popupInfo, setPopupInfo] = useState<(ParishProperties & { lng: number; lat: number }) | null>(null);

  // Build Mapbox GL match expression for marker colors
  const colorMatchExpr = useMemo((): any => {
    const expr: any[] = ['match', ['get', 'affiliation_normalized']];
    for (const [aff, color] of Object.entries(AFFILIATION_COLORS)) {
      expr.push(aff, color);
    }
    expr.push('#757575');
    return expr;
  }, []);

  // Filter GeoJSON by active affiliations and status
  const filteredGeoJSON = useMemo(() => {
    const hasAffFilter = affiliationFilter.size > 0;
    const filtered = geoData.features.filter((f) => {
      if (!f.geometry) return false;
      if (hasAffFilter && !affiliationFilter.has(f.properties.affiliation_normalized)) return false;
      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'live') {
          if (f.properties.op_status !== 'live' && f.properties.op_status !== 'client') return false;
        } else if (f.properties.op_status !== statusFilter) return false;
      }
      return true;
    });
    return { type: 'FeatureCollection' as const, features: filtered };
  }, [geoData, affiliationFilter, statusFilter]);

  const center = STATE_CENTERS[stateCode] || { lat: 39.8, lng: -98.6, zoom: 4.5 };

  // Click handler for map features
  const handleMapClick = useCallback(
    (e: any) => {
      const features = e.features;
      if (!features || features.length === 0) {
        onSelectParish(null);
        setPopupInfo(null);
        return;
      }

      const feature = features[0];

      // Cluster click → zoom in
      if (feature.properties?.cluster) {
        const source = mapRef.current?.getSource('parishes') as GeoJSONSource | undefined;
        if (source && feature.properties.cluster_id != null) {
          source.getClusterExpansionZoom(feature.properties.cluster_id, (err: any, zoom: number | null | undefined) => {
            if (err || zoom == null) return;
            if (feature.geometry?.type === 'Point') {
              mapRef.current?.easeTo({
                center: feature.geometry.coordinates as [number, number],
                zoom: Math.min(zoom || 14, 16),
                duration: 500,
              });
            }
          });
        }
        return;
      }

      // Individual parish click
      const props = feature.properties;
      if (props?.id && feature.geometry?.type === 'Point') {
        const parishId = typeof props.id === 'string' ? parseInt(props.id, 10) : props.id;
        const [lng, lat] = feature.geometry.coordinates;
        onSelectParish(parishId);
        setPopupInfo({
          id: parishId,
          name: props.name || '',
          city: props.city || null,
          state: props.state || '',
          street: props.street || null,
          zip: props.zip || null,
          phone: props.phone || null,
          website: props.website || null,
          affiliation: props.affiliation || null,
          affiliation_normalized: props.affiliation_normalized || 'Other',
          op_status: props.op_status || 'directory',
          stage_label: props.stage_label || null,
          stage_color: props.stage_color || null,
          priority: props.priority || null,
          is_client: Number(props.is_client) || 0,
          has_coordinates: props.has_coordinates === true || props.has_coordinates === 'true',
          directory_only: props.directory_only === true || props.directory_only === 'true',
          lng,
          lat,
        });
      }
    },
    [onSelectParish],
  );

  // Fly to selected parish when triggered from sidebar
  useEffect(() => {
    if (!selectedParishId || !mapRef.current) {
      if (!selectedParishId) setPopupInfo(null);
      return;
    }
    const feature = geoData.features.find((f) => f.properties.id === selectedParishId && f.geometry);
    if (feature?.geometry) {
      const [lng, lat] = feature.geometry.coordinates!;
      mapRef.current.flyTo({ center: [lng, lat], zoom: 13, duration: 800 });
      setPopupInfo({ ...feature.properties, lng, lat });
    }
  }, [selectedParishId, geoData]);

  const mapStyle = isDark ? 'mapbox://styles/mapbox/dark-v10' : 'mapbox://styles/mapbox/light-v10';

  const selectedId = selectedParishId ?? -1;

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', minHeight: 500 }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          latitude: center.lat,
          longitude: center.lng,
          zoom: center.zoom,
        }}
        mapStyle={mapStyle}
        interactiveLayerIds={['parish-clusters', 'parish-unclustered']}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%', minHeight: 500, borderRadius: 8 }}
        attributionControl={false}
      >
        <NavigationControl position="top-left" showCompass={false} />

        <Source id="parishes" type="geojson" data={filteredGeoJSON as any} cluster clusterMaxZoom={13} clusterRadius={45}>
          {/* Cluster circles */}
          <Layer
            id="parish-clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{
              'circle-color': isDark ? '#3d5a80' : '#4a7fc1',
              'circle-opacity': 0.85,
              'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 30, 26, 50, 32],
              'circle-stroke-width': 2,
              'circle-stroke-color': isDark ? '#5a7da8' : '#fff',
            }}
          />

          {/* Cluster count text */}
          <Layer
            id="parish-cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12,
            }}
            paint={{ 'text-color': '#fff' }}
          />

          {/* Individual parish markers — color by jurisdiction */}
          <Layer
            id="parish-unclustered"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': colorMatchExpr,
              'circle-radius': ['case', ['==', ['get', 'id'], selectedId], 10, 6.5],
              'circle-stroke-width': ['case', ['==', ['get', 'id'], selectedId], 3, 1.5],
              'circle-stroke-color': isDark ? '#1a1a2e' : '#fff',
              'circle-opacity': 0.92,
            }}
          />

          {/* Selected parish glow ring */}
          <Layer
            id="parish-selected-ring"
            type="circle"
            filter={['==', ['get', 'id'], selectedId]}
            paint={{
              'circle-radius': 16,
              'circle-color': 'transparent',
              'circle-stroke-width': 2,
              'circle-stroke-color': isDark ? '#90caf9' : '#1976d2',
              'circle-opacity': 0.6,
            }}
          />
        </Source>

        {/* Popup */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.lng}
            latitude={popupInfo.lat}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton
            closeOnClick={false}
            maxWidth="300px"
            offset={14}
          >
            <Box sx={{ p: 0.75, minWidth: 210 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 0.5, color: '#111', lineHeight: 1.3 }}>
                {popupInfo.name}
              </Typography>
              <Stack spacing={0.4}>
                {(popupInfo.street || popupInfo.city) && (
                  <Stack direction="row" spacing={0.5} alignItems="flex-start">
                    <PlaceIcon sx={{ fontSize: 13, color: '#666', mt: '2px', flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: '#555', lineHeight: 1.4 }}>
                      {[popupInfo.street, popupInfo.city, popupInfo.state, popupInfo.zip].filter(Boolean).join(', ')}
                    </Typography>
                  </Stack>
                )}
                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                  <Chip
                    label={popupInfo.affiliation_normalized}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      bgcolor: alpha(AFFILIATION_COLORS[popupInfo.affiliation_normalized] || '#757575', 0.15),
                      color: AFFILIATION_COLORS[popupInfo.affiliation_normalized] || '#757575',
                      border: `1px solid ${alpha(AFFILIATION_COLORS[popupInfo.affiliation_normalized] || '#757575', 0.3)}`,
                    }}
                  />
                  {popupInfo.op_status && popupInfo.op_status !== 'directory' && (
                    <Chip
                      label={STATUS_CONFIG[popupInfo.op_status]?.label || popupInfo.op_status}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        bgcolor: alpha(STATUS_CONFIG[popupInfo.op_status]?.color || '#999', 0.12),
                        color: STATUS_CONFIG[popupInfo.op_status]?.color || '#999',
                      }}
                    />
                  )}
                </Stack>
                {popupInfo.phone && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <PhoneIcon sx={{ fontSize: 12, color: '#666' }} />
                    <Typography variant="caption" sx={{ color: '#555' }}>
                      {popupInfo.phone}
                    </Typography>
                  </Stack>
                )}
                {popupInfo.website && (
                  <Link
                    href={popupInfo.website}
                    target="_blank"
                    rel="noopener"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none', fontSize: '0.7rem' }}
                  >
                    <WebIcon sx={{ fontSize: 12 }} />
                    Visit Website
                  </Link>
                )}
              </Stack>
            </Box>
          </Popup>
        )}
      </Map>

      {/* Legend overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 10,
          bgcolor: alpha(theme.palette.background.paper, 0.92),
          borderRadius: 1.5,
          p: 1.25,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          minWidth: 140,
          maxHeight: 280,
          overflow: 'auto',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Typography variant="caption" fontWeight={700} sx={{ mb: 0.5, display: 'block' }}>
          Jurisdiction
        </Typography>
        {geoData.metadata.affiliations.map((aff) => (
          <Box key={aff.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: AFFILIATION_COLORS[aff.name] || '#757575',
                border: `1.5px solid ${isDark ? '#444' : '#ddd'}`,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" sx={{ fontSize: '0.65rem', flex: 1 }}>
              {aff.name}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600, color: 'text.secondary' }}>
              {aff.count}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
