import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";

// ─── Auth / Me ───────────────────────────────────────────────────────────────

export interface MeResponse {
  id?: string;
  firebase_uid: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  role?: string;
  org_id?: string;
  needs_onboarding: boolean;
}

export interface PlanStatus {
  plan: string;
  active: boolean;
  read_only: boolean;
  trial_active: boolean;
  trial_ends_at: string | null;
  days_remaining: number | null;
  post_generations_used: number;
  post_generations_limit: number | null;
  image_generations_used: number;
  image_generations_limit: number | null;
}

export function usePlanStatus() {
  return useQuery<PlanStatus>({
    queryKey: ["plan"],
    queryFn: async () => (await api.get("/auth/plan")).data,
    staleTime: 30_000,
  });
}

export function useMe() {
  return useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
    retry: false,
  });
}

export interface OnboardPayload {
  org_name: string;
  org_slug: string;
  display_name?: string;
}

export function useOnboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: OnboardPayload) =>
      api.post<MeResponse>("/auth/onboard", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

// ─── Voice Profile ────────────────────────────────────────────────────────────

export interface VoiceProfile {
  tone?: Record<string, number>;
  topics?: string[];
  audience?: string;
  avoid?: string[];
  sample_posts?: string[];
  free_form?: string;
}

export function useVoiceProfile() {
  return useQuery<VoiceProfile>({
    queryKey: ["voice-profile"],
    queryFn: async () => (await api.get("/orgs/voice-profile")).data,
    staleTime: 60_000,
  });
}

export function useUpsertVoiceProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VoiceProfile) =>
      api.put("/orgs/voice-profile", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["voice-profile"] }),
  });
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export type PostType = "text" | "image" | "carousel" | "poll";
export type PostStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected";

