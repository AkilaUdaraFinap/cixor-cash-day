import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="splash" *ngIf="showSplash()" aria-label="CashDay loading screen">
      <img class="splash-logo" src="/cashday-logo.png" alt="CashDay logo"/>
      <div class="splash-title">CashDay</div>
      <div class="splash-subtitle">Launching SME Financial Co-Pilot</div>
    </div>

    <router-outlet></router-outlet>
  `,
  styles: [`
    .splash {
      position: fixed;
      inset: 0;
      z-index: 5000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      background: radial-gradient(80% 70% at 50% 35%, #3f256f 0%, #241143 56%, #140b2b 100%);
      color: #f5deb3;
    }
    .splash-logo {
      width: clamp(96px, 16vw, 164px);
      height: clamp(96px, 16vw, 164px);
      border-radius: 26px;
      object-fit: cover;
      filter: saturate(1.2) brightness(1.1) contrast(1.06);
      clip-path: inset(6px round 22px);
      transform: scale(1.1);
      transform-origin: center;
      box-shadow:
        0 0 0 2px rgba(240, 207, 134, .38),
        0 0 30px rgba(240, 207, 134, .32),
        0 0 56px rgba(101, 62, 178, .5);
      animation: pulseIn .45s ease-out;
    }
    .splash-title {
      font-size: clamp(24px, 3.2vw, 34px);
      font-weight: 700;
      letter-spacing: .02em;
      color: #f0cf86;
    }
    .splash-subtitle {
      font-size: clamp(12px, 1.3vw, 14px);
      color: rgba(255,255,255,.78);
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    @keyframes pulseIn {
      from { transform: scale(.88); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `]
})
export class App implements OnInit {
  showSplash = signal(true);

  ngOnInit(): void {
    setTimeout(() => this.showSplash.set(false), 1100);
  }
}
