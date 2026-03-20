"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function NewGroupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", hcode: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/api/groups", form);
      toast.success("Group created!");
      router.push(`/groups/${data.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] bg-green-glow flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard" className="text-[rgba(232,234,240,0.5)] hover:text-[#00e676] transition-colors text-sm">
            ← Back
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">Create Group</h1>
        </div>

        <div className="card p-8">
          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="label block mb-2">Group Name</label>
              <input
                type="text" required
                className="w-full px-4 py-3 text-sm"
                placeholder="e.g. Njagi's Crew"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label block mb-2">Handle (@username)</label>
              <input
                type="text" required
                className="w-full px-4 py-3 text-sm"
                placeholder="e.g. njagiscrew"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
              />
              <p className="text-[rgba(232,234,240,0.3)] text-xs font-mono mt-1">
                Share link: auto-link.co.ke/join/@{form.username || "handle"}
              </p>
            </div>
            <div>
              <label className="label block mb-2">Meeting Location Hcode (optional)</label>
              <input
                type="text"
                className="w-full px-4 py-3 text-sm"
                placeholder="e.g. LOC-420 — leave blank to auto-generate"
                value={form.hcode}
                onChange={(e) => setForm({ ...form, hcode: e.target.value })}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm mt-2">
              {loading ? "Creating..." : "Create Group →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}