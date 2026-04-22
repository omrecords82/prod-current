// src/services/adminService.ts
import axios from 'axios';

const API_BASE_URL = '/api';

// Types for system information
export interface SystemInfo {
    // System Information
    nodeVersion: string;
    uptime: string;
    uptimeSeconds: number;
    hostname: string;
    memory: number;
    platform: string;
    arch: string;
    
    // Application Settings
    env: string;
    version: string;
    dateFormat: string;
    language: string;
    churchCount: number;
    
    // Additional system details
    totalMemory: number;
    freeMemory: number;
    cpuCount: number;
    loadAverage: string;
}

export interface SystemInfoResponse {
    success: boolean;
    data: SystemInfo;
    message?: string;
    error?: string;
}

/**
 * Get system information including server details and application settings
 */
export const getSystemInfo = async (): Promise<SystemInfo> => {
    try {
        const response = await axios.get<SystemInfoResponse>(`${API_BASE_URL}/admin/system/system-info`);
        
        if (response.data.success) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to fetch system information');
        }
    } catch (error) {
        console.error('Error fetching system information:', error);
        throw error;
    }
};

/**
 * Format memory value to display with appropriate unit
 */
export const formatMemory = (memoryMB: number): string => {
    if (memoryMB < 1024) {
        return `${memoryMB} MB`;
    } else {
        return `${(memoryMB / 1024).toFixed(1)} GB`;
    }
};

/**
 * Get memory usage percentage
 */
export const getMemoryUsagePercentage = (used: number, total: number): number => {
    return Math.round((used / total) * 100);
};

/**
 * Format platform name for display
 */
export const formatPlatform = (platform: string): string => {
    const platformMap: { [key: string]: string } = {
        'win32': 'Windows',
        'darwin': 'macOS',
        'linux': 'Linux',
        'freebsd': 'FreeBSD',
        'openbsd': 'OpenBSD'
    };
    
    return platformMap[platform] || platform;
};

/**
 * Format architecture for display
 */
export const formatArchitecture = (arch: string): string => {
    const archMap: { [key: string]: string } = {
        'x64': 'x86_64',
        'ia32': 'x86',
        'arm': 'ARM',
        'arm64': 'ARM64'
    };
    
    return archMap[arch] || arch;
};

/**
 * Get environment display name
 */
export const getEnvironmentDisplayName = (env: string): string => {
    return env.charAt(0).toUpperCase() + env.slice(1);
};
export default getSystemInfo;
