import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

function setupMobileFullscreenAssist(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const mobileViewport = window.matchMedia('(max-width: 768px)').matches;
  const mobileAgent = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!mobileViewport && !mobileAgent) {
    return;
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isStandalone) {
    return;
  }

  const requestFullscreen = () => {
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    if (document.fullscreenElement) {
      return;
    }

    if (typeof root.requestFullscreen === 'function') {
      root.requestFullscreen().catch(() => undefined);
      return;
    }

    if (typeof root.webkitRequestFullscreen === 'function') {
      root.webkitRequestFullscreen();
    }
  };

  const onceOptions: AddEventListenerOptions = { once: true, passive: true };
  window.addEventListener('pointerdown', requestFullscreen, onceOptions);
  window.addEventListener('touchstart', requestFullscreen, onceOptions);
}

setupMobileFullscreenAssist();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
