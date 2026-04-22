// src/services/userService.ts
import { apiClient } from '@/api/utils/axiosInstance';

export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    role: 'super_admin' | 'admin' | 'church_admin' | 'priest' | 'deacon' | 'editor' | 'viewer' | 'guest';
    church_id: number | null;
    church_name?: string;
    is_active: boolean;
    phone?: string;
    preferred_language?: string;
    created_at: string;
    updated_at: string;
    last_login?: string;
    email_verified?: boolean;
    timezone?: string;
    is_locked?: boolean;
    locked_at?: string;
    locked_by?: string;
    lockout_reason?: string;
    account_expires_at?: string;
}

export interface NewUser {
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    church_id: string | null;
    phone?: string;
    preferred_language?: string;
    send_welcome_email?: boolean;
}

export interface UpdateUser {
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    church_id: string | null;
    preferred_language?: string;
    is_active: boolean;
}

export interface ResetPasswordData {
    new_password: string;
    confirm_password: string;
    auto_generate?: boolean;
}

export interface Church {
    id: number;
    name: string;
    email: string;
    phone?: string;
    city?: string;
    country?: string;
    is_active: boolean;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    tempPassword?: string;
    newPassword?: string;
    users?: User[];
    churches?: Church[];
}

class UserService {
    private baseUrl = '/admin';

    // Get all users
    async getUsers(): Promise<ApiResponse<User[]>> {
        try {
            const data = await apiClient.get<any>(`${this.baseUrl}/users`);
            return {
                success: data.success,
                users: data.users || [],
                message: data.message
            };
        } catch (error) {
            console.error('Error fetching users:', error);
            return {
                success: false,
                message: 'Failed to fetch users',
                users: []
            };
        }
    }

    // Create new user
    async createUser(userData: NewUser): Promise<ApiResponse> {
        try {
            const data = await apiClient.post<any>(`${this.baseUrl}/users`, {
                ...userData,
                church_id: userData.church_id || null
            });

            return {
                success: data.success,
                message: data.message,
                tempPassword: data.tempPassword
            };
        } catch (error) {
            console.error('Error creating user:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create user'
            };
        }
    }

    // Update user
    async updateUser(userId: number, userData: UpdateUser): Promise<ApiResponse> {
        try {
            const data = await apiClient.put<any>(`${this.baseUrl}/users/${userId}`, {
                ...userData,
                church_id: userData.church_id || null
            });

            return {
                success: data.success,
                message: data.message
            };
        } catch (error) {
            console.error('Error updating user:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update user'
            };
        }
    }

    // Delete user
    async deleteUser(userId: number): Promise<ApiResponse> {
        try {
            const data = await apiClient.delete<any>(`${this.baseUrl}/users/${userId}`);

            return {
                success: data.success,
                message: data.message
            };
        } catch (error) {
            console.error('Error deleting user:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete user'
            };
        }
    }

    // Toggle user status
    async toggleUserStatus(userId: number): Promise<ApiResponse> {
        try {
            const data = await apiClient.put<any>(`${this.baseUrl}/users/${userId}/toggle-status`);

            return {
                success: data.success,
                message: data.message
            };
        } catch (error) {
            console.error('Error toggling user status:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update user status'
            };
        }
    }

    // Reset user password
    async resetPassword(userId: number, passwordData?: ResetPasswordData): Promise<ApiResponse> {
        try {
            const data = await apiClient.patch<any>(`${this.baseUrl}/users/${userId}/reset-password`, passwordData || {});

            return {
                success: data.success,
                message: data.message,
                newPassword: data.newPassword
            };
        } catch (error) {
            console.error('Error resetting password:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to reset password'
            };
        }
    }

    // Lock user account
    async lockUser(userId: number, reason: string): Promise<ApiResponse> {
        try {
            const data = await apiClient.post<any>(`${this.baseUrl}/users/${userId}/lockout`, { reason });

            return { success: data.success, message: data.message };
        } catch (error) {
            console.error('Error locking user:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to lock user'
            };
        }
    }

    // Unlock user account
    async unlockUser(userId: number): Promise<ApiResponse> {
        try {
            const data = await apiClient.post<any>(`${this.baseUrl}/users/${userId}/unlock`);

            return { success: data.success, message: data.message };
        } catch (error) {
            console.error('Error unlocking user:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to unlock user'
            };
        }
    }

    // Get all churches
    async getChurches(): Promise<ApiResponse<Church[]>> {
        try {
            const data = await apiClient.get<any>('/admin/churches');
            return {
                success: data.success,
                churches: data.churches || [],
                message: data.message
            };
        } catch (error) {
            console.error('Error fetching churches:', error);
            return {
                success: false,
                message: 'Failed to fetch churches',
                churches: []
            };
        }
    }

    // Utility functions
    formatLastLogin(lastLogin?: string): string {
        if (!lastLogin) return 'Never';

        const date = new Date(lastLogin);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays === 0) {
            const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
            if (diffInHours === 0) {
                const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
                return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
            }
            return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
        } else if (diffInDays === 1) {
            return 'Yesterday';
        } else if (diffInDays < 7) {
            return `${diffInDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    getRoleBadgeColor(role: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
        switch (role) {
            case 'super_admin': return 'error';
            case 'admin': return 'warning';
            case 'priest': return 'primary';
            case 'deacon': return 'info';
            case 'manager': return 'secondary';
            case 'user': return 'default';
            case 'viewer': return 'default';
            default: return 'default';
        }
    }

    // Create an invite
    async createInvite(inviteData: { email: string; role: string; church_id: string | null; expiration_days: number }): Promise<ApiResponse> {
        try {
            const result = await apiClient.post<any>(`${this.baseUrl}/invites`, inviteData);
            return { success: true, message: result.message, data: result };
        } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : 'Failed to create invite' };
        }
    }

    // Get all invites
    async getInvites(): Promise<ApiResponse> {
        try {
            const data = await apiClient.get<any>(`${this.baseUrl}/invites`);
            return { success: true, data: data.invites };
        } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : 'Failed to fetch invites' };
        }
    }

    // Get invite user activity
    async getInviteActivity(userId: number, limit = 50, offset = 0): Promise<ApiResponse> {
        try {
            const data = await apiClient.get<any>(`${this.baseUrl}/invites/${userId}/activity?limit=${limit}&offset=${offset}`);
            return { success: true, data: { activity: data.activity, total: data.total } };
        } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : 'Failed to fetch activity' };
        }
    }

    // Revoke an invite
    async revokeInvite(inviteId: number): Promise<ApiResponse> {
        try {
            const data = await apiClient.delete<any>(`${this.baseUrl}/invites/${inviteId}`);
            return { success: true, message: data.message };
        } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : 'Failed to revoke invite' };
        }
    }

    generateSecurePassword(): string {
        const length = 16;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';

        // Ensure at least one character from each category
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*';

        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];

        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }

        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
}

export const userService = new UserService();
export default userService;
