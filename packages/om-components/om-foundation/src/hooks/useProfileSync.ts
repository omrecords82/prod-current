/**
 * Profile Synchronization Hook
 * Manages profile data synchronization across the application
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '@/api/utils/axiosInstance';

interface ProfileData {
    profile_image_url?: string;
    cover_image_url?: string;
    display_name?: string;
    bio?: string;
    location?: string;
    website?: string;
    [key: string]: any;
}

interface ProfileSyncReturn {
    profileImage: string;
    profileData: ProfileData | null;
    updateProfileImage: (imageUrl: string) => Promise<void>;
    updateProfile: (updates: Partial<ProfileData>) => Promise<void>;
    refreshProfile: () => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

export const useProfileSync = (defaultImage?: string): ProfileSyncReturn => {
    const { user, refreshAuth } = useAuth();
    const [profileImage, setProfileImage] = useState(defaultImage || '/src/assets/images/profile/user-1.jpg');
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load profile data from database
    const loadProfile = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const userId = user?.id;
            if (!userId) {
                console.log('📸 No user ID available, skipping profile load');
                return null;
            }
            
            const data = await apiClient.get<any>('/user/profile');
            if (data.success && data.profile) {
                setProfileData(data.profile);

                // Update profile image
                if (data.profile.profile_image_url) {
                    setProfileImage(data.profile.profile_image_url);
                    localStorage.setItem('userProfileImage', data.profile.profile_image_url);
                }

                console.log('📸 Profile loaded from database:', data.profile);
                return data.profile;
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
            setError('Failed to load profile');

            // Fallback to localStorage
            const savedImage = localStorage.getItem('userProfileImage');
            if (savedImage) {
                setProfileImage(savedImage);
            }
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    // Update profile image
    const updateProfileImage = useCallback(async (imageUrl: string) => {
        try {
            setIsLoading(true);
            setError(null);

            // Save to database
            const userId = user?.id;
            if (!userId) {
                throw new Error('No user ID available');
            }
            
            await apiClient.put('/user/profile', { profile_image_url: imageUrl });

            // Update local state
            setProfileImage(imageUrl);

            // Update localStorage
            localStorage.setItem('userProfileImage', imageUrl);

            // Update profile data
            setProfileData(prev => prev ? { ...prev, profile_image_url: imageUrl } : { profile_image_url: imageUrl });

            // Notify other components
            window.dispatchEvent(new CustomEvent('profileImageUpdated', {
                detail: { imageUrl }
            }));

            // Refresh auth context to sync user data
            if (refreshAuth) {
                await refreshAuth();
            }

            console.log('📸 Profile image synchronized across app:', imageUrl);
        } catch (error) {
            console.error('Failed to update profile image:', error);
            setError('Failed to update profile image');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, refreshAuth]);

    // Update profile data
    const updateProfile = useCallback(async (updates: Partial<ProfileData>) => {
        try {
            setIsLoading(true);
            setError(null);

            const userId = user?.id;
            if (!userId) {
                throw new Error('No user ID available');
            }
            
            const data = await apiClient.put<any>('/user/profile', updates);
            if (data.success) {
                // Update local state
                setProfileData(prev => ({ ...prev, ...updates }));

                // Update localStorage as backup
                localStorage.setItem('userProfile', JSON.stringify({ ...profileData, ...updates }));

                // Notify other components
                window.dispatchEvent(new CustomEvent('profileUpdated', {
                    detail: { updates }
                }));

                // Refresh auth context if user data was updated
                if (refreshAuth && (updates.display_name || updates.first_name || updates.last_name)) {
                    await refreshAuth();
                }

                console.log('📸 Profile data synchronized across app:', updates);
            } else {
                throw new Error(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            setError('Failed to update profile');
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [profileData, refreshAuth]);

    // Refresh profile data
    const refreshProfile = useCallback(async () => {
        await loadProfile();
    }, [loadProfile]);

    // Load profile on mount
    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    // Listen for localStorage changes (cross-tab synchronization)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'userProfileImage' && e.newValue) {
                setProfileImage(e.newValue);
            }
        };

        // Listen for custom profile update events
        const handleProfileImageUpdate = (e: CustomEvent) => {
            if (e.detail?.imageUrl) {
                setProfileImage(e.detail.imageUrl);
            }
        };

        const handleProfileUpdate = (e: CustomEvent) => {
            if (e.detail?.updates) {
                setProfileData(prev => ({ ...prev, ...e.detail.updates }));
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
        window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('profileImageUpdated', handleProfileImageUpdate as EventListener);
            window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
        };
    }, []);

    return {
        profileImage,
        profileData,
        updateProfileImage,
        updateProfile,
        refreshProfile,
        isLoading,
        error
    };
};
