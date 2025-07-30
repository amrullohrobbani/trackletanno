// Shared utility for tracklet color management

export interface TrackletColors {
  normal: string;
  selected: string;
  dark: string;
}

const predefinedColors: TrackletColors[] = [
  { normal: '#EF4444', selected: '#DC2626', dark: '#7F1D1D' }, // Red
  { normal: '#3B82F6', selected: '#2563EB', dark: '#1E3A8A' }, // Blue
  { normal: '#10B981', selected: '#059669', dark: '#064E3B' }, // Green
  { normal: '#F59E0B', selected: '#D97706', dark: '#78350F' }, // Orange
  { normal: '#8B5CF6', selected: '#7C3AED', dark: '#581C87' }, // Purple
  { normal: '#EC4899', selected: '#DB2777', dark: '#831843' }, // Pink
  { normal: '#06B6D4', selected: '#0891B2', dark: '#164E63' }, // Cyan
  { normal: '#84CC16', selected: '#65A30D', dark: '#365314' }, // Lime
  { normal: '#F97316', selected: '#EA580C', dark: '#7C2D12' }, // Orange-Red
  { normal: '#6366F1', selected: '#4F46E5', dark: '#312E81' }, // Indigo
  { normal: '#14B8A6', selected: '#0F766E', dark: '#134E4A' }, // Teal
  { normal: '#F59E0B', selected: '#D97706', dark: '#78350F' }, // Amber
  { normal: '#EF4444', selected: '#B91C1C', dark: '#7F1D1D' }, // Red (variant)
  { normal: '#8B5CF6', selected: '#6D28D9', dark: '#581C87' }, // Violet
  { normal: '#06B6D4', selected: '#0E7490', dark: '#164E63' }, // Sky
  { normal: '#10B981', selected: '#047857', dark: '#064E3B' }, // Emerald
  { normal: '#F97316', selected: '#C2410C', dark: '#7C2D12' }, // Orange (variant)
  { normal: '#EC4899', selected: '#BE185D', dark: '#831843' }, // Rose
  { normal: '#6366F1', selected: '#3730A3', dark: '#312E81' }, // Indigo (variant)
  { normal: '#84CC16', selected: '#4D7C0F', dark: '#365314' }, // Green (variant)
];

export const getTrackletColor = (trackletId: number, isSelected: boolean = false): string => {
  // Use tracklet ID to select color consistently (repeats every 20)
  const colorIndex = (trackletId - 1) % predefinedColors.length;
  const colors = predefinedColors[colorIndex];
  
  return isSelected ? colors.selected : colors.normal;
};

export const getTrackletColors = (trackletId: number): TrackletColors => {
  // Use tracklet ID to select color consistently (repeats every 20)
  const colorIndex = (trackletId - 1) % predefinedColors.length;
  return predefinedColors[colorIndex];
};

export const getTrackletDarkColor = (trackletId: number): string => {
  const colorIndex = (trackletId - 1) % predefinedColors.length;
  return predefinedColors[colorIndex].dark;
};
