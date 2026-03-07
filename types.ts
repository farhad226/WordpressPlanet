
export interface TeamMember {
  id: string;
  name: string;
  projectName: string;
  assignedDate: string;
  deliveryDate: string;
  projectValue: number;
  pageCount: number;
  projectUrl: string;
  progress: number; // 0 to 100
  themeColor: string; // Tailwind color class prefix (e.g., 'purple', 'blue', 'emerald')
  syncTargetHours?: number; // Optional override for sync protocol target hours
}

export interface HistoricalProject extends TeamMember {
  archivedAt: string;
}

export interface User {
  email: string;
  password?: string; // Only used for local storage auth simulation
}

export interface UserStorageData {
  members: TeamMember[];
  history: HistoricalProject[];
  logoUrl: string;
}

export type SortField = 'name' | 'projectValue' | 'progress' | 'deliveryDate' | 'projectName' | 'assignedDate';
