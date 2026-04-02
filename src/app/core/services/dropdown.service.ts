import { DOCUMENT } from '@angular/common';
import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import Choices from 'choices.js';

@Injectable({ providedIn: 'root' })
export class DropdownService implements OnDestroy {
  private document = inject(DOCUMENT);
  private zone = inject(NgZone);

  private initialized = false;
  private domObserver?: MutationObserver;
  private themeObserver?: MutationObserver;
  private instances = new Map<HTMLSelectElement, Choices>();
  private signatures = new Map<HTMLSelectElement, string>();

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

    for (const instance of this.instances.values()) {
      instance.destroy();
    }

    this.instances.clear();
    this.signatures.clear();
  }

  private scanAndAttach(): void {
    const selects = Array.from(
      this.document.querySelectorAll<HTMLSelectElement>(
        'select.form-control:not([multiple]):not([data-cd-native-select])'
      )
    );

    for (const select of selects) {
      const signature = this.getSignature(select);
      const existing = this.instances.get(select);

      if (existing) {
        if (this.signatures.get(select) !== signature) {
          existing.destroy();
          this.instances.delete(select);
          this.signatures.delete(select);
        } else {
          this.applyTheme(select);
          continue;
        }
      }

      this.attach(select);
      this.signatures.set(select, signature);
    }
  }

  private attach(select: HTMLSelectElement): void {
    const instance = new Choices(select, {
      shouldSort: false,
      searchEnabled: false,
      itemSelectText: '',
      allowHTML: false,
      placeholder: true,
      placeholderValue: select.getAttribute('placeholder') || undefined,
    });

    this.instances.set(select, instance);
    this.applyTheme(select);

    select.addEventListener('change', () => {
      const current = this.instances.get(select);
      if (!current) return;
      const value = select.value;
      if (value) {
        current.setChoiceByValue(value);
      }
    });
  }

  private applyTheme(select: HTMLSelectElement): void {
    const root = this.document.documentElement;
    const mode = root.getAttribute('data-mode') || 'light';
    const palette = root.getAttribute('data-theme') || 'finap-emerald';
    const wrapper = select.closest('.choices');

    if (!wrapper) return;

    wrapper.classList.add('cd-choices');
    wrapper.classList.remove(
      'cd-theme-light',
      'cd-theme-dark',
      'cd-theme-finap-emerald',
      'cd-theme-finap-royal',
      'cd-theme-cashday-logo'
    );

    wrapper.classList.add(`cd-theme-${mode}`, `cd-theme-${palette}`);
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
    for (const select of this.instances.keys()) {
      this.applyTheme(select);
    }
  }

  private getSignature(select: HTMLSelectElement): string {
    const optionSignature = Array.from(select.options)
      .map(option => `${option.value}:${option.text}:${option.disabled}`)
      .join('|');

    return `${optionSignature}::${select.value}`;
  }
}