export interface Post {
  id: string;
  org_id: string;
  author_id: string;
  type: PostType;
  status: PostStatus;
  title?: string;
  content?: string;
  content_json?: Record<string, unknown>;
  ai_model_used?: string;
  rejection_reason?: string;
  scheduled_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export function usePost(id: string | null) {
  return useQuery<Post>({
    queryKey: ["post", id],
    queryFn: async () => (await api.get(`/posts/${id}`)).data,
    enabled: !!id,
  });
}

export function usePosts(status?: string) {
  return useQuery<Post[]>({
    queryKey: ["posts", status],
    queryFn: async () =>
      (await api.get("/posts", { params: status ? { status } : {} })).data,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { type: PostType; title?: string; content?: string }) =>
      api.post<Post>("/posts", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      title?: string;
      content?: string;
      content_json?: Record<string, unknown>;
      ai_model_used?: string;
    }) => api.patch<Post>(`/posts/${id}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useSubmitPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Post>(`/posts/${id}/submit`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/posts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useApprovePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: "approve" | "reject"; reason?: string }) =>
      api.post<Post>(`/posts/${id}/approve`, { action, reason }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

// ─── AI Generation ────────────────────────────────────────────────────────────

export interface AIResult {
  model: "claude" | "openai" | "gemini";
  hook?: string;
  body?: string;
  cta?: string;
  hashtags?: string[];
  full_post?: string;
  error?: string;
}

export interface ImageGenPayload {
  postId: string;
  topic: string;
  brand_colors?: string[];
  style?: string;
  aspect_ratio?: string;
  logo_url?: string;
  additional_instructions?: string;
}

export interface ImageGenResult {
  image_data: string;  // base64
  mime_type: string;
}

export function useGenerateImage() {
  return useMutation({
    mutationFn: ({ postId, ...payload }: ImageGenPayload) =>
      api
        .post<ImageGenResult>(`/posts/${postId}/generate-image`, payload)
        .then((r) => r.data),
  });
}

export function usePublishPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Post>(`/posts/${id}/publish`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

// ─── LinkedIn ─────────────────────────────────────────────────────────────────

export interface LinkedInAccount {
  id: string;
  org_id: string;
  linkedin_person_id: string;
  is_active: boolean;
  connected_at: string;
}

export function useLinkedInStatus() {
  return useQuery<LinkedInAccount | null>({
    queryKey: ["linkedin-status"],
    queryFn: async () => {
      const r = await api.get("/linkedin/status");
      return r.data ?? null;
    },
    retry: false,
  });
}

export function useLinkedInConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      api.post<LinkedInAccount>("/linkedin/connect", { code }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["linkedin-status"] }),
  });
}

export function useLinkedInDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/linkedin/disconnect"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["linkedin-status"] }),
  });
}

// ─── Campaigns ───────────────────────────────────────────────────────────────

export interface CampaignPost {
  id: string;
  campaign_id: string;
  post_id: string;
  sequence_number: number;
  post: Post;
}

export interface Campaign {
  id: string;
  org_id: string;
  created_by: string;
  name: string;
  topic: string;
  target_outcome: string;
  key_messages: string[];
  mode: "series" | "collection";
  post_count: number;
  frequency_days: number;
  start_date: string;
  post_type: string;
  include_images: boolean;
  tone_override?: string;
  status: "draft" | "generating" | "ready_for_review" | "active" | "completed";
  created_at: string;
  updated_at: string;
  campaign_posts: CampaignPost[];
}

export interface CampaignCreatePayload {
  name: string;
  topic: string;
  target_outcome: string;
  key_messages: string[];
  mode: "series" | "collection";
  post_count: number;
  frequency_days: number;
  start_date: string; // YYYY-MM-DD
  post_type: string;
  include_images: boolean;
  tone_override?: string;
}

export function useCampaigns() {
  return useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: async () => (await api.get("/campaigns")).data,
  });
}

export function useCampaign(id: string | null) {
  return useQuery<Campaign>({
    queryKey: ["campaign", id],
    queryFn: async () => (await api.get(`/campaigns/${id}`)).data,
    enabled: !!id,
    refetchInterval: (query) =>
      query.state.data?.status === "generating" ? 3000 : false,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CampaignCreatePayload) =>
      api.post<Campaign>("/campaigns", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useRegenerateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Campaign>(`/campaigns/${id}/regenerate`).then((r) => r.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useRegenerateCampaignPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, postId }: { campaignId: string; postId: string }) =>
      api.post<Campaign>(`/campaigns/${campaignId}/posts/${postId}/regenerate`).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["campaign", data.id] });
    },
  });
}

export function useApproveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Campaign>(`/campaigns/${id}/approve`).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["campaign", data.id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useGenerateAI() {
  return useMutation({
    mutationFn: ({
      postId,
      topic,
    }: {
      postId: string;
      topic: string;
    }) =>
      api
        .post<{ results: AIResult[] }>(`/posts/${postId}/generate`, { topic })
        .then((r) => r.data.results),
  });
}

// ─── Org / Company Profile ────────────────────────────────────────────────────

export interface OrgProfile {
  id: string;
  name: string;
  slug: string;
  company_description?: string | null;
  company_context?: string | null;
  logo_url?: string | null;
}

export function useOrgProfile() {
  return useQuery<OrgProfile>({
    queryKey: ["org-profile"],
    queryFn: async () => (await api.get("/orgs/me")).data,
    staleTime: 60_000,
  });
}

export function useUpdateCompanyContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { company_description: string }) =>
      api.patch<OrgProfile>("/orgs/me", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-profile"] }),
  });
}

export function useUploadCompanyDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post<{ company_context: string }>("/orgs/company-context/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-profile"] }),
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post<OrgProfile>("/orgs/logo", form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-profile"] }),
  });
}

// ─── Billing ─────────────────────────────────────────────────────────────────

export type BillingPeriod = "monthly" | "annual";

export interface CheckoutPayload {
  plan: "solo" | "team" | "agency";
  billing_period?: BillingPeriod;
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (payload: CheckoutPayload) =>
      api.post<{ url: string }>("/billing/checkout", payload).then((r) => r.data.url),
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}

export function useCreatePortal() {
  return useMutation({
    mutationFn: () =>
      api.post<{ url: string }>("/billing/portal").then((r) => r.data.url),
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}
