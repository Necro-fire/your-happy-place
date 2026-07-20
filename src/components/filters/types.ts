export type SortOption = { value: string; label: string };
export type StatusOption = { value: string; label: string };
export type CategoryOption = { value: string; label: string };

export type PeriodPreset =
  | "todos"
  | "hoje"
  | "ontem"
  | "7d"
  | "15d"
  | "30d"
  | "mes"
  | "mes_passado"
  | "ano"
  | "personalizado";

export type FiltersState = {
  q: string;
  period: PeriodPreset;
  dateFrom?: string; // yyyy-mm-dd
  dateTo?: string;
  status: string[];
  categories: string[];
  valueMin?: number;
  valueMax?: number;
  sort: string;
  extras: Record<string, unknown>;
};

export type FilterSections = {
  search?: boolean;
  period?: boolean;
  status?: StatusOption[];
  categories?: CategoryOption[];
  valueRange?: boolean;
  sort?: SortOption[];
};

export type SavedPreset = {
  id: string;
  name: string;
  state: FiltersState;
};

export const emptyState: FiltersState = {
  q: "",
  period: "todos",
  status: [],
  categories: [],
  sort: "recent",
  extras: {},
};
