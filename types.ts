
export interface TeamMember {
  id: string;
  name: string;
  profileName: string;
  projectName: string;
  assignedDate: string;
  deliveryDate: string;
  projectValue: number;
  pageCount: number;
  projectUrl: string;
  progress: number; // 0 to 100
  themeColor: string; // Tailwind color class prefix (e.g., 'purple', 'blue', 'emerald')
  syncTargetHours?: number; // Optional override for sync protocol target hours
  nextUpdateDate?: string; // Manual control for next update due date
  isDelivered?: boolean; // True if the project has been marked as delivered
  isScheduled?: boolean; // True if the project has been marked for scheduled operations
  targetDate?: string; // Specific target date for scheduled operations, independent of deliveryDate
}

export interface HistoricalProject extends TeamMember {
  archivedAt: string;
}

export interface User {
  email: string;
  password?: string; // Only used for local storage auth simulation
}

export type UserRole = 'Admin' | 'Editor' | 'Viewer';

export interface GuestAccess {
  email: string;
  role: UserRole;
  canEdit: boolean;
  canViewFleet: boolean;
  canViewScheduled: boolean;
  canViewDelivery: boolean;
  canViewLedger: boolean;
  canViewPerformance: boolean;
  canViewFinancials: boolean;
}

export interface UserStorageData {
  members: TeamMember[];
  history: HistoricalProject[];
  logoUrl: string;
  guests?: GuestAccess[];
}

export type SortField = 'name' | 'projectValue' | 'progress' | 'deliveryDate' | 'projectName' | 'assignedDate';
