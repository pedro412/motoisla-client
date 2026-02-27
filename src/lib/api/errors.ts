import type { ApiErrorContract } from "@/lib/types/api";

export class ApiError extends Error implements ApiErrorContract {
  code: string;
  detail: string;
  fields: Record<string, unknown>;
  status: number;

  constructor(input: ApiErrorContract) {
    super(input.detail);
    this.name = "ApiError";
    this.code = input.code;
    this.detail = input.detail;
    this.fields = input.fields;
    this.status = input.status;
  }
}
