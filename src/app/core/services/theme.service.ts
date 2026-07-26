import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'pm_theme';
const DARK_CLASS = 'dark-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly systemPrefersDark = signal(this.media.matches);

  readonly mode = signal<ThemeMode>(this.readStoredMode());

  readonly isDark = computed(() => {
    const mode = this.mode();
    return mode === 'system' ? this.systemPrefersDark() : mode === 'dark';
  });

  constructor() {
    this.media.addEventListener('change', (event) => this.systemPrefersDark.set(event.matches));

    effect(() => {
      document.documentElement.classList.toggle(DARK_CLASS, this.isDark());
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    localStorage.setItem(THEME_KEY, mode);
  }

  /** Cycles light -> dark -> system -> light, used by the single header toggle button. */
  cycle(): void {
    const next: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };
    this.setMode(next[this.mode()]);
  }

  private readStoredMode(): ThemeMode {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }
}
