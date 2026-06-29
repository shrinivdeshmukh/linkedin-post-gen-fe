import { useState, useEffect, useRef } from "react";
import {
  usePillars,
  useCreatePillar,
  useUpdatePillar,
  useSuggestPillars,
  useContentMap,
  type ContentPillar,
  type ContentMapPost,
} from "../../lib/api-hooks";
import RetirePillarDialog from "../../components/RetirePillarDialog";

// ── Colour palette users pick from ────────────────────────────────────────────
const PALETTE = [
  { id: "indigo",  bg: "bg-indigo-500",  ring: "ring-indigo-400",  dot: "#6366f1" },
  { id: "violet",  bg: "bg-violet-500",  ring: "ring-violet-400",  dot: "#8b5cf6" },
  { id: "emerald", bg: "bg-emerald-500", ring: "ring-emerald-400", dot: "#10b981" },
  { id: "amber",   bg: "bg-amber-400",   ring: "ring-amber-300",   dot: "#f59e0b" },
  { id: "rose",    bg: "bg-rose-500",    ring: "ring-rose-400",    dot: "#f43f5e" },
  { id: "sky",     bg: "bg-sky-500",     ring: "ring-sky-400",     dot: "#0ea5e9" },
  { id: "orange",  bg: "bg-orange-500",  ring: "ring-orange-400",  dot: "#f97316" },
  { id: "teal",    bg: "bg-teal-500",    ring: "ring-teal-400",    dot: "#14b8a6" },
];

function colorDot(color: string | null) {
  return PALETTE.find((c) => c.id === color)?.dot ?? "#94a3b8";
}

// ── Tab bar ────────────────────────────────────────────────────────────────────
type Tab = "pillars" | "map";

