import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar.component';
import { TopbarComponent } from './shared/components/topbar.component';
import { ToastHostComponent } from './shared/components/toast-host.component';
import { ThemeService } from './core/services/theme.service';
import { DatepickerService } from './core/services/datepicker.service';
import { DropdownService } from './core/services/dropdown.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, ToastHostComponent],
  template: `
    <div class="app-shell">
      <app-sidebar></app-sidebar>
      <div class="app-main">
        <app-topbar></app-topbar>
        <main class="app-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
    <app-toast-host></app-toast-host>
  `,
  styles: [`
    .app-shell  { display: flex; height: 100vh; overflow: hidden; }
    .app-main   { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
    .app-content { flex: 1; overflow-y: auto; padding: 24px; background: var(--bg); position: relative; }

    @media (max-width: 768px) {
      .app-shell { display: block; height: 100dvh; }
      .app-main { height: 100dvh; }
      .app-content { padding: 14px 14px calc(86px + env(safe-area-inset-bottom)); }
    }
  `]
})
export class AppShellComponent implements OnInit {
  private theme = inject(ThemeService);
  private datepicker = inject(DatepickerService);
  private dropdown = inject(DropdownService);

  ngOnInit(): void {
    this.theme.initialize();
    this.datepicker.initialize();
    this.dropdown.initialize();
  }
}
