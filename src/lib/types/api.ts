export interface ApiErrorContract {
  code: string;
  detail: string;
  fields: Record<string, unknown>;
  status: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
