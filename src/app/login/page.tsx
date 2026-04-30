"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { AuthCard, AuthDivider, AuthError, AuthInput } from "@/components/auth/AuthUI";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams?.get("redirect") || "/dashboard";
  const safeRedirect = redirectParam.startsWith("/") ? redirectParam : "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(undefined);
    setLoading(true);

    try {
  await signInWithEmail(email, password);
  router.replace(safeRedirect);
    } catch {
      setError("We couldn’t sign you in with that email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(undefined);
    setLoading(true);

    try {
  await signInWithGoogle(safeRedirect);
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-[70vh] py-8 sm:py-10">
      <AuthCard>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="text-sm text-slate-500">
            Welcome back to Vuxsy. Please enter your details.
          </p>
        </div>

  <form className="mt-4 space-y-4 sm:mt-6 sm:space-y-6" onSubmit={handleEmailLogin}>
          <AuthInput
            id="login-email"
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <AuthInput
            id="login-password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          <AuthError message={error} />

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-3 text-right">
          <Link href="/forgot-password" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Forgot your password?
          </Link>
        </div>

  <div className="my-4 sm:my-6">
          <AuthDivider />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.72 1.22 9.22 3.6l6.87-6.87C35.9 2.46 30.33 0 24 0 14.64 0 6.7 5.38 2.83 13.22l7.98 6.2C12.64 13.12 17.86 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.5 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.7c-.55 2.97-2.23 5.5-4.74 7.22l7.27 5.63c4.26-3.93 6.27-9.72 6.27-17.1z"
            />
            <path
              fill="#FBBC05"
              d="M10.8 28.2c-.5-1.47-.78-3.05-.78-4.7s.28-3.23.78-4.7l-7.98-6.2C1.02 15.8 0 19.8 0 24s1.02 8.2 2.82 11.4l7.98-6.2z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.33 0 11.65-2.08 15.53-5.63l-7.27-5.63c-2.02 1.36-4.62 2.17-8.26 2.17-6.14 0-11.36-3.62-13.19-8.72l-7.98 6.2C6.7 42.62 14.64 48 24 48z"
            />
          </svg>
          Continue with Google
        </button>

  <p className="mt-4 text-center text-sm text-slate-500 sm:mt-6">
          Don’t have an account?{" "}
          <Link href={`/signup?redirect=${encodeURIComponent(safeRedirect)}`} className="font-semibold text-slate-900">
            Register
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}
