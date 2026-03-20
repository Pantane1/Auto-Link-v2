"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";

interface Stats { attended: number; missed: number; groupCount: number; pendingInvites: number; }
interface Invite {
  id: string; paymentStatus: string;
  event: { id: string; title: string; amountPerMember: number; meetingDateTime: string; creator: { fullName: string }; group: { name: string } };
}
interface Group {
  groupId: string; role: string;
  group: { id: string; name: string; username: string; hcode: string; _count: { members: number; events: number } };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, clearAuth, loadFromStorage } = useAuthStore();
  const [stats, setStats]     = useState<Stats | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [groups, setGroups]   = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFromStorage(); }, []);

  useEffect(() => {
    if (!user) { router.push("/auth/login"); return; }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    try {
      const [statsRes, invitesRes, groupsRes] = await Promise.all([
        api.get("/api/users/me/stats"),
        api.get("/api/users/me/invites"),
        api.get("/api/groups/mine"),
      ]);
      setStats(statsRes.data.data);
      setInvites(invitesRes.data.data);
      setGroups(groupsRes.data.data);
    } catch { toast.error("Failed to load dashboard."); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { clearAuth(); router.push("/auth/login"); };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-[#090b10] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#00e676] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090b10]">
      <nav className="border-b border-[rgba(255,255,255,0.07)] sticky top-0 z-50 bg-[rgba(9,11,16,0.8)] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-xl font-extrabold tracking-tight">Auto-Link</span>
          <div className="flex items-center gap-4">
            <span className="hidden md:block font-mono text-xs text-[#00e676]">{user.hcode}</span>
            {!user.isVerified && (
              <Link href="/auth/verify" className="text-xs font-mono text-[#f59e0b] hover:underline">
                Verify email
              </Link>
            )}
            <button onClick={handleLogout} className="btn-ghost px-4 py-2 text-xs">Sign out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8 pb-20">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Hey, {user.fullName.split(" ")[0]} 👋
          </h1>
          <p className="text-[rgba(232,234,240,0.5)] text-sm mt-1 font-mono">
            Your identity: <span className="text-[#00e676]">{user.hcode}</span>
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Attended",        value: stats.attended,       color: "text-[#00e676]" },
              { label: "Missed",          value: stats.missed,         color: "text-[#ff4d6d]" },
              { label: "My Groups",       value: stats.groupCount,     color: "text-blue-400" },
              { label: "Pending Invites", value: stats.pendingInvites, color: "text-[#f59e0b]" },
            ].map((s) => (
              <div key={s.label} className="card p-5">
                <p className="label mb-1">{s.label}</p>
                <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">My Groups</h2>
              <Link href="/groups/new" className="btn-primary px-4 py-2 text-xs">+ New Group</Link>
            </div>
            {groups.length === 0 ? (
              <div className="card p-12 text-center border-dashed">
                <p className="text-[rgba(232,234,240,0.5)] text-sm">No groups yet.</p>
                <Link href="/groups/new" className="text-[#00e676] text-xs font-bold mt-2 hover:underline block">
                  Create your first group →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map(({ group, role }) => (
                  <Link key={group.id} href={`/groups/${group.id}`} className="card card-hover p-5 block">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-[rgba(0,230,118,0.12)] border border-[rgba(0,230,118,0.25)] flex items-center justify-center font-bold text-[#00e676]">
                        {group.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{group.name}</p>
                        <p className="font-mono text-xs text-[rgba(232,234,240,0.5)]">@{group.username}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="hcode">{group.hcode}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[rgba(232,234,240,0.5)] font-mono">{group._count?.members ?? 0} members</span>
                        {role === "ADMIN" && <span className="badge-paid">Admin</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold">Pending Invites</h2>
            <div className="card overflow-hidden">
              {invites.length === 0 ? (
                <div className="p-8 text-center text-[rgba(232,234,240,0.5)] text-sm italic">No active invites.</div>
              ) : invites.map((inv) => (
                <Link key={inv.id} href={`/events/${inv.event?.id}`}
                  className="block p-4 border-b border-[rgba(255,255,255,0.07)] last:border-0 hover:bg-[#13161f] transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold text-sm truncate pr-2">{inv.event?.title}</p>
                    <span className={inv.paymentStatus === "PAID" ? "badge-paid" : "badge-pending"}>
                      {inv.paymentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-[rgba(232,234,240,0.5)] font-mono">{inv.event?.group?.name}</p>
                  <p className="text-xs font-bold text-[#00e676] mt-1">KES {inv.event?.amountPerMember}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}