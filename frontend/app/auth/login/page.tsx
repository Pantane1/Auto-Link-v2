"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGoogleLogin } from "@react-oauth/google";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executeRecaptcha) return;
    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha("login");
      const { data } = await api.post("/api/auth/login", { ...form, recaptchaToken });
      setAuth(data.user, data.token);
      toast.success(`Welcome back, ${data.user.fullName.split(" ")[0]}!`);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (!executeRecaptcha) return;
      setGoogleLoading(true);
      try {
        const recaptchaToken = await executeRecaptcha("google_login");
        const { data } = await api.post("/api/auth/google", {
          idToken: tokenResponse.access_token,
          recaptchaToken,
        });
        if (data.requiresPhone) {
          toast.error("Please register with email to provide your phone number.");
          return;
        }
        setAuth(data.user, data.token);
        toast.success(`Welcome, ${data.user.fullName.split(" ")[0]}!`);
        router.push("/dashboard");
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Google sign-in failed.");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => toast.error("Google sign-in was cancelled."),
  });

  return (
    <div className="min-h-screen bg-[#090b10] bg-green-glow flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[rgba(0,230,118,0.12)] border border-[rgba(0,230,118,0.25)] mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00e676" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Auto-Link</h1>
          <p className="text-[rgba(232,234,240,0.5)] font-mono text-xs mt-1">Community coordination · Kenya</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold mb-6">Sign in</h2>

          <button
            onClick={() => googleLogin()}
            disabled={googleLoading}
            className="btn-ghost w-full py-3 flex items-center justify-center gap-3 mb-6 text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.2 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36.4 24 36.4c-5.2 0-9.5-2.7-11.3-6.7L6 34.3C9.3 39.7 16.1 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.3-2.4 4.3-4.4 5.7l6.2 5.2C40.5 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            {googleLoading ? "Signing in..." : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.07)]" />
            <span className="label">or</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.07)]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label block mb-2">Email</label>
              <input
                type="email" required
                className="w-full px-4 py-3 text-sm"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label block mb-2">Password</label>
              <input
                type="password" required
                className="w-full px-4 py-3 text-sm"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm mt-2">
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </form>
        </div>

        <p className="text-center text-[rgba(232,234,240,0.5)] text-xs mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-[#00e676] hover:underline font-bold">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}