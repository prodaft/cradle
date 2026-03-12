// Common type definitions

import { ReactNode } from 'react';

// ============================================================================
// Base Component Props
// ============================================================================

interface BaseComponentProps {
    className?: string;
    children?: ReactNode;
}

// ============================================================================
// Theme Types
// ============================================================================

export interface ThemeConfig {
    name?: string;
    [key: string]: string | undefined;
}

export interface ThemeContextValue {
    isDarkMode: boolean;
    activeTheme: ThemeConfig;
    setTheme: (theme: ThemeConfig) => void;
    toggleTheme: () => void;
}

// ============================================================================
// User and Profile Types
// ============================================================================

// Re-export the generated UserRetrieve type for domain data
import type { components } from '@services/openapi/schema';
type UserRetrieve = components['schemas']['UserRetrieve'];

/**
 * Extended profile with UI-specific properties.
 * Uses UserRetrieve as the base and extends with app-specific fields.
 */
interface Profile {
    id: string;
    username: string;
    email: string;
    theme: ThemeConfig;
    firstName?: string;
    lastName?: string;
    // Add other profile properties as needed
}

// ============================================================================
// Notification Types
// ============================================================================

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationOptions {
    type: NotificationType;
    title?: string;
    text: string;
    duration?: number;
}

interface NotificationContextValue {
    notify: (options: NotificationOptions) => void;
}

// ============================================================================
// Layout Types
// ============================================================================

interface LayoutContextValue {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;
}

// ============================================================================

// ============================================================================
// API Response Types
// ============================================================================

interface ApiResponse<T> {
    data: T;
    status: number;
    statusText: string;
}

interface ApiError {
    message: string;
    status?: number;
    errors?: Record<string, string[]>;
}

// ============================================================================
// Common Utility Types
// ============================================================================

type SortOrder = 'asc' | 'desc';

interface SearchFilter {
    search?: string;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
}

// ============================================================================
// File Types
// ============================================================================

interface FileMetadata {
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

interface SimpleGraphNode {
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

interface GraphData {
    nodes: SimpleGraphNode[];
    edges: GraphEdge[];
}

// ============================================================================
// Form Types
// ============================================================================

interface FormValidationError {
    field: string;
    message: string;
}

interface FormState<T> {
    values: T;
    errors: Record<keyof T, string>;
    touched: Record<keyof T, boolean>;
    isSubmitting: boolean;
    isValid: boolean;
}

// ============================================================================
// Auth Types
// ============================================================================

interface LoginCredentials {
    username: string;
    password: string;
    twoFactorToken?: string;
}
