"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function HomePage() {
  const router = useRouter();
  const { loadFromStorage, user } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (user) router.replace("/dashboard");
    else router.replace("/auth/login");
  }, [user]);

  return (
    <div className="min-h-screen bg-[#090b10] flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#00e676] border-t-transparent animate-spin" />
    </div>
  );
}