import { Outlet } from 'react-router-dom';
import HpHeader from '@/components/frontend-pages/shared/header/HpHeader';
import SiteFooter from '@/components/frontend-pages/shared/footer/SiteFooter';
import Customizer from '@/layouts/full/shared/customizer/Customizer';
import { EditModeProvider, useEditMode } from '@/context/EditModeContext';
import { useAuth } from '@/hooks/useAuth';
import { Pencil, Save, X, Undo2, Globe } from 'lucide-react';
import { OmAssistant } from '@/components/OmAssistant';

/**
 * Shared layout for all public-facing pages (Homepage, About, Pricing, etc.).
 * Renders the auth-aware HpHeader, page content via <Outlet />, and SiteFooter.
 * Super_admin users also get the Customizer panel for container/theme settings.
 *
 * Pages nested under this layout should NOT render their own header/footer.
 */
const PublicLayout = () => {
  const { isSuperAdmin } = useAuth();

  return (
    <div className="om-page-container">
      <HpHeader />
      <EditModeProvider>
        <Outlet />
        <EditModeToggle />
      </EditModeProvider>
      <SiteFooter />
      {isSuperAdmin() && <Customizer />}
      <OmAssistant pageContext={{ type: 'public' }} />
    </div>
  );
};

/** Floating edit-mode toggle — only visible to super_admin users. */
function EditModeToggle() {
  const { isSuperAdmin } = useAuth();
  const { isEditMode, toggleEditMode, pendingChanges, saveAllChanges, discardChanges, isSaving, translationSummary } = useEditMode();

  if (!isSuperAdmin()) return null;

  const pendingCount = Object.keys(pendingChanges).length;

  if (!isEditMode) {
    return (
      <button
        onClick={toggleEditMode}
        title="Toggle inline editing"
        className="fixed right-6 z-50 w-14 h-14 bg-[#2d1b4e] hover:bg-[#3a2461] text-[#d4af37] rounded-full shadow-lg flex items-center justify-center transition-colors cursor-pointer border-0"
        style={{ bottom: '152px' }}
      >
        <Pencil size={20} />
      </button>
    );
  }

  return (
    <div className="fixed right-6 z-50 flex items-center gap-2 bg-[#2d1b4e] rounded-full shadow-lg px-4 py-2" style={{ bottom: '152px' }}>
      {pendingCount > 0 && (
        <>
          <button
            onClick={saveAllChanges}
            disabled={isSaving}
            title="Save all changes"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-full transition-colors"
          >
            <Save size={14} />
            {isSaving ? 'Saving...' : `Save (${pendingCount})`}
          </button>
          <button
            onClick={discardChanges}
            title="Discard changes"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-full transition-colors"
          >
            <Undo2 size={14} />
          </button>
        </>
      )}
      {pendingCount === 0 && (
        <span className="text-[#d4af37] text-sm font-medium px-2">Edit Mode</span>
      )}
      {translationSummary && translationSummary.total_language_flags > 0 && (
        <span
          className="flex items-center gap-1 px-2 py-1 bg-amber-700/60 text-amber-200 text-xs rounded-full"
          title={`${translationSummary.total_language_flags} translation(s) across ${translationSummary.keys_needing_update} key(s) need review`}
        >
          <Globe size={12} />
          {translationSummary.total_language_flags} need review
        </span>
      )}
      <button
        onClick={toggleEditMode}
        title="Exit edit mode"
        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-full transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export default PublicLayout;
