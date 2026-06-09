import axios from "axios";

const BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1") as string;

export const KEY_STORAGE = "admin_key";
export const getAdminKey = () => localStorage.getItem(KEY_STORAGE) ?? "";
export const setAdminKey = (k: string) => localStorage.setItem(KEY_STORAGE, k);
export const clearAdminKey = () => localStorage.removeItem(KEY_STORAGE);

const client = axios.create({ baseURL: BASE });
client.interceptors.request.use((cfg) => {
  cfg.headers["X-Admin-Key"] = getAdminKey();
  return cfg;
});

export interface AdminUserSummary {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
}

export interface AdminOrgSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  plan_source: string | null;
  plan_note: string | null;
  custom_limits: Record<string, unknown> | null;
  trial_ends_at: string;
  plan_expires_at: string | null;
  plan_active: boolean;
  trial_active: boolean;
  stripe_customer_id: string | null;
  post_generations_used: number;
  post_generations_limit: number | null;
  image_generations_used: number;
  image_generations_limit: number | null;
  media_storage_used_bytes: number;
  video_count: number;
  post_count: number;
  user_count: number;
  created_at: string;
}

export interface AdminOrgDetail extends AdminOrgSummary {
  users: AdminUserSummary[];
  next_payment_at: string | null;
  next_payment_amount_cents: number | null;
}

export interface GrantPlanPayload {
  plan: string;
  plan_expires_at: string | null;
  plan_note: string | null;
  plan_source: string;
  post_generations: number | null;
  image_generations: number | null;
  media_storage_mb: number | null;
  seats: number | null;
  transcription_minutes: number | null;
  translations: number | null;
  translate: boolean;
}

export interface RevokePayload {
  action: "trial" | "lock";
  reset_trial_days: number;
}

export const adminApi = {
  listOrgs: () => client.get<AdminOrgSummary[]>("/admin/orgs").then((r) => r.data),
  getOrg: (id: string) => client.get<AdminOrgDetail>(`/admin/orgs/${id}`).then((r) => r.data),
  grantPlan: (id: string, payload: GrantPlanPayload) =>
    client.patch<AdminOrgSummary>(`/admin/orgs/${id}/plan`, payload).then((r) => r.data),
  revoke: (id: string, payload: RevokePayload) =>
    client.post<AdminOrgSummary>(`/admin/orgs/${id}/revoke`, payload).then((r) => r.data),
};
