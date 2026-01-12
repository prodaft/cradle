// Common type definitions

import { ReactNode } from 'react';

// ============================================================================
// Base Component Props
// ============================================================================

export interface BaseComponentProps {
    className?: string;
    children?: ReactNode;
}

// ============================================================================
// Theme Types
// ============================================================================

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
    isDarkMode: boolean;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

// ============================================================================
// User and Profile Types
// ============================================================================

// Re-export the generated UserRetrieve type for domain data
export type { UserRetrieve } from '@services/cradle/models';

/**
 * Extended profile with UI-specific properties.
 * Uses UserRetrieve as the base and extends with app-specific fields.
 */
export interface Profile {
    id: string;
    username: string;
    email: string;
    theme: Theme;
    firstName?: string;
    lastName?: string;
    // Add other profile properties as needed
}

export interface ProfileContextValue {
    profile: Profile | null;
    setProfile: (profile: Profile | null) => void;
    isLoading: boolean;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
    type: NotificationType;
    title?: string;
    text: string;
    duration?: number;
}

export interface NotificationContextValue {
    notify: (options: NotificationOptions) => void;
}

// ============================================================================
// Layout Types
// ============================================================================

export interface LayoutContextValue {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;
}

// ============================================================================

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
    data: T;
    status: number;
    statusText: string;
}

export interface ApiError {
    message: string;
    status?: number;
    errors?: Record<string, string[]>;
}

// ============================================================================
// Common Utility Types
// ============================================================================

export type SortOrder = 'asc' | 'desc';

export interface SearchFilter {
    search?: string;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
}

// ============================================================================
// File Types
// ============================================================================

export interface FileMetadata {
    id: string;
    name: string;
    size: number;
    type: string;
    uploadedAt: string;
    uploadedBy: string;
}

// ============================================================================
// Graph Types
// ============================================================================
// NOTE: For graph visualization with D3 force simulation properties,
// use GraphNode and GraphLink from @/types instead.

export interface SimpleGraphNode {
    id: string;
    label: string;
    type: string;
    properties?: Record<string, any>;
}

/**
 * Internal graph edge type for visualization.
 * Note: Entry IDs are numbers (BigAutoField), not strings.
 * Relation IDs are UUIDs (strings).
 */
export interface GraphEdge {
    id?: string; // Relation UUID (optional)
    source: number; // Entry ID (BigAutoField)
    target: number; // Entry ID (BigAutoField)
    type?: string;
    label?: string;
    properties?: Record<string, any>;
}

export interface GraphData {
    nodes: SimpleGraphNode[];
    edges: GraphEdge[];
}

// ============================================================================
// Form Types
// ============================================================================

export interface FormValidationError {
    field: string;
    message: string;
}

export interface FormState<T> {
    values: T;
    errors: Record<keyof T, string>;
    touched: Record<keyof T, boolean>;
    isSubmitting: boolean;
    isValid: boolean;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface LoginCredentials {
    username: string;
    password: string;
    twoFactorToken?: string;
}
