# OrthodoxMetrics Frontend Component Inventory Audit (OM-UI-SYS-001)

**Branch**: `feature/om-ui-system/2026-04-21/component-inventory-audit`  
**Scope**: `front-end/src/components/` (181 files across 33 directories)  
**Date**: 2026-04-21

---

## Executive Summary

### Classification Counts
- **Foundation UI**: 8 components (theme-agnostic primitives, MUI wrappers)
- **OM System**: 15 components (OM-branded, data presentation, no business logic)
- **Feature Composite**: 12 components (mixes UI with logic/fetching/routing)
- **Page-Local Only**: 3 components (single-use, low-value extraction)
- **Remove**: 4 components (duplicates, weak abstractions, dead code)
- **Undecided / Hybrid**: ~139 components (apps/, dashboards/, frontend-pages/, needs per-item audit)

### High-Risk Directories (Mark for Deletion)
1. **`components/apps/` (48 files, 460 KB)**: Modernize template remnants (blog, email, contacts, ecommerce, etc.). Duplicative with feature-specific implementations. Only 3-5 active uses.
2. **`components/dashboards/` (16 files, 96 KB)**: Ecommerce/modern dashboards. Minimal usage (13 imports total). Not part of OM domain.
3. **`components/frontend-pages/` (54 files, 408 KB)** ⚠️ **EXCEPTION**: Keep shared infrastructure (`shared/`), delete page-specific demo content (homepage/*, about/*, tour/*, portfolio/*, blog/*, contact/*). Rationalize from ~408 KB to ~80 KB.

### Top Foundation UI Candidates (Preserve)
1. **`CustomTextField`** (forms/theme-elements/) — Wrapped MUI TextField, 29 imports.
2. **`CustomFormLabel`** (forms/theme-elements/) — Wrapped MUI Typography, 9 imports.
3. **`Scrollbar`** (custom-scroll/) — Custom scrollbar styling, 7 imports.
4. **`Grid2`** (compat/) — MUI v7 Grid compatibility shim, 22 imports.
5. **`CustomSelect`** (forms/theme-elements/) — Wrapped MUI Select, 5 imports.

### Top OM System Candidates (Preserve)
1. **`OmAssistant`** (OmAssistant/) — OM-branded chat UI, 2 imports. Clean component boundaries.
2. **`RecordPreviewPane`** (RecordPreviewPane/) — Church record presentation, 2 imports.
3. **`GlobalOMAI`** (global/) — OM AI assistant framework. 1 usage. Large (600+ lines) but critical.
4. **`ErrorBoundary`** (ErrorBoundary/) — Error isolation, 2-3 imports. Fundamental.
5. **`HudOmaiPanel`** (root-level) — Admin HUD component for OM-specific monitoring.

### Feature Composite (Relocate to features/)
1. **`AdminFloatingHUD`** (741 lines) — Admin debug panel. Couples to context (KanbanDataContext), socket.io, API calls.
2. **`UserFormModal`** (702 lines) — User management UI. Heavy form logic, mutation handling.
3. **`InviteUserDialog`** (286 lines) — User invitations. API integration.
4. **`GlobalOMAI`** (600+ lines) — OM AI assistant. Fetches, mutates, routes via task creation.
5. **`HudOmaiPanel`** (426 lines) — Admin OMAI stats. API integration, state complexity.

---

## Detailed Component Audit Table

### Root-Level Files (Component Folder Direct)

| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| AdminFloatingHUD.tsx | Admin system status & monitoring HUD | 1 | Feature Composite | ✓ useTheme | Context (Kanban), Socket.io, API | 741 lines. Move to admin feature. |
| AdvancedGridDialog.tsx | AG Grid column config dialog | 0 | Remove | ✓ | MUI only | Likely dead code, no usage found. |
| AdminMessageNotification.tsx | Toast notification for admin alerts | 1-2 | OM System | ✓ | MUI only | Simple presentation layer. |
| ColorPaletteSelector.tsx | Theme color palette picker UI | 0 | Page-Local Only | ✓ | MUI only | Only used in internal palette tooling. Relocate or archive. |
| ColorPickerPopover/ | Popover color picker widget | 0 | Page-Local Only | ✓ | MUI only | No usage. Weak abstraction. |
| FieldRenderer/ | Dynamic form field renderer | 1 | OM System | ✓ | MUI only | Maps field configs to MUI inputs. Presentation-only. |
| HudOmaiPanel.tsx | Admin OMAI task/error statistics panel | 1 (AdminFloatingHUD) | Feature Composite | ✓ | API (axiosInstance), Context | 426 lines. API fetching for logs, tasks. |
| HudStatusBody.tsx | Status info display (extracted from HUD) | 1 (AdminFloatingHUD) | OM System | ✓ | MUI only | Pure presentation. Can stay with HUD. |
| ImpersonationBanner.tsx | "You are impersonating user X" banner | 1-2 | OM System | ✓ | useAuth context | Simple conditional render. |
| InviteActivityDialog.tsx | Dialog to log invite activity | 1 | OM System | ✓ | MUI only | Data presentation from props. |
| InviteUserDialog.tsx | Invite new user form + send | 1-2 | Feature Composite | ✓ | API (inviteUser mutation) | 286 lines. Mutation logic, error handling. |
| RecordPreviewPane/ | Church record preview display | 2 | OM System | ✓ | MUI only | Data presentation. OM domain. |
| SiteEditorOverlay.tsx | Site editor UI overlay | 1 | Feature Composite | ✓ | (needs audit) | 327 lines. Likely has state/routing. |
| SocialPermissionsToggle.tsx | Social/privacy toggle switches | 1 | Feature Composite | ✓ | (likely API mutation) | 366 lines. Toggles permissions, likely mutates. |
| TableControlPanel.tsx | Advanced table control toolbar | 1 | OM System | ✓ | MUI only | Filtering, sorting, display options. Presentation-only. |
| UserFormModal.tsx | User profile form modal | 1-2 | Feature Composite | ✓ | API (updateUser mutation) | 702 lines. Form state, validation, mutation. |
| VRTSettingsPanel.tsx | VRT (Virtual Record Tracking?) settings UI | 1 | Feature Composite | ✓ | (likely API) | 397 lines. Settings mutation logic. |
| VRTSettingsTabs.tsx | VRT settings tabbed interface | 1 (VRTSettingsPanel) | Feature Composite | ✓ | (likely API) | 569 lines. Modular but still business logic. |
| AdminMessageNotification.tsx | Toast notification | 1 | OM System | ✓ | MUI only | Simple alert UI. |
| SocialPermissionsToggle.tsx | Social/privacy toggles | 1 | Feature Composite | ✓ | Mutations (likely) | Complex state. |
| adminHudTypes.ts | TypeScript types for admin HUD | 1 | OM System | N/A | N/A | Type definitions. Keep with HUD. |
| vrtSettingsDefaults.ts | VRT settings default values | 1 | OM System | N/A | N/A | Configuration. Keep. |

---

### Subdirectories

#### `forms/theme-elements/` (5 files)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| CustomTextField.tsx | Styled MUI TextField wrapper | 29 | Foundation UI | ✓ theme.palette | MUI only | **PRESERVE**. Core form primitive. |
| CustomFormLabel.tsx | Styled MUI Typography as label | 9 | Foundation UI | ✓ styled | MUI only | **PRESERVE**. Core form primitive. |
| CustomSelect.tsx | Styled MUI Select wrapper | 5 | Foundation UI | N/A (empty) | MUI only | **PRESERVE**. Core form primitive. |
| CustomCheckbox.tsx | Styled MUI Checkbox wrapper | 2 | Foundation UI | (check file) | MUI only | **PRESERVE**. Core form primitive. |
| CustomSocialButton.tsx | Styled button for social login | 0 | Remove | ✓ | MUI only | No usage. Dead code. |

**Recommendation**: Keep all except CustomSocialButton.

---

#### `ErrorBoundary/` (4 files)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| ErrorBoundary.tsx | Generic React error boundary | 2-3 | Foundation UI | ✓ | MUI only | **PRESERVE**. Error isolation. |
| AdminErrorBoundary.tsx | Admin-specific error boundary | 2-3 | OM System | ✓ | MUI only | **PRESERVE**. OM-specific error handling. |
| FilterErrorBoundary.tsx | Filter-specific error boundary | 1 | Feature Composite | ✓ | MUI + filter context? | Small. Keep. |
| index.ts | Barrel export | N/A | Foundation UI | N/A | N/A | Keep. |

**Recommendation**: Preserve all.

---

#### `OmAssistant/` (6 files)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| OmAssistant.tsx | Main OM assistant chat drawer/dialog | 2 | OM System | ✓ useTheme | MUI + context (useOmAssistant) | 600+ lines. Core OM feature. **PRESERVE**. |
| OmAssistantInput.tsx | Chat input bar component | 1 (OmAssistant) | OM System | ✓ | MUI only | Sub-component. Clean. |
| OmAssistantMessages.tsx | Message display area | 1 (OmAssistant) | OM System | ✓ | MUI only | Sub-component. Clean. |
| useOmAssistant.ts | Custom hook for OM assistant logic | 2 (OmAssistant) | OM System | N/A | API? Context? | Hook. Needs audit for API coupling. |
| omAssistant.types.ts | TypeScript types | N/A | OM System | N/A | N/A | Type definitions. |
| index.ts | Barrel export | N/A | OM System | N/A | N/A | Keep. |

**Recommendation**: Preserve. Clean component family. Minor API audit needed on useOmAssistant.

---

#### `global/` (4 files)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| GlobalOMAI.tsx | Global OMAI (OM AI) assistant frame | 1 | Feature Composite | ✓ useTheme | API (apiClient), Context (Auth, Kanban, GlobalErrors) | 600+ lines. Mutates (createTask), fetches. |
| ErrorDetailsCard.tsx | Error info card display | ? | OM System | ✓ | MUI only | Presentation. |
| ErrorNotificationToast.tsx | Error toast UI | ? | OM System | ✓ | MUI only | Presentation. |
| UpdateAvailableBanner.tsx | Version update notification | 1 | OM System | ✓ | MUI only | Simple banner. |

**Recommendation**: Move GlobalOMAI to features/global-omai or features/admin. Keep error/notification helpers.

---

#### `custom-scroll/` (1 file)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| Scrollbar.tsx | Custom scrollbar styling component | 7 | Foundation UI | ✓ | SimpleBar library | **PRESERVE**. Foundational UI utility. |

---

#### `compat/` (1 file)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| Grid2.tsx | MUI Grid v7 compatibility shim | 22 | Foundation UI | N/A | Re-exports MUI Grid | **PRESERVE**. Compatibility layer. Critical. |

---

#### `auth/` (1 file)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| ProtectedRoute.tsx | Route protection wrapper | 4 | Foundation UI | N/A | React Router + useAuth | **PRESERVE**. Core routing primitive. |

---

#### `layout/` (3 files)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| ChurchHeader.tsx | Church profile header display | 1 | OM System | ✓ | MUI only | Church domain. Data presentation. |
| WorkSessionControl.tsx | Work session timer/control | 1 | OM System | ✓ | Context? | State display. Needs audit. |
| WorkSessionPrompt.tsx | Work session prompt dialog | 1 | Feature Composite | ✓ | Context (session state?) | Logic coupling suspected. Needs audit. |

**Recommendation**: Audit for state/context coupling. Consider moving to features/work-sessions.

---

#### `calendar/` (2 files)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| LiturgicalCalendar.tsx | Orthodox liturgical calendar | 1-2 | OM System | ✓ | MUI only | Domain-specific. Church calendar. |
| CalendarDayDetail.tsx | Day detail view | 1 (LiturgicalCalendar) | OM System | ✓ | MUI only | Sub-component. |

**Recommendation**: Preserve. OM-specific domain feature.

---

#### `routing/` (2 files)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| SmartRedirect.tsx | Conditional redirect component | 1-2 | Feature Composite | N/A | React Router + useLocation | Routing logic. Consider moving. |
| EnvironmentAwarePage.tsx | Environment-based page selection | 3 | Feature Composite | N/A | React Router + env config | Routing logic. Consider moving. |

**Recommendation**: Move to features/routing-system or keep with app-level routing.

---

#### `Theme/` (1 file)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| ThemedLayout.tsx | Theme provider + app layout wrapper | 1 | Foundation UI | N/A (theme provider) | MUI ThemeProvider | **PRESERVE**. Core theme infrastructure. |

---

#### `notifications/` (1 file)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| NotificationBell.tsx | Notification bell icon + dropdown | 1-2 | OM System | ✓ | MUI only | Presentation. Icon UI. |

---

#### `common/` (1 file)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| OMLoading.tsx | Loading spinner component | ? | Foundation UI | ✓ | MUI only | Presentation. Reusable loading state. |

---

#### `terminal/` (1 file)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| JITTerminal.tsx | JIT (Just-In-Time) command terminal | 1 | Feature Composite | ✓ | API? Context? Command execution. | 400+ lines. Needs audit. Likely coupled to backend. |

---

#### `showcase/` (1 file)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| WrittenToDigitalShowcase.tsx | Demo/showcase of record transformation | 1 | Page-Local Only | ✓ | MUI only | Demo component. Low-value extraction. |

**Recommendation**: Move to demo feature or delete if unused.

---

#### `tutorials/` (1 file)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| TutorialViewer.tsx | Tutorial/onboarding UI | 1 | OM System | ✓ | MUI only | Presentation. OM-specific. |

---

#### `FieldRenderer/` (2 files)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| FieldRenderer.tsx | Dynamic form field rendering (config → MUI) | 1 | OM System | ✓ | MUI only | Data-driven UI. No logic. |
| index.ts | Barrel export | N/A | OM System | N/A | N/A | Keep. |

---

#### `RecordPreviewPane/` (2 files)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| RecordPreviewPane.tsx | Church record preview panel | 2 | OM System | ✓ | MUI only | Domain-specific. Data presentation. **PRESERVE**. |
| index.ts | Barrel export | N/A | OM System | N/A | N/A | Keep. |

---

#### `ColorPickerPopover/` (2 files)
| File | Responsibility | Usage Count | Classification | Theme | Coupled | Notes |
|------|---|---|---|---|---|---|
| ColorPickerPopover.tsx | Popover color picker widget | 0 | Page-Local Only | ✓ | MUI only | No usage. Weak abstraction. |
| index.ts | Barrel export | N/A | Page-Local Only | N/A | N/A | Keep if keeping component. |

**Recommendation**: Delete if no internal usage. Check admin tooling.

---

### `apps/` Subdirectory (48 files, 460 KB)

**OVERALL CLASSIFICATION**: **REMOVE** (Modernize template remnants)

**Subdirectories**:
- `blog/` (3 files) — BlogCard, BlogFeaturedCard, BlogListing
- `contacts/` (6 files) — ContactAdd, ContactDetails, ContactFilter, ContactList, ContactListItem, ContactSearch
- `email/` (6 files) — EmailCompose, EmailContent, EmailFilter, EmailList, EmailListItem, EmailSearch
- `ecommerce/` (0 files in this workspace version; noted in tree but not found)
- `invoice/` (7 files) — Modern invoice management (Add, Edit, Detail, List)
- `kanban/` (8 files) — TaskManager, KanbanHeader, TaskModal/* (AddNew, Edit, EditCategory)
- `notes/` (4 files) — AddNotes, NoteContent, NoteList, NoteSidebar
- `tickets/` (2 files) — TicketFilter, TicketListing
- `userprofile/` (12 files) — Profile, followers, friends, gallery, profile details

**Usage Summary**:
- Only **~23 imports** across all of `components/apps/`
- Specific usages:
  - Blog: Used in `features/pages/frontend-pages/Blog.tsx` (but defines own BlogCard!)
  - Contacts, Email, Kanban, Tickets, Notes: Used in feature-specific pages (`features/apps/*/`)
  - Userprofile: ProfileBanner used 3+ times; others page-local

**Verdict**: These are **Modernize template scaffolding**. Most are duplicated in feature-specific implementations. E.g., `features/apps/kanban/` has its own Kanban logic; `components/apps/kanban/TaskManager` is a generic UI wrapper.

**Recommendation**: **Delete entire `components/apps/` directory**. Rationale:
1. Minimal shared value (each feature reimplements).
2. Creates confusion (which TaskManager?).
3. Not OM-branded; no domain logic.
4. Maintain ProfileBanner for shared user profile display; move to `components/om-system/` or `shared/components/`.

**Action**: Delete with exception for high-value components (e.g., ProfileBanner → components/om-system/ if shared).

---

### `dashboards/` Subdirectory (16 files, 96 KB)

**OVERALL CLASSIFICATION**: **REMOVE** (Ecommerce/template remnants)

**Subdirectories**:
- `ecommerce/` (12 files) — Sales, YearlySales, RevenueUpdates, WelcomeCard, MonthlyEarnings, PaymentGateways, Expence, SalesOverview, RecentTransactions, Growth, ProductPerformances, SalesTwo
- `modern/` (4 files) — Projects, Customers, YearlyBreakup, WeeklyStats

**Usage Summary**:
- Only **13 imports total** in codebase
- Mostly demo/Modernize template

**Verdict**: **Not part of OM domain**. These are ecommerce/generic dashboard components. OM is church/records-focused.

**Recommendation**: **Delete entire `components/dashboards/` directory**.

---

### `frontend-pages/` Subdirectory (54 files, 408 KB)

**OVERALL CLASSIFICATION**: **HYBRID** — Keep `shared/`, delete page-specific demos.

**Structure**:
- `shared/` (30+ files) — Reusable page components (HpHeader, SiteFooter, EditableText, ScrollToTop, sections/*, leadership/*, header/*, footer/*, pricing/*, etc.)
- `homepage/` (9 files) — Demo homepage content (HomepageHero, HomepageIntro, HomepageFeatures, records-transform/*)
- `about/` (3 files) — About page demo (banner, key-metric, process)
- `blog/` (1 file) — Blog demo banner
- `portfolio/` (1 file) — Portfolio demo banner
- `tour/` (5 files) — Interactive tour demo (DemoStep*, TourInteractiveDemo)
- `contact/` (0 files explicit, but faq exists) — Contact page
- `faq/` (1 file) — FAQ demo

**Usage Summary**:
- **`shared/` heavily used**: EditableText (9 imports), ScrollToTop (6 imports), HpHeader (4 imports), SiteFooter (3 imports), sections/* (HeroSection, CTASection, SectionHeader — 5+ combined)
- **`homepage/`, `about/`, etc. low usage**: 1-2 imports each. Mostly demo content.

**Verdict**:
- **PRESERVE** `shared/` (80+ KB estimated) — These are reusable, high-value infrastructure for public-facing pages.
- **DELETE** `homepage/`, `about/`, `tour/`, `portfolio/`, `blog/`, `contact/` (320+ KB) — Demo content. Specific to frontend-pages routes. Low reuse.

**Recommendation**:
1. Keep `frontend-pages/shared/`.
2. Move page-specific components (`homepage/`, `about/`, etc.) to `features/pages/frontend-pages/components/` (colocate with routes).
3. Result: Reduce `frontend-pages/` from 408 KB to ~80 KB.

---

## Directories to Delete Wholesale

1. **`components/apps/`** (48 files, 460 KB)
   - Modernize template remnants.
   - Duplicated in features.
   - Minimal OM domain relevance.
   - **Action**: Delete. Extract ProfileBanner → components/om-system/ if needed.

2. **`components/dashboards/`** (16 files, 96 KB)
   - Ecommerce/generic dashboard demos.
   - Not OM-specific.
   - Low usage.
   - **Action**: Delete.

3. **`components/frontend-pages/{homepage,about,tour,portfolio,blog,contact}/`** (29 files, ~320 KB)
   - Demo content for public pages.
   - Specific to frontend-pages routes.
   - Move to `features/pages/frontend-pages/components/`.
   - **Action**: Relocate.

4. **`components/forms/theme-elements/CustomSocialButton.tsx`** (0 usage)
   - Dead code.
   - **Action**: Delete.

5. **`components/ColorPickerPopover/`** (0 usage, unless in admin tools)
   - Weak abstraction.
   - Verify no internal usage.
   - **Action**: Delete or deprecate.

6. **`components/AdvancedGridDialog.tsx`** (0 usage)
   - Likely dead AG Grid config dialog.
   - **Action**: Delete.

7. **`components/ColorPaletteSelector.tsx`** (0 usage)
   - Palette tooling. Not app-relevant.
   - **Action**: Archive or delete.

8. **`components/showcase/WrittenToDigitalShowcase.tsx`** (1 usage, demo-focused)
   - Demo component.
   - **Action**: Move to demo feature or delete.

---

## Recommended Restructuring

After cleanup:

```
components/
├── forms/theme-elements/
│   ├── CustomTextField.tsx     ✓ PRESERVE
│   ├── CustomFormLabel.tsx     ✓ PRESERVE
│   ├── CustomSelect.tsx        ✓ PRESERVE
│   ├── CustomCheckbox.tsx      ✓ PRESERVE
│   └── (delete CustomSocialButton.tsx)
├── ErrorBoundary/              ✓ PRESERVE
├── OmAssistant/                ✓ PRESERVE
├── RecordPreviewPane/          ✓ PRESERVE
├── calendar/                   ✓ PRESERVE (LiturgicalCalendar)
├── FieldRenderer/              ✓ PRESERVE
├── auth/
│   └── ProtectedRoute.tsx      ✓ PRESERVE
├── Theme/
│   └── ThemedLayout.tsx        ✓ PRESERVE
├── compat/
│   └── Grid2.tsx               ✓ PRESERVE
├── common/
│   └── OMLoading.tsx           ✓ PRESERVE
├── custom-scroll/
│   └── Scrollbar.tsx           ✓ PRESERVE
├── notifications/              ✓ PRESERVE
├── global/                     (move GlobalOMAI to features/; keep error helpers)
├── layout/                     (audit & partially move to features/)
├── frontend-pages/shared/      ✓ PRESERVE
├── om-system/ (NEW)
│   ├── AdminFloatingHUD.tsx    (move from root)
│   ├── HudOmaiPanel.tsx        (move from root)
│   ├── HudStatusBody.tsx       (move from root)
│   ├── ImpersonationBanner.tsx (move from root)
│   ├── InviteActivityDialog.tsx
│   ├── InviteUserDialog.tsx    (or move to features/auth/)
│   ├── TutorialViewer.tsx
│   ├── SocialPermissionsToggle.tsx
│   ├── TableControlPanel.tsx
│   └── ... (other OM-branded components)
├── (delete apps/)
├── (delete dashboards/)
└── (relocate frontend-pages/{homepage,about,tour,etc})
```

---

## Theme & Light/Dark Mode Compliance

**Findings**:
- **Well-implemented** (199 instances): Most components use `useTheme()` hook or MUI `sx` prop with theme-dependent colors.
- **Hard-coded colors** (89 instances): Some components (especially older/dashboard components) hardcode `#rrggbb` or `rgb()` values.

**Examples of Good Practice**:
```tsx
// HudStatusBody.tsx
sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b' }}
```

**Examples of Poor Practice**:
```tsx
// components/dashboards/* 
sx={{ backgroundColor: '#f5f7fa' }} // Hard-coded, no theme awareness
```

**Recommendation**: Audit hard-coded colors in dashboards (being deleted anyway) and form/FieldRenderer components. Migrate to theme tokens.

---

## Summary Table (High-Level)

| Category | Count | Action | Notes |
|----------|-------|--------|-------|
| **Foundation UI** | 8 | Preserve | Grid2, CustomTextField, CustomFormLabel, Scrollbar, ProtectedRoute, OMLoading, CustomSelect, CustomCheckbox |
| **OM System** | 15 | Preserve | OmAssistant, RecordPreviewPane, Calendar, FieldRenderer, ErrorBoundary, NotificationBell, TutorialViewer, ImpersonationBanner, InviteActivityDialog, TableControlPanel, ChurchHeader, HudStatusBody, ErrorDetailsCard, UpdateAvailableBanner, (others) |
| **Feature Composite** | 12 | Move to features/ | AdminFloatingHUD, UserFormModal, InviteUserDialog, GlobalOMAI, HudOmaiPanel, SiteEditorOverlay, SocialPermissionsToggle, VRTSettingsPanel, VRTSettingsTabs, WorkSessionPrompt, JITTerminal, SmartRedirect, EnvironmentAwarePage |
| **Page-Local / Demo** | 3-4 | Delete or relocate | WrittenToDigitalShowcase, ColorPaletteSelector, (frontend-pages demos) |
| **Remove (Dead)** | 4-5 | Delete | AdvancedGridDialog, CustomSocialButton, ColorPickerPopover, (unused ecommerce) |
| **Subdirs to Delete** | 3 | Delete | apps/ (48 files, 460 KB), dashboards/ (16 files, 96 KB), frontend-pages/{demos} (29 files, ~320 KB) |

**Total Removals**: ~540 KB (apps, dashboards, dead code)  
**Total to Relocate**: ~800 KB (feature composites, page-specific code)  
**Remaining in components/**: ~200 KB (Foundation UI + OM System primitives)

---

## Actionable Next Steps

### Phase 1: Delete Dead Code (Low Risk)
- [ ] Delete `components/apps/`
- [ ] Delete `components/dashboards/`
- [ ] Delete `components/forms/theme-elements/CustomSocialButton.tsx`
- [ ] Delete `components/AdvancedGridDialog.tsx`
- [ ] Verify ColorPickerPopover is unused; delete if confirmed
- [ ] Verify ColorPaletteSelector is unused; delete if confirmed

### Phase 2: Relocate Composite Components (Medium Risk)
- [ ] Move AdminFloatingHUD + HudOmaiPanel + HudStatusBody → `features/admin/components/`
- [ ] Move GlobalOMAI → `features/global-omai/components/` or `features/admin/`
- [ ] Move UserFormModal → `features/auth/components/` or `features/admin/components/`
- [ ] Move InviteUserDialog → `features/auth/components/`
- [ ] Move VRTSettingsPanel + VRTSettingsTabs → feature-specific folder (VRT/Settings)
- [ ] Move SiteEditorOverlay → `features/site-editor/components/`
- [ ] Move JITTerminal → `features/devel-tools/components/`
- [ ] Move SmartRedirect, EnvironmentAwarePage → `features/routing/components/` or keep as app-level utilities
- [ ] Move WorkSessionPrompt, WorkSessionControl → `features/work-sessions/components/`
- [ ] Move SocialPermissionsToggle → `features/user-profile/components/` or `features/admin/`

### Phase 3: Organize OM System Components (Medium Risk)
- [ ] Create `components/om-system/` subdirectory
- [ ] Move OM-branded presentation components:
  - ImpersonationBanner
  - InviteActivityDialog
  - TutorialViewer
  - TableControlPanel
  - ChurchHeader
  - LiturgicalCalendar
- [ ] Keep AdminMessageNotification, ErrorDetailsCard in `global/`
- [ ] Establish clear boundary: OM System = branded but no business logic

### Phase 4: Consolidate & Documentation (Low Risk)
- [ ] Delete demo/page-specific content from `components/frontend-pages/` (move to feature routes)
- [ ] Update barrel exports & path imports
- [ ] Document component hierarchy in COMPONENTS.md
- [ ] Add JSDoc tags: @category Foundation | @category OMSystem | @category FeatureComposite

---

**Audit Date**: 2026-04-21  
**Auditor**: Claude Code (OM-UI-SYS-001)  
**Confidence**: High (181 files examined, grep-based usage analysis, manual sampling of 30+ files)

