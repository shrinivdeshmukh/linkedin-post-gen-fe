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
  transcription_minutes_used: number;
  transcription_minutes_limit: number | null;
  translations_used: number;
  translations_limit: number | null;
}

// ─── Videos ──────────────────────────────────────────────────────────────────

export interface Video {
  id: string;
  org_id: string;
  uploaded_by: string;
  slug: string;
  title: string;
  spaces_url: string;
  file_size: number;
  mime_type: string;
  duration_seconds: number | null;
  linkedin_asset_urn: string | null;
  linkedin_uploaded_at: string | null;
  transcript: string | null;
  transcript_status: "none" | "pending" | "processing" | "done" | "failed";
  detected_language: string | null;
  language_confirmed: boolean;
  created_at: string;
}

export interface VideoLibrary {
  videos: Video[];
  total_storage_bytes: number;
  storage_limit_bytes: number | null;
}

export function useGenerateShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (collectionId: string) =>
      api.post<MediaCollection>(`/media/collections/${collectionId}/share`).then((r) => r.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["media-collections"] });
      qc.invalidateQueries({ queryKey: ["media-collection", id] });
    },
  });
}

export function useRevokeShareLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (collectionId: string) => api.delete(`/media/collections/${collectionId}/share`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["media-collections"] });
      qc.invalidateQueries({ queryKey: ["media-collection", id] });
    },
  });
}

export function useUpdateCollectionSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, allow_download, allow_upload }: { id: string; allow_download?: boolean; allow_upload?: boolean }) =>
      api.patch<MediaCollection>(`/media/collections/${id}/settings`, { allow_download, allow_upload }).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["media-collections"] });
      qc.invalidateQueries({ queryKey: ["media-collection", id] });
    },
  });
}

export function usePublicCollection(token: string | null) {
  return useQuery<MediaCollectionWithItems>({
    queryKey: ["public-collection", token],
    queryFn: async () => (await api.get(`/public/collections/${token}`)).data,
    enabled: !!token,
  });
}

export function useVideos() {
  return useQuery<VideoLibrary>({
    queryKey: ["videos"],
    queryFn: async () => (await api.get("/videos")).data,
  });
}

export function useVideo(id: string | null) {
  return useQuery<Video>({
    queryKey: ["video", id],
    queryFn: async () => (await api.get(`/videos/${id}`)).data,
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.transcript_status;
      return status === "pending" || status === "processing" ? 5000 : false;
    },
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/videos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useUpdateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.patch(`/videos/${id}`, { title }).then((r) => r.data as Video),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useRetriggerTranscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Video>(`/videos/${id}/transcribe`).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["video", data.id] });
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

export function useConfirmLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, detected_language }: { id: string; detected_language?: string }) =>
      api.patch<Video>(`/videos/${id}/confirm-language`, { detected_language }).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(["video", data.id], data);
    },
  });
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

export type PostType = "text" | "image" | "carousel" | "poll" | "video" | "link";
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
  medium?: string;
  status: PostStatus;
  title?: string | null;
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
    mutationFn: (payload: { type: PostType | string; medium?: string; title?: string; content?: string }) =>
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
      medium?: string;
      content?: string;
      content_json?: Record<string, unknown>;
      ai_model_used?: string;
      scheduled_at?: string | null;
    }) => api.patch<Post>(`/posts/${id}`, payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["post", data.id] });
    },
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

export function useSchedulePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, publishAt }: { postId: string; publishAt: string }) =>
      api.post(`/schedule/${postId}`, { publish_at: publishAt }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function useUnschedulePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => api.delete(`/schedule/${postId}`).then((r) => r.data),
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
  hero_image_url?: string | null;  // public DO Spaces URL (blog posts only)
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
  medium?: string;
  post_count: number;
  frequency_days: number;
  start_date: string;
  post_type: string;
  include_images: boolean;
  tone_override?: string;
  target_word_count?: number | null;
  status: "draft" | "generating" | "ready_for_review" | "active" | "completed";
  created_at: string;
  updated_at: string;
  campaign_posts: CampaignPost[];
  approved_count?: number;
}

