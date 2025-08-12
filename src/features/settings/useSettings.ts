import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface SettingsState {
  theme: Theme;
  autoplay: boolean;
  setTheme: (theme: Theme) => void;
  setAutoplay: (autoplay: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      autoplay: true,
      setTheme: (theme) => set({ theme }),
      setAutoplay: (autoplay) => set({ autoplay }),
    }),
    { name: 'settings' }
  )
);

export default function useSettings() {
  return useSettingsStore();
}
