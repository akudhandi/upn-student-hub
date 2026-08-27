"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register, ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [npm, setNpm] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await register({
        name: fullName,
        email,
        password,
        password_confirmation: confirmPassword,
        nim: npm || undefined,
      });
      console.log(res);
      router.push("/dashboard");
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.errors) {
        const firstFieldError = Object.values(apiError.errors).flat()[0];
        setError(firstFieldError || apiError.message);
      } else {
        setError(apiError.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 py-10">
      {/* Subtle radial glow accent — professional, low-contrast */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_700px_340px_at_50%_-40px,rgba(17,24,39,0.06),transparent_70%)]"
      />
      <div className="relative w-full max-w-[400px]">
        {/* Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-gray-900 text-sm font-bold tracking-tight text-white">
            UPN
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            UPN Student Hub
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Create your student account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-7 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="npm">NPM</Label>
              <Input
                id="npm"
                name="npm"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                required
                placeholder="21081010001"
                value={npm}
                onChange={(e) => setNpm(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">Nomor Pokok Mahasiswa</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="nama@upnjatim.ac.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Use your @upnjatim.ac.id email address
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>
        </div>

        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-gray-900 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
