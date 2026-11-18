export interface Category {
  id: string;
  name: string;
  color: string;
  bgTint: string;
  borderTint: string;
  glowTint?: string;
  shortcut: string;
  description: string;
}

export interface BlockEntry {
  categoryId: string;
  label?: string;
  updatedAt: number;
}

export interface DayRecord {
  dateKey: string;
  blocks: Record<number, BlockEntry>;
  reflection?: string;
  autoPrefilled?: boolean;
}

export interface CategorySummary {
  category: Category;
  blockCount: number;
  minutes: number;
  percentageOfView: number;
  percentageOfAllocated: number;
}

export interface ActivityHighlight {
  label: string;
  categoryId: string;
  blockCount: number;
  minutes: number;
}

export interface DayOverviewStats {
  totalVisibleBlocks: number;
  allocatedBlocks: number;
  unassignedBlocks: number;
  allocatedMinutes: number;
  unassignedMinutes: number;
  completionPercent: number;
  categorySummaries: CategorySummary[];
  topActivities: ActivityHighlight[];
}

export interface HourRowGroup {
  hour: number;
  hourLabel: string;
  periodLabel: string;
  blockIndices: number[];
}

export interface SleepScheduleSettings {
  enabled: boolean;
  startTime: string;
  endTime: string;
  label: string;
  overwriteExisting: boolean;
}

export interface WorkScheduleSettings {
  enabled: boolean;
  startTime: string;
  endTime: string;
  categoryId: string;
  label: string;
  overwriteExisting: boolean;
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
}

export interface UserSettings {
  autoPrefillEnabled: boolean;
  sleep: SleepScheduleSettings;
  work: WorkScheduleSettings;
}

export interface AppDataStore {
  version: number;
  days: Record<string, DayRecord>;
  settings?: UserSettings;
}
