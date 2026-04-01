import { Injectable, signal } from '@angular/core';

export type ThemePalette = 'finap-emerald' | 'finap-royal' | 'cashday-logo';
export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeKey = 'cashday.theme.palette';
  private readonly modeKey = 'cashday.theme.mode';

  palette = signal<ThemePalette>('finap-emerald');
  mode = signal<ThemeMode>('light');

  initialize(): void {
    const storedPalette = localStorage.getItem(this.themeKey) as ThemePalette | null;
    const storedMode = localStorage.getItem(this.modeKey) as ThemeMode | null;

    if (storedPalette === 'finap-emerald' || storedPalette === 'finap-royal' || storedPalette === 'cashday-logo') {
      this.palette.set(storedPalette);
    }

    if (storedMode === 'light' || storedMode === 'dark') {
      this.mode.set(storedMode);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.mode.set(prefersDark ? 'dark' : 'light');
    }

    this.apply();
  }

  setPalette(palette: ThemePalette): void {
    this.palette.set(palette);
    localStorage.setItem(this.themeKey, palette);
    this.apply();
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    localStorage.setItem(this.modeKey, mode);
    this.apply();
  }

  toggleMode(): void {
    this.setMode(this.mode() === 'light' ? 'dark' : 'light');
  }

  private apply(): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', this.palette());
    root.setAttribute('data-mode', this.mode());
  }
}
