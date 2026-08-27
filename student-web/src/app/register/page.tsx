import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = {
  title: "Sign Up — UPN Student Hub",
  description: "Create your UPN Student Hub account",
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-[400px]">
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
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
          <form className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                placeholder="John Doe"
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
              />
            </div>

            <Button type="submit" className="w-full">
              Sign Up
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
