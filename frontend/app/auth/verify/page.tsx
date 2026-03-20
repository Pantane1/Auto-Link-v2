"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function VerifyPage() {
  const router = useRouter();
  const { user, setAuth, token } = useAuthStore();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/auth/verify-email", { email: user?.email, code });
      if (user && token) setAuth({ ...user, isVerified: true }, token);
      toast.success("Email verified! Welcome to Auto-Link.");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/api/auth/resend-verification", { email: user?.email });
      toast.success("New code sent to your email.");
    } catch {
      toast.error("Failed to resend.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] bg-green-glow flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="card p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(0,230,118,0.12)] border border-[rgba(0,230,118,0.25)] flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00e676" strokeWidth="2" strokeLinecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="text-[rgba(232,234,240,0.5)] text-sm mb-8">
            We sent a 6-digit code to<br />
            <span className="text-[#e8eaf0] font-mono">{user?.email}</span>
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text" required maxLength={6}
              className="w-full px-4 py-4 text-center text-2xl font-mono tracking-[0.5em]"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn-primary w-full py-3 text-sm"
            >
              {loading ? "Verifying..." : "Verify Email →"}
            </button>
          </form>

          <button
            onClick={handleResend}
            disabled={resending}
            className="text-[rgba(232,234,240,0.5)] text-xs font-mono mt-6 hover:text-[#00e676] transition-colors block mx-auto"
          >
            {resending ? "Sending..." : "Didn't get it? Resend code"}
          </button>
        </div>
      </div>
    </div>
  );
}