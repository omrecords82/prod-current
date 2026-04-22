import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMenuItems } from '@/layouts/full/vertical/sidebar/MenuItems';

export const useFilteredMenuItems = () => {
    const { user } = useAuth();

    const filteredMenuItems = useMemo(() => {
        if (!user) return [];
        
        // Use the church-aware menu items function that already handles role-based filtering
        // and provides church-specific URLs for Records Management
        return getMenuItems(user);
    }, [user]);

    return filteredMenuItems;
};

export default useFilteredMenuItems;
