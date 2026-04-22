import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";

const schema = z.object({
  display_name: z.string().min(2, "Enter your full name"),
  org_name: z.string().min(2, "Workspace name must be at least 2 characters"),
  org_slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(40, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
});

export type WorkspaceFormData = z.infer<typeof schema>;

interface WorkspaceStepProps {
  defaultValues?: Partial<WorkspaceFormData>;
  onNext: (data: WorkspaceFormData) => void;
  loading?: boolean;
  error?: string | null;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

export function WorkspaceStep({ defaultValues, onNext, loading, error }: WorkspaceStepProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WorkspaceFormData>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const orgName = watch("org_name", "");

  // Auto-generate slug from org name unless user has edited it manually
  useEffect(() => {
    if (orgName) setValue("org_slug", toSlug(orgName), { shouldValidate: false });
  }, [orgName, setValue]);

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Set up your workspace</h2>
        <p className="text-sm text-slate-500">
          This is where you and your team will work on your LinkedIn content.
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Your name"
          placeholder="Jane Smith"
          autoComplete="name"
          error={errors.display_name?.message}
          {...register("display_name")}
        />

        <Input
          label="Workspace name"
          placeholder="Acme Corp, Jane's Posts…"
          hint="Usually your name or your company name."
          error={errors.org_name?.message}
          {...register("org_name")}
        />

        <div className="space-y-1.5">
          <Input
            label="Workspace URL"
            placeholder="jane-smith"
            error={errors.org_slug?.message}
            hint="postcards.studio/w/your-slug"
            {...register("org_slug")}
          />
          {orgName && !errors.org_slug && (
            <p className="text-xs text-slate-400 pl-1">
              postcards.studio/w/{toSlug(orgName)}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button type="submit" fullWidth size="lg" loading={loading}>
        Continue
      </Button>
    </form>
  );
}
