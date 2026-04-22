/**
 * useAuth hook - Re-exported from AuthContext for consistency with hooks directory structure
 * 
 * This file provides a convenient import path @/hooks/useAuth that maps to
 * the actual implementation in @/context/AuthContext
 */
export { useAuth, AuthProvider } from '../context/AuthContext';

// Re-export the type if needed (AuthContextType is an interface, not exported)
// Import it directly from AuthContext if type is needed:
// import type { AuthContextType } from '@/context/AuthContext';
