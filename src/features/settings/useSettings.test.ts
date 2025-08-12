import { beforeEach, expect, test } from 'vitest';
import { useSettingsStore } from './useSettings';

beforeEach(() => {
  useSettingsStore.setState({ theme: 'light', autoplay: true });
  localStorage.clear();
});

test('updates and persists preferences', () => {
  const { setTheme, setAutoplay } = useSettingsStore.getState();
  setTheme('dark');
  setAutoplay(false);
  expect(useSettingsStore.getState()).toMatchObject({
    theme: 'dark',
    autoplay: false,
  });
});