export interface CampaignCreatePayload {
  name: string;
  topic: string;
  target_outcome: string;
  key_messages: string[];
  mode: "series" | "collection";
  medium?: string;
  post_count: number;
  frequency_days: number;
  start_date: string; // YYYY-MM-DD
  post_type: string;
  include_images: boolean;
  tone_override?: string;
  target_word_count?: number;
  document_context?: string;
  raw_context?: string;
  post_length?: string;
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
      document_context,
      raw_context,
      post_length,
    }: {
      postId: string;
      topic: string;
      document_context?: string | null;
      raw_context?: string | null;
      post_length?: "short" | "medium" | "long";
    }) =>
      api
        .post<{ results: AIResult[] }>(`/posts/${postId}/generate`, {
          topic,
          document_context: document_context ?? undefined,
          raw_context: raw_context ?? undefined,
          post_length: post_length ?? "medium",
        })
        .then((r) => r.data.results),
  });
}

export interface Translation {
  id: string;
  video_id: string;
  language_code: string;
  language_name: string;
  translated_text: string;
  created_at: string;
}

export function useTranslations(videoId: string | null) {
  return useQuery<Translation[]>({
    queryKey: ["translations", videoId],
    queryFn: async () => (await api.get(`/videos/${videoId}/translations`)).data,
    enabled: !!videoId,
  });
}

export function useTranslate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ videoId, language_code, language_name }: { videoId: string; language_code: string; language_name: string }) =>
      api.post<Translation>(`/videos/${videoId}/translations`, { language_code, language_name }).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["translations", data.video_id] });
    },
  });
}

export function useExtractVideoContext() {
  return useMutation({
    mutationFn: (videoId: string) =>
      api
        .post<{ text: string; char_count: number }>("/context/extract-video", { video_id: videoId })
        .then((r) => r.data),
  });
}

// ─── Blog / SEO ───────────────────────────────────────────────────────────────

export interface SeoResearchResult {
  primary_keyword: string;
  secondary_keywords: string[];
  people_also_ask: string[];
  meta_title: string;
  meta_description: string;
  recommended_word_count: number;
}

export function useSeoResearch() {
  return useMutation({
    mutationFn: (topic: string) =>
      api.post<SeoResearchResult>("/posts/seo-research", { topic }).then(r => r.data),
  });
}

export function useGenerateBlogOutline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, primary_keyword, secondary_keywords, word_count }: {
      postId: string;
      primary_keyword: string;
      secondary_keywords: string[];
      word_count: number;
    }) =>
      api.post<Post>(`/posts/${postId}/generate-blog-outline`, {
        primary_keyword, secondary_keywords, word_count,
      }).then(r => r.data),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["post", data.id] }),
  });
}

export function useGenerateBlogDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      api.post<Post>(`/posts/${postId}/generate-blog-draft`).then(r => r.data),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ["post", data.id] }),
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
  auto_transcribe: boolean;
  competitors?: string[] | null;
  timezone?: string;
  country?: string | null;
}

export function useUpdateOrgSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { auto_transcribe?: boolean; competitors?: string[]; timezone?: string; country?: string }) =>
      api.patch<OrgProfile>("/orgs/me", payload).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(["org-profile"], data),
  });
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

// ─── Media Library ───────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  collection_id: string;
  org_id: string;
  title: string;
  spaces_url: string;
  mime_type: string;
  file_size: number;
  source: "uploaded" | "generated";
  created_at: string;
}

export interface MediaCollection {
  id: string;
  org_id: string;
  name: string;
  campaign_id: string | null;
  created_at: string;
  item_count: number;
  thumbnail_url: string | null;
  share_token?: string | null;
  allow_download?: boolean;
  allow_upload?: boolean;
}

