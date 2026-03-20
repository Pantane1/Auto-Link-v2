"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "", username: "", email: "", phone: "", password: "", confirm: "",
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!executeRecaptcha) return;
    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha("register");
      const { data } = await api.post("/api/auth/register", {
        fullName: form.fullName,
        username: form.username.toLowerCase(),
        email: form.email,
        phone: form.phone,
        password: form.password,
        recaptchaToken,
      });
      setAuth(data.user, data.token);
      toast.success("Account created! Check your email for the verification code.");
      router.push("/auth/verify");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] bg-green-glow flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Auto-Link</h1>
          <p className="text-[rgba(232,234,240,0.5)] font-mono text-xs mt-1">Create your account</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            {[
              { label: "Full Name",       field: "fullName",  type: "text",     placeholder: "Jane Kamau" },
              { label: "Username",        field: "username",  type: "text",     placeholder: "janekamau" },
              { label: "Email",           field: "email",     type: "email",    placeholder: "jane@example.com" },
              { label: "Phone (M-Pesa)",  field: "phone",     type: "tel",      placeholder: "0712345678" },
              { label: "Password",        field: "password",  type: "password", placeholder: "Min. 8 characters" },
              { label: "Confirm Password",field: "confirm",   type: "password", placeholder: "••••••••" },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="label block mb-2">{label}</label>
                <input
                  type={type} required
                  className="w-full px-4 py-3 text-sm"
                  placeholder={placeholder}
                  value={form[field as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              </div>
            ))}
            <p className="text-[rgba(232,234,240,0.3)] text-xs font-mono pt-1">
              Your phone number is used for M-Pesa STK Push payments.
            </p>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm mt-2">
              {loading ? "Creating account..." : "Create Account →"}
            </button>
          </form>
        </div>

        <p className="text-center text-[rgba(232,234,240,0.5)] text-xs mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[#00e676] hover:underline font-bold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}