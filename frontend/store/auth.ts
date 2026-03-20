import { create } from "zustand";

interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  hcode: string;
  isVerified: boolean;
  profilePicUrl?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,

  setAuth: (user, token) => {
    localStorage.setItem("al_token", token);
    localStorage.setItem("al_user", JSON.stringify(user));
    set({ user, token });
  },

  clearAuth: () => {
    localStorage.removeItem("al_token");
    localStorage.removeItem("al_user");
    set({ user: null, token: null });
  },

  loadFromStorage: () => {
    try {
      const token = localStorage.getItem("al_token");
      const raw = localStorage.getItem("al_user");
      if (token && raw) {
        set({ user: JSON.parse(raw), token });
      }
    } catch {
      localStorage.removeItem("al_token");
      localStorage.removeItem("al_user");
    }
  },
}));