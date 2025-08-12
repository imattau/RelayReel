import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

/**
 * Shape of the settings store returned by {@link useSettings}.
 */
export interface SettingsState {
  /** Preferred color theme */
  theme: Theme;
  /** Whether videos should start playing automatically */
  autoplay: boolean;
  /** Persist a new theme choice */
  setTheme: (theme: Theme) => void;
  /** Persist autoplay preference */
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

/**
 * Access persisted user preferences for theming and playback.
 *
 * @returns {SettingsState} Current settings state and actions.
 */
export default function useSettings(): SettingsState {
  return useSettingsStore();
}