// ── Pillar form (create / edit inline) ────────────────────────────────────────
function PillarForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<ContentPillar>;
  onSave: (v: { name: string; description: string; color: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? PALETTE[0].id);

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
      <input
        autoFocus
        placeholder="Pillar name (e.g. Leadership decisions)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400"
      />
      <input
        placeholder="One-line description (optional)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400"
      />
      {/* Color picker */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 mr-1">Color</span>
        {PALETTE.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setColor(c.id)}
            className={`w-5 h-5 rounded-full ${c.bg} transition-all ${color === c.id ? `ring-2 ring-offset-1 ${c.ring}` : "opacity-60 hover:opacity-100"}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          Cancel
        </button>
        <button
          onClick={() => onSave({ name: name.trim(), description: desc.trim(), color })}
          disabled={!name.trim() || saving}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ── Pillar card ────────────────────────────────────────────────────────────────
function PillarCard({
  pillar,
  onRetire,
}: {
  pillar: ContentPillar;
  onRetire: (p: ContentPillar) => void;
}) {
  const update = useUpdatePillar();
  const [editing, setEditing] = useState(false);
  const retired = pillar.status === "retired";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-opacity ${retired ? "border-slate-100 bg-slate-50 opacity-60" : "border-slate-200 bg-white"}`}>
      {editing ? (
        <PillarForm
          initial={pillar}
          saving={update.isPending}
          onCancel={() => setEditing(false)}
          onSave={async (v) => {
            await update.mutateAsync({ id: pillar.id, ...v });
            setEditing(false);
          }}
        />
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                style={{ background: colorDot(pillar.color) }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{pillar.name}</p>
                  {retired && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">
                      Retired
                    </span>
                  )}
                  {pillar.status === "suggested" && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-wide">
                      Suggested
                    </span>
                  )}
                </div>
                {pillar.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{pillar.description}</p>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0 mt-0.5">
              {pillar.post_count} post{pillar.post_count !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!retired && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-slate-400 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => onRetire(pillar)}
                  className="text-xs text-slate-400 hover:text-rose-600 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors ml-auto"
                >
                  Retire
                </button>
              </>
            )}
            {retired && (
              <button
                onClick={() => update.mutateAsync({ id: pillar.id, status: "active" })}
                disabled={update.isPending}
                className="text-xs text-indigo-500 hover:text-indigo-700 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Reactivate
              </button>
            )}
            {pillar.status === "suggested" && (
              <button
                onClick={() => update.mutateAsync({ id: pillar.id, status: "active" })}
                disabled={update.isPending}
                className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Activate
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Pillars tab ────────────────────────────────────────────────────────────────
function PillarsTab() {
  const { data: allPillars = [], isLoading } = usePillars(true);
  const create = useCreatePillar();
  const suggest = useSuggestPillars();
  const [adding, setAdding] = useState(false);
  const [retiringPillar, setRetiringPillar] = useState<ContentPillar | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const suggestFired = useRef(false);

  // Auto-generate suggestions once when user has no pillars at all
  useEffect(() => {
    if (!isLoading && allPillars.length === 0 && !suggestFired.current) {
      suggestFired.current = true;
      suggest.mutate();
    }
  }, [isLoading, allPillars.length]);

  const active = allPillars.filter((p) => p.status === "active");
  const suggested = allPillars.filter((p) => p.status === "suggested");
  const retired = allPillars.filter((p) => p.status === "retired");

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Content pillars</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            The recurring themes your brand is built around. Every post gets tagged to a pillar.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add pillar
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <PillarForm
          saving={create.isPending}
          onCancel={() => setAdding(false)}
          onSave={async (v) => {
            await create.mutateAsync(v);
            setAdding(false);
          }}
        />
      )}

      {/* Active pillars */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 h-20 animate-pulse" />
          ))}
        </div>
      ) : active.length === 0 && suggested.length === 0 && !adding ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Generating pillar suggestions…</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((p) => (
            <PillarCard key={p.id} pillar={p} onRetire={setRetiringPillar} />
          ))}
        </div>
      )}

      {/* Suggested pillars */}
      {suggested.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Suggested by AI</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <p className="text-xs text-slate-400">Based on your recent posts, these themes are emerging. Activate the ones that fit your brand.</p>
          {suggested.map((p) => (
            <PillarCard key={p.id} pillar={p} onRetire={setRetiringPillar} />
          ))}
        </div>
      )}

      {/* Retired pillars — collapsed by default */}
      {retired.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowRetired((v) => !v)}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showRetired ? "rotate-90" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {retired.length} retired pillar{retired.length !== 1 ? "s" : ""} — kept for history
          </button>
          {showRetired && (
            <div className="space-y-3">
              {retired.map((p) => (
                <PillarCard key={p.id} pillar={p} onRetire={setRetiringPillar} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Retire dialog */}
      {retiringPillar && (
        <RetirePillarDialog
          pillar={retiringPillar}
          onDone={() => setRetiringPillar(null)}
          onCancel={() => setRetiringPillar(null)}
        />
      )}
    </div>
  );
}

// ── Content map tab ────────────────────────────────────────────────────────────
function ContentMapTab() {
  const { data: posts = [], isLoading } = useContentMap();
  const { data: pillars = [] } = usePillars(true);
  const [filterPillar, setFilterPillar] = useState<string>("all");

  // Group posts by month
  const filtered = filterPillar === "all" ? posts : posts.filter((p) => p.pillar_id === filterPillar);

  const byMonth: Record<string, ContentMapPost[]> = {};
  for (const post of filtered) {
    const key = post.published_at
      ? new Date(post.published_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "Unpublished";
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(post);
  }

  const months = Object.keys(byMonth);

  return (
    <div className="space-y-6">
      {/* Header + filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Content map</h2>
          <p className="text-sm text-slate-500 mt-0.5">Your brand landscape over time, colour-coded by pillar.</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterPillar("all")}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              filterPillar === "all"
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-200 text-slate-500 hover:border-slate-400"
            }`}
          >
            All
          </button>
          {pillars.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterPillar(p.id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                filterPillar === p.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-slate-200 text-slate-500 hover:border-slate-400"
              } ${p.status === "retired" ? "opacity-50" : ""}`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colorDot(p.color) }} />
              {p.name}
              {p.status === "retired" && <span className="text-[9px] ml-0.5">(retired)</span>}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 bg-slate-100 rounded w-32 animate-pulse" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <p className="text-sm text-slate-400">No posts yet.</p>
          <p className="text-xs text-slate-400 mt-1">Your content map builds as you generate and publish posts.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {months.map((month) => (
            <div key={month} className="space-y-3">
              {/* Month divider */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {month}
                </span>
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs text-slate-400">{byMonth[month].length} post{byMonth[month].length !== 1 ? "s" : ""}</span>
              </div>

              {/* Post cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {byMonth[month].map((post) => (
                  <PostMapCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PostMapCard({ post }: { post: ContentMapPost }) {
  const retired = post.pillar_status === "retired";
  const dot = colorDot(post.pillar_color);

  return (
    <div
      className={`rounded-xl border p-3 space-y-2 transition-opacity ${
        retired ? "border-slate-100 bg-slate-50 opacity-60" : "border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm"
      }`}
    >
      {/* Pillar chip */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: post.pillar_id ? dot : "#e2e8f0" }}
        />
        <span className="text-[10px] font-medium text-slate-500 truncate">
          {post.pillar_name ?? "No pillar"}
          {retired && " · retired"}
        </span>
      </div>

      {/* Content preview */}
      <p className="text-xs text-slate-800 leading-snug line-clamp-3">
        {post.content_preview ?? post.title ?? "Untitled"}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {post.post_format && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">
            {post.post_format.replace(/_/g, " ")}
          </span>
        )}
        {post.topic_cluster && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500">
            {post.topic_cluster}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Page shell ─────────────────────────────────────────────────────────────────
export default function BrandPage() {
  const [tab, setTab] = useState<Tab>("pillars");

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Brand</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your content pillars and track your brand over time.</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl w-fit">
          {(["pillars", "map"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t === "map" ? "Content map" : "Pillars"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "pillars" ? <PillarsTab /> : <ContentMapTab />}
      </div>
    </div>
  );
}
