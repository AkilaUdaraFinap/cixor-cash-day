import { DOCUMENT } from '@angular/common';
import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import flatpickr from 'flatpickr';
import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';

@Injectable({ providedIn: 'root' })
export class DatepickerService implements OnDestroy {
  private document = inject(DOCUMENT);
  private zone = inject(NgZone);

  private initialized = false;
  private instances = new Map<HTMLInputElement, FlatpickrInstance>();
  private domObserver?: MutationObserver;
  private themeObserver?: MutationObserver;

  initialize(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.scanAndAttach();
    this.observeDomChanges();
    this.observeThemeChanges();
  }

  ngOnDestroy(): void {
    this.domObserver?.disconnect();
    this.themeObserver?.disconnect();
    this.instances.forEach(instance => instance.destroy());
    this.instances.clear();
  }

  private scanAndAttach(): void {
    const inputs = Array.from(
      this.document.querySelectorAll<HTMLInputElement>('input.form-control[type="date"]:not([data-cd-datepicker])')
    );

    for (const input of inputs) {
      this.attach(input);
    }
  }

  private attach(input: HTMLInputElement): void {
    if (this.instances.has(input)) return;

    const initialValue = input.value;
    input.dataset['cdDatepicker'] = 'true';
    input.classList.add('cd-date-input');
    input.type = 'text';
    input.autocomplete = 'off';

    const instance = flatpickr(input, {
      dateFormat: 'Y-m-d',
      altInput: true,
      altInputClass: 'form-control cd-date-input',
      altFormat: 'm/d/Y',
      disableMobile: true,
      animate: true,
      monthSelectorType: 'dropdown',
      parseDate: (dateStr, format) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return flatpickr.parseDate(dateStr, 'Y-m-d') ?? new Date(dateStr);
        }
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          return flatpickr.parseDate(dateStr, 'm/d/Y') ?? new Date(dateStr);
        }
        return flatpickr.parseDate(dateStr, format) ?? new Date(dateStr);
      },
      onReady: (_, __, fp) => {
        this.applyTheme(fp);
        this.emitInputEvents(input);
      },
      onOpen: (_, __, fp) => {
        this.syncFromModel(input, fp);
        this.applyTheme(fp);
      },
      onValueUpdate: () => {
        this.emitInputEvents(input);
      },
      onChange: () => {
        this.emitInputEvents(input);
      },
    });

    if (initialValue) {
      instance.setDate(initialValue, false, 'Y-m-d');
    }

    this.instances.set(input, instance as FlatpickrInstance);
  }

  private syncFromModel(input: HTMLInputElement, fp: FlatpickrInstance): void {
    if (!input.value) return;
    fp.setDate(input.value, false);
  }

  private emitInputEvents(input: HTMLInputElement): void {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private observeDomChanges(): void {
    this.zone.runOutsideAngular(() => {
      this.domObserver = new MutationObserver(() => this.scanAndAttach());
      this.domObserver.observe(this.document.body, { childList: true, subtree: true });
    });
  }

  private observeThemeChanges(): void {
    this.zone.runOutsideAngular(() => {
      this.themeObserver = new MutationObserver(() => this.refreshThemes());
      this.themeObserver.observe(this.document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'data-mode'],
      });
    });
  }

  private refreshThemes(): void {
    for (const instance of this.instances.values()) {
      this.applyTheme(instance);
    }
  }

  private applyTheme(instance: FlatpickrInstance): void {
    const root = this.document.documentElement;
    const mode = root.getAttribute('data-mode') || 'light';
    const theme = root.getAttribute('data-theme') || 'finap-emerald';
    const container = instance.calendarContainer;

    container.classList.add('cd-flatpickr');
    container.classList.remove(
      'cd-theme-light',
      'cd-theme-dark',
      'cd-theme-finap-emerald',
      'cd-theme-finap-royal',
      'cd-theme-cashday-logo'
    );
    container.classList.add(`cd-theme-${mode}`, `cd-theme-${theme}`);
  }
}
