export interface Category {
  id: string;
  name: string;
  color: string;
  bgTint: string;
  borderTint: string;
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

export interface AppDataStore {
  version: number;
  days: Record<string, DayRecord>;
}
