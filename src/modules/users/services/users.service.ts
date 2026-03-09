import { httpClient } from "@/lib/api/http-client";
import type { UserCreatePayload, UserSummary, UserUpdatePayload, UsersListResponse } from "@/lib/types/users";

export const usersService = {
  async listUsers(params?: { q?: string; page?: number }) {
    return httpClient.get<UsersListResponse>("/users/", params);
  },

  async getUser(id: number) {
    return httpClient.get<UserSummary>(`/users/${id}/`);
  },

  async createUser(data: UserCreatePayload) {
    return httpClient.post<UserCreatePayload, UserSummary>("/users/", data);
  },

  async updateUser(id: number, data: UserUpdatePayload) {
    return httpClient.patch<UserUpdatePayload, UserSummary>(`/users/${id}/`, data);
  },
};
