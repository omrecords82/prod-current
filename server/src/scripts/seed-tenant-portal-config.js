#!/usr/bin/env node
/**
 * OMOD-1502 — seed tenant_portal_config_items for a given church_id.
 *
 * Usage:
 *   node server/src/scripts/seed-tenant-portal-config.js <church_id>
 *   node server/src/scripts/seed-tenant-portal-config.js 46
 *
 * Idempotent — uses INSERT ... ON DUPLICATE KEY UPDATE on the natural key
 * (church_id, config_key). Safe to re-run; will refresh existing rows to
 * the canonical OMOD-1498 audit defaults without overwriting is_active=0
 * status (preserves operator soft-disables).
 *
 * V1 baseline drawn from the OMOD-1498 audit categories (12 categories,
 * including 'auth' which §C omits but the audit identified as a real
 * cross-cutting category — table enum already extends §C to include it).
 *
 * This is a SEED, not a migration — opt-in per church. The migration only
 * creates the table; this populates it with the safe-known-good baseline
 * derived from the live OM code at audit time.
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mysql = require('mysql2/promise');

const SEED_CONFIG_KEY = 'OMOD-1502:v1';

// One row per audit config-item. Keys mirror the §C schema. Each row applies
// to ANY church (the audit is structural — what the portal exposes, not
// what data lives there). Operator can disable individual rows for a tenant
// after seeding via the admin UI.
const SEED_ROWS = [
  // ── portal ────────────────────────────────────────────────────────────
  { config_key: 'portal.layout.chrome', display_name: 'Portal layout chrome', category: 'portal', target_surface: 'front-end/src/layouts/portal/ChurchPortalLayout.tsx', user_roles: ['super_admin','admin','church_admin','priest','deacon','editor'], current_source: { frontend_file: 'front-end/src/layouts/portal/ChurchPortalLayout.tsx', hardcoded: true }, current_behavior: 'HpHeader + Container + SiteFooter', omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'low' } },
  { config_key: 'portal.layout.unauthenticated_redirect', display_name: 'Unauthenticated redirect target', category: 'portal', target_surface: 'front-end/src/layouts/portal/ChurchPortalLayout.tsx:27', current_source: { frontend_file: 'front-end/src/layouts/portal/ChurchPortalLayout.tsx', hardcoded: true }, current_behavior: 'Redirects to /auth/login', omstudio_package_relevance: { can_be_targeted_by_omstudio: false, package_slot_candidate: false, requires_preflight_validation: false, risk_level: 'low' } },
  { config_key: 'portal.dashboard.hub_root', display_name: 'Portal dashboard hub root', category: 'portal', target_surface: 'front-end/src/features/portal/ChurchPortalHub.tsx', user_roles: ['super_admin','admin','church_admin','priest','deacon','editor'], current_source: { frontend_file: 'front-end/src/features/portal/ChurchPortalHub.tsx', hardcoded: false }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'medium' } },
  { config_key: 'portal.dashboard.hero_image', display_name: 'Hero banner image', category: 'portal', target_surface: 'front-end/src/features/portal/HeroBanner.tsx:9-13', current_source: { frontend_file: 'front-end/src/features/portal/HeroBanner.tsx', hardcoded: true, db_column: null }, current_behavior: 'HARDCODED HERO_IMAGES map; only church 46 has an entry today', gaps_or_risks: ['No DB column or admin UI controls hero image; Phase 5 must add this'], omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'high', notes: 'High-priority gap from OMOD-1498 audit' } },
  { config_key: 'portal.dashboard.greeting_text', display_name: 'Welcome greeting', category: 'portal', target_surface: 'front-end/src/features/portal/ChurchPortalHub.tsx:71-82', current_source: { frontend_file: 'front-end/src/features/portal/ChurchPortalHub.tsx', hardcoded: true }, current_behavior: 'Composed from useAuth() user profile', omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: false, requires_preflight_validation: false, risk_level: 'low' } },
  { config_key: 'portal.dashboard.role_label', display_name: 'Role chip label', category: 'portal', target_surface: 'front-end/src/features/portal/ChurchPortalHub.tsx:71-82', current_source: { frontend_file: 'front-end/src/features/portal/ChurchPortalHub.tsx', db_column: 'users.role', hardcoded: false }, omstudio_package_relevance: { can_be_targeted_by_omstudio: false, package_slot_candidate: false, requires_preflight_validation: false, risk_level: 'low' } },
  { config_key: 'portal.dashboard.state_machine', display_name: 'Onboarding/Pipeline/Dashboard tri-state', category: 'portal', target_surface: 'front-end/src/features/portal/ChurchPortalHub.tsx:530-537', current_source: { frontend_file: 'front-end/src/features/portal/ChurchPortalHub.tsx', hardcoded: true }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: false, requires_preflight_validation: true, risk_level: 'medium' } },
  { config_key: 'portal.dashboard.search_box', display_name: 'Global search box', category: 'portal', target_surface: 'front-end/src/features/portal/ChurchPortalHub.tsx:317-421', current_source: { frontend_file: 'front-end/src/features/portal/ChurchPortalHub.tsx', backend_route: '/api/{baptism,marriage,funeral}-records?search=' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'medium' } },
  { config_key: 'portal.dashboard.recent_activity', display_name: 'Recent activity panel', category: 'portal', target_surface: 'front-end/src/features/portal/ChurchPortalHub.tsx:442-469', current_source: { frontend_file: 'front-end/src/features/portal/ChurchPortalHub.tsx', backend_route: '/api/{baptism,marriage,funeral}-records?limit=5' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'medium' } },
  { config_key: 'portal.dashboard.record_pipeline', display_name: 'Record pipeline stage bar', category: 'portal', target_surface: 'front-end/src/features/portal/RecordPipelineStatus.tsx', current_source: { frontend_file: 'front-end/src/features/portal/RecordPipelineStatus.tsx', backend_route: '/api/record-batches/summary', db_table: 'record_batches', db_column: 'status' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'medium' } },
  { config_key: 'portal.dashboard.scope_resolution', display_name: 'Active church scope resolution', category: 'portal', target_surface: 'front-end/src/features/portal/ChurchPortalHub.tsx:269', current_source: { backend_route: '/api/my/churches', db_table: 'churches' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: false, package_slot_candidate: false, requires_preflight_validation: true, risk_level: 'low' } },

  // ── records ───────────────────────────────────────────────────────────
  { config_key: 'records.baptism.list', display_name: 'Baptism records list', category: 'records', target_surface: '/portal/records/baptism', user_roles: ['super_admin','admin','church_admin','priest','deacon','editor'], current_source: { frontend_file: 'front-end/src/features/records-centralized/components/baptism/BaptismRecordsPage.tsx', backend_route: '/api/baptism-records', db_table: 'baptism_records' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'medium' } },
  { config_key: 'records.baptism.detail', display_name: 'Baptism record detail', category: 'records', target_surface: '/portal/records/baptism/:id', current_source: { backend_route: '/api/baptism-records/:id', db_table: 'baptism_records' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: false, requires_preflight_validation: true, risk_level: 'low' } },
  { config_key: 'records.baptism.add', display_name: 'Add baptism record', category: 'records', target_surface: '/portal/records/baptism/new', current_source: { backend_route: 'POST /api/baptism-records', db_table: 'baptism_records' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: false, requires_preflight_validation: true, risk_level: 'low' } },
  { config_key: 'records.baptism.edit', display_name: 'Edit baptism record', category: 'records', target_surface: '/portal/records/baptism/edit/:id', current_source: { backend_route: 'PUT /api/baptism-records/:id', db_table: 'baptism_records' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: false, requires_preflight_validation: true, risk_level: 'low' } },
  { config_key: 'records.marriage.list', display_name: 'Marriage records list', category: 'records', target_surface: '/portal/records/marriage', current_source: { backend_route: '/api/marriage-records', db_table: 'marriage_records' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'medium' } },
  { config_key: 'records.marriage.add', display_name: 'Add marriage record', category: 'records', target_surface: '/portal/records/marriage/new', current_source: { backend_route: 'POST /api/marriage-records', db_table: 'marriage_records' } },
  { config_key: 'records.marriage.edit', display_name: 'Edit marriage record', category: 'records', target_surface: '/portal/records/marriage/edit/:id', current_source: { backend_route: 'PUT /api/marriage-records/:id', db_table: 'marriage_records' } },
  { config_key: 'records.funeral.list', display_name: 'Funeral records list', category: 'records', target_surface: '/portal/records/funeral', current_source: { backend_route: '/api/funeral-records', db_table: 'funeral_records' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'medium' } },
  { config_key: 'records.funeral.add', display_name: 'Add funeral record', category: 'records', target_surface: '/portal/records/funeral/new', current_source: { backend_route: 'POST /api/funeral-records', db_table: 'funeral_records' } },
  { config_key: 'records.funeral.edit', display_name: 'Edit funeral record', category: 'records', target_surface: '/portal/records/funeral/edit/:id', current_source: { backend_route: 'PUT /api/funeral-records/:id', db_table: 'funeral_records' } },
  { config_key: 'records.batches.summary', display_name: 'Record batches summary', category: 'records', target_surface: 'front-end/src/features/portal/RecordPipelineStatus.tsx', current_source: { backend_route: '/api/record-batches/summary', db_table: 'record_batches' } },
  { config_key: 'records.dropdown_options', display_name: 'Record entry dropdown options', category: 'records', target_surface: 'records entry pages', current_source: { backend_route: '/api/{type}-records/dropdown-options/:field' }, gaps_or_risks: ['Source table not verified — values may come from records or a lookup table'] },

  // ── branding ──────────────────────────────────────────────────────────
  { config_key: 'branding.logo_path', display_name: 'Logo image path', category: 'branding', target_surface: 'Account → Branding', user_roles: ['super_admin','admin','church_admin'], current_source: { frontend_file: 'front-end/src/features/account/AccountBrandingPage.tsx', backend_route: 'POST /api/my/church-branding/:field', db_column: 'churches.logo_path' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'low' } },
  { config_key: 'branding.logo_dark_path', display_name: 'Dark-mode logo path', category: 'branding', target_surface: 'Account → Branding', current_source: { db_column: 'churches.logo_dark_path' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'low' } },
  { config_key: 'branding.favicon_path', display_name: 'Favicon path', category: 'branding', target_surface: 'Account → Branding', current_source: { db_column: 'churches.favicon_path' }, omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: false, requires_preflight_validation: false, risk_level: 'low' } },
  { config_key: 'branding.primary_color', display_name: 'Primary brand color', category: 'branding', target_surface: 'Theme Studio + church profile', current_source: { backend_route: '/api/parish-settings/:id/theme', db_table: 'parish_settings + churches.primary_color' }, gaps_or_risks: ['DUAL source of truth: parish_settings.theme + churches.primary_color column'], omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'high' } },
  { config_key: 'branding.secondary_color', display_name: 'Secondary brand color', category: 'branding', target_surface: 'Theme Studio', current_source: { db_table: 'parish_settings + churches.secondary_color' }, gaps_or_risks: ['Same dual-source as primary_color'] },
  { config_key: 'branding.hero_image', display_name: 'Hero banner image (per-tenant)', category: 'branding', target_surface: 'front-end/src/features/portal/HeroBanner.tsx', current_source: { frontend_file: 'front-end/src/features/portal/HeroBanner.tsx', hardcoded: true, db_column: null }, gaps_or_risks: ['No DB column or admin UI; hardcoded for church 46 only'], omstudio_package_relevance: { can_be_targeted_by_omstudio: true, package_slot_candidate: true, requires_preflight_validation: true, risk_level: 'high' } },
  { config_key: 'branding.theme_full', display_name: 'Full theme preset', category: 'branding', target_surface: 'parish-management/ThemeStudioPage.tsx', current_source: { backend_route: '/api/admin/churches/:id/themes', db_table: 'orthodoxmetrics_db.church_themes' }, gaps_or_risks: ['Third theme storage location — registry must collapse three sources'] },
  { config_key: 'branding.landing_page_image', display_name: 'Landing page branding image', category: 'branding', target_surface: 'parish-management/LandingPageBrandingPage.tsx', current_source: { backend_route: 'POST /api/my/church-branding/:field' } },

  // ── church_profile ────────────────────────────────────────────────────
  { config_key: 'church_profile.name', display_name: 'Church name', category: 'church_profile', target_surface: 'Account → Church Details', current_source: { backend_route: '/api/my/church-settings', db_column: 'churches.name + church_name (legacy)' } },
  { config_key: 'church_profile.contact_email', display_name: 'Contact email', category: 'church_profile', current_source: { db_column: 'churches.email' } },
  { config_key: 'church_profile.phone', display_name: 'Phone', category: 'church_profile', current_source: { db_column: 'churches.phone' } },
  { config_key: 'church_profile.website', display_name: 'Website URL', category: 'church_profile', current_source: { db_column: 'churches.website' } },
  { config_key: 'church_profile.address.line1', display_name: 'Address', category: 'church_profile', current_source: { db_column: 'churches.address' } },
  { config_key: 'church_profile.address.city', display_name: 'City', category: 'church_profile', current_source: { db_column: 'churches.city' } },
  { config_key: 'church_profile.address.state', display_name: 'State/province', category: 'church_profile', current_source: { db_column: 'churches.state_province' } },
  { config_key: 'church_profile.address.postal', display_name: 'Postal code', category: 'church_profile', current_source: { db_column: 'churches.postal_code' } },
  { config_key: 'church_profile.address.country', display_name: 'Country', category: 'church_profile', current_source: { db_column: 'churches.country' } },
  { config_key: 'church_profile.preferred_language', display_name: 'Preferred language', category: 'church_profile', current_source: { db_column: 'churches.preferred_language' } },
  { config_key: 'church_profile.timezone', display_name: 'Timezone', category: 'church_profile', current_source: { db_column: 'churches.timezone' } },
  { config_key: 'church_profile.currency', display_name: 'Currency', category: 'church_profile', current_source: { db_column: 'churches.currency' } },
  { config_key: 'church_profile.calendar_type', display_name: 'Calendar type', category: 'church_profile', current_source: { db_column: 'churches.calendar_type' } },
  { config_key: 'church_profile.tax_id', display_name: 'Tax ID', category: 'church_profile', current_source: { db_column: 'churches.tax_id' } },
  { config_key: 'church_profile.jurisdiction', display_name: 'Jurisdiction', category: 'church_profile', current_source: { backend_route: '/api/jurisdictions', db_table: 'jurisdictions + churches.jurisdiction_id' } },
  { config_key: 'church_profile.description_multilang', display_name: 'Multilang description', category: 'church_profile', current_source: { db_column: 'churches.description_multilang' } },
  { config_key: 'church_profile.short_name', display_name: 'Short name (slug)', category: 'church_profile', current_source: { db_column: 'churches.short_name' } },
  { config_key: 'church_profile.is_active', display_name: 'Church active flag', category: 'church_profile', user_roles: ['super_admin'], current_source: { db_column: 'churches.is_active' } },
  { config_key: 'church_profile.setup_complete', display_name: 'Onboarding complete flag', category: 'church_profile', user_roles: ['super_admin'], current_source: { db_column: 'churches.setup_complete' } },
  { config_key: 'church_profile.has_records', display_name: 'has_*_records flags', category: 'church_profile', current_source: { db_column: 'churches.has_baptism_records|has_marriage_records|has_funeral_records' }, gaps_or_risks: ['Flags exist but are NOT consulted in ChurchPortalHub.tsx — cards always render all three'] },

  // ── navigation ────────────────────────────────────────────────────────
  { config_key: 'navigation.role_default_landing', display_name: 'Role-based default landing', category: 'navigation', target_surface: 'Router.tsx:201-215', current_source: { frontend_file: 'front-end/src/routes/Router.tsx', hardcoded: true }, gaps_or_risks: ['Old default_landing_page column was explicitly removed from churches schema'] },
  { config_key: 'navigation.portal.sidebar_items', display_name: 'Portal sidebar items', category: 'navigation', target_surface: 'ChurchPortalLayout uses HpHeader (no sidebar)', current_source: { hardcoded: true } },
  { config_key: 'navigation.menu_permissions', display_name: 'Per-role menu visibility', category: 'navigation', current_source: { frontend_file: 'Router.tsx ProtectedRoute requiredRole', backend_route: '/api/menu-permissions' }, gaps_or_risks: ['Portal uses Router requiredRole; menu_permissions table not consulted — registry must unify'] },
  { config_key: 'navigation.footer_text', display_name: 'Footer text', category: 'navigation', current_source: { frontend_file: 'SiteFooter component', hardcoded: true } },
  { config_key: 'navigation.brand_header', display_name: 'Brand header text', category: 'navigation', current_source: { frontend_file: 'HpHeader', db_column: 'churches.name' } },

  // ── permissions (subset — full set in audit) ───────────────────────────
  { config_key: 'permissions.records.view', display_name: 'View records', category: 'permissions', user_roles: ['super_admin','admin','church_admin','priest','deacon','editor'], target_surface: '/portal/records/*', current_source: { frontend_file: 'portalRoutes.tsx' } },
  { config_key: 'permissions.records.add', display_name: 'Add record', category: 'permissions', user_roles: ['super_admin','admin','church_admin','priest','deacon','editor'], target_surface: '/portal/records/{type}/new' },
  { config_key: 'permissions.records.edit', display_name: 'Edit record', category: 'permissions', user_roles: ['super_admin','admin','church_admin','priest','deacon','editor'], target_surface: '/portal/records/{type}/edit/:id' },
  { config_key: 'permissions.upload', display_name: 'Upload records', category: 'permissions', user_roles: ['super_admin','admin','church_admin','priest'], target_surface: '/portal/upload', current_behavior: 'Drops deacon + editor' },
  { config_key: 'permissions.charts', display_name: 'Charts', category: 'permissions', user_roles: ['super_admin','admin','church_admin','priest'], target_surface: '/portal/charts' },
  { config_key: 'permissions.certificates', display_name: 'Certificates', category: 'permissions', user_roles: ['super_admin','admin','church_admin','priest','deacon','editor'], target_surface: '/portal/certificates' },
  { config_key: 'permissions.settings', display_name: 'Portal settings', category: 'permissions', user_roles: ['super_admin','admin','church_admin','priest'], target_surface: '/portal/settings' },
  { config_key: 'permissions.ocr', display_name: 'OCR access', category: 'permissions', user_roles: ['super_admin','admin','church_admin','priest'], target_surface: '/portal/ocr*' },
  { config_key: 'permissions.parish_management', display_name: 'Parish management hub', category: 'permissions', target_surface: '/account/parish-management/*', gaps_or_risks: ['Route-level role gate missing; only API enforces; non-admins see chrome'] },

  // ── uploads ───────────────────────────────────────────────────────────
  { config_key: 'uploads.records_csv', display_name: 'Records CSV import', category: 'uploads', current_source: { backend_route: 'POST /api/{type}-records/import' } },
  { config_key: 'uploads.ocr_image', display_name: 'OCR image upload', category: 'uploads', user_roles: ['super_admin','admin','church_admin','priest'], current_source: { backend_route: 'POST /api/ocr/jobs/upload', db_table: 'ocr_jobs' } },
  { config_key: 'uploads.ocr_retry', display_name: 'OCR job retry', category: 'uploads', current_source: { backend_route: 'POST /api/church/:churchId/ocr/jobs/:id/retry' } },
  { config_key: 'uploads.ocr_review_status', display_name: 'OCR job review-status PATCH', category: 'uploads', current_source: { backend_route: 'PATCH /api/church/:churchId/ocr/jobs/:id/review-status' } },
  { config_key: 'uploads.branding_image', display_name: 'Branding image upload', category: 'uploads', current_source: { backend_route: 'POST /api/my/church-branding/:field' } },

  // ── analytics ─────────────────────────────────────────────────────────
  { config_key: 'analytics.parish_summary', display_name: 'Parish summary stats', category: 'analytics', current_source: { backend_route: '/api/parish-stats/:churchId', db_table: 'baptism/marriage/funeral_records' } },
  { config_key: 'analytics.feast_day_breakdown', display_name: 'Feast day breakdown', category: 'analytics', user_roles: ['admin','super_admin'], current_source: { backend_route: '/api/analytics/by-feast-day' } },
  { config_key: 'analytics.charts', display_name: 'OM charts', category: 'analytics', user_roles: ['super_admin','admin','church_admin','priest'], target_surface: '/portal/charts', current_source: { backend_route: '/api/churches/:churchId/charts' } },
  { config_key: 'analytics.clergy_tenure', display_name: 'Clergy tenure', category: 'analytics', current_source: { backend_route: '/api/churches/:churchId/clergy-tenure' } },

  // ── layout ────────────────────────────────────────────────────────────
  { config_key: 'layout.theme.studio', display_name: 'Theme Studio', category: 'layout', current_source: { backend_route: '/api/parish-settings/:id/theme', db_table: 'parish_settings (category=theme)' } },
  { config_key: 'layout.theme.ui', display_name: 'UI theme', category: 'layout', current_source: { backend_route: '/api/parish-settings/:id/ui', db_table: 'parish_settings (category=ui)' } },
  { config_key: 'layout.user_table_prefs', display_name: 'Per-user table prefs', category: 'layout', current_source: { backend_route: '/api/my/ui-preferences', db_table: 'user_table_settings' } },
  { config_key: 'layout.landing_page_branding', display_name: 'Landing page branding', category: 'layout', current_source: { backend_route: 'POST /api/my/church-branding/:field' } },
  { config_key: 'layout.search_configuration', display_name: 'Search configuration', category: 'layout', current_source: { backend_route: '/api/parish-settings/:id/search', db_table: 'parish_settings (category=search)' } },
  { config_key: 'layout.system_behavior', display_name: 'System behavior', category: 'layout', current_source: { backend_route: '/api/parish-settings/:id/system', db_table: 'parish_settings (category=system)' } },
  { config_key: 'layout.record_settings', display_name: 'Record settings', category: 'layout', gaps_or_risks: ['Persistence path not located in audit'] },
  { config_key: 'layout.field_mapper', display_name: 'Field mapper', category: 'layout', current_source: { backend_route: '/api/admin/churches/:id/field-mapper', db_table: 'orthodoxmetrics_db.field_mapper_settings' } },
  { config_key: 'layout.themes_admin', display_name: 'Admin theme writer', category: 'layout', user_roles: ['super_admin','admin'], current_source: { db_table: 'orthodoxmetrics_db.church_themes' }, gaps_or_risks: ['Third theme storage location'] },

  // ── notifications ─────────────────────────────────────────────────────
  { config_key: 'notifications.preferences', display_name: 'Notification preferences', category: 'notifications', current_source: { backend_route: '/api/notifications/preferences' } },
  { config_key: 'notifications.list', display_name: 'Notification list', category: 'notifications', current_source: { backend_route: '/api/notifications', db_table: 'notifications' } },
  { config_key: 'notifications.unread_counts', display_name: 'Unread counts', category: 'notifications', current_source: { backend_route: '/api/notifications/counts' } },
  { config_key: 'notifications.queue_workflow', display_name: 'Notification queue', category: 'notifications', current_source: { db_table: 'notification_queue' } },

  // ── tenant ────────────────────────────────────────────────────────────
  { config_key: 'tenant.id', display_name: 'Active tenant id', category: 'tenant', tenant_scope: 'global', current_source: { backend_route: '/api/my/churches', db_table: 'churches' } },
  { config_key: 'tenant.database_name', display_name: 'Tenant database name', category: 'tenant', current_source: { db_column: 'churches.database_name' } },
  { config_key: 'tenant.crm_link', display_name: 'CRM link', category: 'tenant', current_source: { db_column: 'us_churches.provisioned_church_id' } },
  { config_key: 'tenant.is_active', display_name: 'Tenant active flag', category: 'tenant', current_source: { db_column: 'churches.is_active' } },
  { config_key: 'tenant.setup_complete', display_name: 'Tenant onboarding complete', category: 'tenant', current_source: { db_column: 'churches.setup_complete' } },

  // ── auth (cross-cutting; §C omits, audit identified) ──────────────────
  { config_key: 'auth.login', display_name: 'Login', category: 'auth', tenant_scope: 'global', current_source: { backend_route: 'POST /api/auth/login', db_table: 'users' } },
  { config_key: 'auth.logout', display_name: 'Logout', category: 'auth', current_source: { backend_route: 'POST /api/auth/logout' } },
  { config_key: 'auth.forgot_password', display_name: 'Forgot password', category: 'auth', current_source: { backend_route: 'POST /api/auth/forgot-password' } },
  { config_key: 'auth.password_change', display_name: 'Change password', category: 'auth', current_source: { backend_route: 'PUT /api/user/profile/password' } },
  { config_key: 'auth.security_status', display_name: 'Account security status', category: 'auth', current_source: { backend_route: '/api/user/profile/security-status' } },
  { config_key: 'auth.email_verification_resend', display_name: 'Resend email verification', category: 'auth', current_source: { backend_route: 'POST /api/user/profile/resend-verification' } },
  { config_key: 'auth.sessions.list', display_name: 'List active sessions', category: 'auth', current_source: { backend_route: '/api/user/sessions', db_table: 'refresh_tokens' } },
  { config_key: 'auth.sessions.revoke_one', display_name: 'Revoke one session', category: 'auth', current_source: { backend_route: 'DELETE /api/user/sessions/:id' } },
  { config_key: 'auth.sessions.revoke_others', display_name: 'Revoke other sessions', category: 'auth', current_source: { backend_route: 'POST /api/user/sessions/revoke-others' } },
];

async function main() {
  const churchIdArg = parseInt(process.argv[2], 10);
  if (!Number.isFinite(churchIdArg) || churchIdArg <= 0) {
    console.error('Usage: node seed-tenant-portal-config.js <church_id>');
    process.exit(2);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'orthodoxapps',
    password: process.env.DB_PASSWORD || process.env.DB_PASS,
    database: process.env.DB_NAME || 'orthodoxmetrics_db',
    waitForConnections: true,
    connectionLimit: 4,
    connectTimeout: 30000,
  });

  try {
    const [churches] = await pool.query(
      'SELECT id, name, is_active FROM churches WHERE id = ?',
      [churchIdArg],
    );
    if (!churches.length) {
      console.error(`No church with id=${churchIdArg}`);
      process.exit(3);
    }
    if (!churches[0].is_active) {
      console.error(`Church ${churchIdArg} is inactive — refusing to seed`);
      process.exit(4);
    }
    console.log(`Seeding ${SEED_ROWS.length} rows for church id=${churchIdArg} (${churches[0].name || 'unnamed'})...`);

    let inserted = 0;
    let updated = 0;
    for (const row of SEED_ROWS) {
      const userRolesJson = row.user_roles ? JSON.stringify(row.user_roles) : null;
      const currentSourceJson = row.current_source ? JSON.stringify(row.current_source) : null;
      const configurableFieldsJson = row.configurable_fields ? JSON.stringify(row.configurable_fields) : JSON.stringify([]);
      const layoutContractJson = row.layout_contract ? JSON.stringify(row.layout_contract) : null;
      const dependenciesJson = row.dependencies ? JSON.stringify(row.dependencies) : JSON.stringify({});
      const omstudioRelevanceJson = row.omstudio_package_relevance ? JSON.stringify(row.omstudio_package_relevance) : null;
      const gapsJson = row.gaps_or_risks ? JSON.stringify(row.gaps_or_risks) : JSON.stringify([]);

      const [result] = await pool.query(
        `INSERT INTO tenant_portal_config_items (
           church_id, config_key, display_name, category, owning_system,
           target_surface, user_roles, tenant_scope, current_source,
           current_behavior, configurable_fields, layout_contract,
           dependencies, omstudio_package_relevance, gaps_or_risks,
           is_active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           display_name              = VALUES(display_name),
           category                  = VALUES(category),
           target_surface            = VALUES(target_surface),
           user_roles                = VALUES(user_roles),
           tenant_scope              = VALUES(tenant_scope),
           current_source            = VALUES(current_source),
           current_behavior          = VALUES(current_behavior),
           configurable_fields       = VALUES(configurable_fields),
           layout_contract           = VALUES(layout_contract),
           dependencies              = VALUES(dependencies),
           omstudio_package_relevance = VALUES(omstudio_package_relevance),
           gaps_or_risks             = VALUES(gaps_or_risks)
           -- NB: is_active intentionally NOT in the UPDATE clause — preserves
           -- operator soft-disables across re-seeds.`,
        [
          churchIdArg,
          row.config_key,
          row.display_name || null,
          row.category,
          row.owning_system || 'OM',
          row.target_surface || null,
          userRolesJson,
          row.tenant_scope || 'per_church',
          currentSourceJson,
          row.current_behavior || null,
          configurableFieldsJson,
          layoutContractJson,
          dependenciesJson,
          omstudioRelevanceJson,
          gapsJson,
        ],
      );
      // mysql2 returns affectedRows=1 on insert, 2 on update of existing
      if (result.affectedRows === 1) inserted += 1;
      else if (result.affectedRows === 2) updated += 1;
    }

    console.log(`Done. inserted=${inserted} updated=${updated} total=${SEED_ROWS.length} (seed=${SEED_CONFIG_KEY})`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
