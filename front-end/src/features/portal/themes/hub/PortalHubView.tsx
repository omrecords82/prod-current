import { usePortalTheme } from '@/features/portal/themes/PortalThemeContext';
import { usePortalHub } from './usePortalHub';

export function PortalHubView() {
  const hub = usePortalHub();
  const { bundle } = usePortalTheme();
  const HubLayout = bundle.HubLayout;
  return <HubLayout hub={hub} />;
}