export interface MediaCollectionWithItems extends MediaCollection {
  items: MediaItem[];
  share_token?: string | null;
  allow_download?: boolean;
  allow_upload?: boolean;
}

export function useMediaCollections() {
  return useQuery<MediaCollection[]>({
    queryKey: ["media-collections"],
    queryFn: async () => (await api.get("/media/collections")).data,
  });
}

export function useMediaCollection(id: string | null) {
  return useQuery<MediaCollectionWithItems>({
    queryKey: ["media-collection", id],
    queryFn: async () => (await api.get(`/media/collections/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateMediaCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<MediaCollection>("/media/collections", { name }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-collections"] }),
  });
}

export function useRenameMediaCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<MediaCollection>(`/media/collections/${id}`, { name }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-collections"] }),
  });
}

export function useDeleteMediaCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/media/collections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["media-collections"] }),
  });
}

export function useUploadToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, file }: { collectionId: string; file: File }) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post<MediaItem>(`/media/collections/${collectionId}/upload`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: (_, { collectionId }) => {
      qc.invalidateQueries({ queryKey: ["media-collections"] });
      qc.invalidateQueries({ queryKey: ["media-collection", collectionId] });
    },
  });
}

export function useDeleteMediaItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => api.delete(`/media/items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media-collections"] });
      qc.invalidateQueries({ queryKey: ["media-collection"] });
    },
  });
}

// ─── Team Management ─────────────────────────────────────────────────────────

export interface OrgMember {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
}

export interface OrgInvite {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export function useOrgMembers() {
  return useQuery<OrgMember[]>({
    queryKey: ["org-members"],
    queryFn: async () => (await api.get("/orgs/members")).data,
  });
}

export function useOrgInvites() {
  return useQuery<OrgInvite[]>({
    queryKey: ["org-invites"],
    queryFn: async () => (await api.get("/orgs/invites")).data,
  });
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; role: string }) =>
      api.post("/orgs/invite", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-invites"] }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => api.delete(`/orgs/invites/${inviteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-invites"] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => api.delete(`/orgs/members/${memberId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-members"] }),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api.patch<OrgMember>(`/orgs/members/${memberId}`, { role }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-members"] }),
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { token: string; display_name?: string }) =>
      api.post<MeResponse>("/auth/accept-invite", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

// ─── Add-ons ─────────────────────────────────────────────────────────────────

export interface AddonInfo {
  addon_type: string;
  label: string;
  block_size: number;
  unit_label: string;
  block_display: string;
  price_per_block: number;
  current_blocks: number;
  extra_units: number;
  monthly_cost: number;
  available: boolean;
}

export interface ApplyAddonsPayload {
  post_generations: number;
  image_generations: number;
  media_storage: number;
  transcription: number;
  translations: number;
}

export function useAddons() {
  return useQuery<AddonInfo[]>({
    queryKey: ["addons"],
    queryFn: () => api.get<AddonInfo[]>("/addons").then((r) => r.data),
  });
}

export function useApplyAddons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplyAddonsPayload) =>
      api.post<AddonInfo[]>("/addons/apply", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["addons"] });
      qc.invalidateQueries({ queryKey: ["plan"] });
    },
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

// ─── Spark Research ───────────────────────────────────────────────────────────

export interface ResearchSession {
  id: string;
  org_id: string;
  mode: string;
  status: "pending" | "running" | "complete" | "failed";
  triggered_by: string;
  topic: string | null;
  url: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TriggerResearchPayload {
  mode: string;
  topic?: string;
  url?: string;
}

export interface ResearchBrief {
  session_id: string | null;
  name: string;
  topic: string;
  target_outcome: string;
  key_messages: string[];
}

export function useLatestResearch(mode?: string) {
  return useQuery<ResearchSession | null>({
    queryKey: ["research-latest", mode ?? "all"],
    queryFn: async () => {
      const r = await api.get("/research/latest", { params: mode ? { mode } : {} });
      return r.data ?? null;
    },
    staleTime: 30_000,
  });
}

export function useResearchSession(id: string | null) {
  return useQuery<ResearchSession>({
    queryKey: ["research-session", id],
    queryFn: async () => (await api.get(`/research/sessions/${id}`)).data,
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "running" ? 3000 : false;
    },
  });
}

export function useResearchSessions() {
  return useQuery<ResearchSession[]>({
    queryKey: ["research-sessions"],
    queryFn: async () => (await api.get("/research/sessions")).data,
    staleTime: 30_000,
  });
}

export function useTriggerResearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TriggerResearchPayload) =>
      api.post<ResearchSession>("/research/trigger", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research-latest"] });
      qc.invalidateQueries({ queryKey: ["research-sessions"] });
    },
  });
}

export function useGetResearchBrief() {
  return useMutation({
    mutationFn: () =>
      api.post<ResearchBrief>("/research/brief").then((r) => r.data),
  });
}

// ─── Podcast ─────────────────────────────────────────────────────────────────

export interface PodcastVoice {
  id: string;
  gender: "M" | "F";
  style: string;
}

export interface PodcastConfig {
  host1_name: string;
  host1_voice: string;
  host2_name: string;
  host2_voice: string;
  tone: "conversational" | "interview" | "debate" | "educational";
  length: "short" | "medium" | "long";
  creativity: number;
  language: "en" | "hi-en";
}

export interface PodcastJob {
  id: string;
  org_id: string;
  status: "pending" | "scripting" | "generating" | "complete" | "failed";
  config: PodcastConfig;
  blog_source_url: string | null;
  script: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  error: string | null;
  transcript_status: "none" | "pending" | "processing" | "done" | "failed";
  transcript: string | null;
  detected_language: string | null;
  video_status: "none" | "pending" | "generating_visuals" | "rendering" | "complete" | "failed";
  video_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface GeneratePodcastPayload {
  blog_content: string;
  blog_source_url?: string;
  config: PodcastConfig;
}

export function usePodcastVoices() {
  return useQuery<PodcastVoice[]>({
    queryKey: ["podcast-voices"],
    queryFn: async () => (await api.get("/podcast/voices")).data,
    staleTime: Infinity,
  });
}

export function usePodcastJob(id: string | null) {
  return useQuery<PodcastJob>({
    queryKey: ["podcast-job", id],
    queryFn: async () => (await api.get(`/podcast/jobs/${id}`)).data,
    enabled: !!id,
    refetchInterval: (query) => {
      const d = query.state.data;
      const generatingAudio = d?.status === "pending" || d?.status === "scripting" || d?.status === "generating";
      const transcribing = d?.transcript_status === "pending" || d?.transcript_status === "processing";
      const generatingVideo = d?.video_status === "pending" || d?.video_status === "generating_visuals" || d?.video_status === "rendering";
      return generatingAudio || transcribing || generatingVideo ? 3000 : false;
    },
  });
}

export function useTranscribePodcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      api.post<PodcastJob>(`/podcast/jobs/${jobId}/transcribe`).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(["podcast-job", data.id], data);
      qc.invalidateQueries({ queryKey: ["podcast-jobs"] });
    },
  });
}

export function useGeneratePodcastVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      api.post<PodcastJob>(`/podcast/jobs/${jobId}/generate-video`).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(["podcast-job", data.id], data);
      qc.invalidateQueries({ queryKey: ["podcast-jobs"] });
    },
  });
}

export function usePodcastJobs() {
  return useQuery<PodcastJob[]>({
    queryKey: ["podcast-jobs"],
    queryFn: async () => (await api.get("/podcast/jobs")).data,
    staleTime: 30_000,
  });
}

export function useGeneratePodcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeneratePodcastPayload) =>
      api.post<PodcastJob>("/podcast/generate", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["podcast-jobs"] }),
  });
}

export function useDeletePodcastJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/podcast/jobs/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["podcast-jobs"] }),
  });
}
