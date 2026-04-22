import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthBrandPanel } from "../../components/auth/AuthBrandPanel";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Divider } from "../../components/ui/Divider";
import {
  signUpWithEmail,
  signInWithGoogle,
  signInWithLinkedIn,
} from "../../lib/firebase";

const schema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const PASSWORD_RULES = [
  { label: "8+ characters", test: (v: string) => v.length >= 8 },
  { label: "Uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "Number", test: (v: string) => /[0-9]/.test(v) },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [linkedInLoading, setLinkedInLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema), mode: "onChange" });

  const passwordValue = watch("password", "");

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      await signUpWithEmail(data.email, data.password);
      navigate("/onboarding");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        setServerError(
          "An account with this email already exists. Try signing in."
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setServerError(null);
    try {
      await signInWithGoogle();
      navigate("/onboarding");
    } catch {
      setServerError("Google sign-up failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleLinkedIn() {
    setLinkedInLoading(true);
    setServerError(null);
    try {
      await signInWithLinkedIn();
      navigate("/onboarding");
    } catch {
      setServerError("LinkedIn sign-up failed. Please try again.");
    } finally {
      setLinkedInLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — brand panel */}
      <AuthBrandPanel />

      {/* Right — form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24 bg-white overflow-y-auto">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="font-semibold text-slate-900">
              postcards<span className="text-indigo-600">.studio</span>
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Create your account
            </h1>
            <p className="text-slate-500 text-sm mt-1.5">
              Start building your LinkedIn presence today
            </p>
          </div>

          {/* OAuth buttons */}
          <div className="space-y-3 mb-6">
            <Button
              variant="outline"
              fullWidth
              size="lg"
              loading={googleLoading}
              onClick={handleGoogle}
              type="button"
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <Button
              variant="outline"
              fullWidth
              size="lg"
              loading={linkedInLoading}
              onClick={handleLinkedIn}
              type="button"
            >
              <LinkedInIcon />
              Continue with LinkedIn
            </Button>
          </div>

          <Divider />

          {/* Email form */}
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Input
              label="Full name"
              type="text"
              placeholder="Jane Smith"
              autoComplete="name"
              error={errors.name?.message}
              {...register("name")}
            />

            <Input
              label="Work email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />

            <div className="space-y-2">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register("password")}
              />
              {/* Password strength indicator */}
              {passwordValue && (
                <div className="flex gap-2">
                  {PASSWORD_RULES.map((rule) => (
                    <div
                      key={rule.label}
                      className={`flex items-center gap-1 text-xs transition-colors ${
                        rule.test(passwordValue)
                          ? "text-emerald-600"
                          : "text-slate-400"
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          rule.test(passwordValue)
                            ? "bg-emerald-500"
                            : "bg-slate-300"
                        }`}
                      />
                      {rule.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{serverError}</p>
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isSubmitting}
              className="mt-2"
            >
              Create account
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Sign in
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-slate-400">
            By creating an account, you agree to our{" "}
            <a
              href="https://postcards.studio/terms"
              className="underline hover:text-slate-600"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="https://postcards.studio/privacy"
              className="underline hover:text-slate-600"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4" fill="#0077B5" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}
