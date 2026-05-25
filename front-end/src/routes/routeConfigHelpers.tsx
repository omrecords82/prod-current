/**
 * Route config helpers — eliminates repeated wrapper JSX in route files.
 *
 * Each helper produces a plain route object compatible with React Router's
 * RouteObject shape. Wrapper nesting is identical to the hand-written JSX
 * it replaces — no behavioral change.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import AdminErrorBoundary from '../components/ErrorBoundary/AdminErrorBoundary';
import EnvironmentAwarePage from '../components/routing/EnvironmentAwarePage';
import type { UserRole } from '../types/orthodox-metrics.types.ts';
import type { FeaturePriority } from '../context/EnvironmentContext';

export interface FeatureConfig {
  featureId: string;
  priority?: FeaturePriority;
  featureName?: string;
}

/**
 * Route wrapped with ProtectedRoute.
 *
 * Pattern: `<ProtectedRoute requiredRole={roles}><Component /></ProtectedRoute>`
 */
export function protectedRoute(
  path: string,
  element: React.ReactElement,
  roles?: UserRole | UserRole[],
) {
  return {
    path,
    element: (
      <ProtectedRoute requiredRole={roles}>
        {element}
      </ProtectedRoute>
    ),
  };
}

/**
 * Route wrapped with ProtectedRoute + AdminErrorBoundary.
 *
 * Pattern:
 * ```
 * <ProtectedRoute requiredRole={roles}>
 *   <AdminErrorBoundary><Component /></AdminErrorBoundary>
 * </ProtectedRoute>
 * ```
 */
export function guardedRoute(
  path: string,
  element: React.ReactElement,
  roles: UserRole | UserRole[],
) {
  return {
    path,
    element: (
      <ProtectedRoute requiredRole={roles}>
        <AdminErrorBoundary>
          {element}
        </AdminErrorBoundary>
      </ProtectedRoute>
    ),
  };
}

/**
 * Route wrapped with ProtectedRoute + AdminErrorBoundary + EnvironmentAwarePage.
 *
 * Pattern:
 * ```
 * <ProtectedRoute requiredRole={roles}>
 *   <AdminErrorBoundary>
 *     <EnvironmentAwarePage featureId={…} priority={…} featureName={…}>
 *       <Component />
 *     </EnvironmentAwarePage>
 *   </AdminErrorBoundary>
 * </ProtectedRoute>
 * ```
 */
export function guardedFeatureRoute(
  path: string,
  element: React.ReactElement,
  roles: UserRole | UserRole[],
  feature: FeatureConfig,
) {
  return {
    path,
    element: (
      <ProtectedRoute requiredRole={roles}>
        <AdminErrorBoundary>
          <EnvironmentAwarePage
            featureId={feature.featureId}
            priority={feature.priority}
            featureName={feature.featureName}
          >
            {element}
          </EnvironmentAwarePage>
        </AdminErrorBoundary>
      </ProtectedRoute>
    ),
  };
}

/**
 * Route wrapped with ProtectedRoute + EnvironmentAwarePage (no error boundary).
 *
 * Pattern:
 * ```
 * <ProtectedRoute requiredRole={roles}>
 *   <EnvironmentAwarePage featureId={…} priority={…} featureName={…}>
 *     <Component />
 *   </EnvironmentAwarePage>
 * </ProtectedRoute>
 * ```
 */
export function featureRoute(
  path: string,
  element: React.ReactElement,
  roles: UserRole | UserRole[],
  feature: FeatureConfig,
) {
  return {
    path,
    element: (
      <ProtectedRoute requiredRole={roles}>
        <EnvironmentAwarePage
          featureId={feature.featureId}
          priority={feature.priority}
          featureName={feature.featureName}
        >
          {element}
        </EnvironmentAwarePage>
      </ProtectedRoute>
    ),
  };
}

/**
 * Redirect route — `<Navigate to={target} replace />`.
 */
export function redirectRoute(path: string, to: string) {
  return { path, element: <Navigate to={to} replace /> };
}
