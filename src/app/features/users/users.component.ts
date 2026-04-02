import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppUser, UserRole, UserStatus } from '../../shared/models/models';
import { MockDataService } from '../../core/services/mock-data.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-header flex items-center justify-between mb-6">
      <div>
        <h2>Team</h2>
        <div class="text-muted text-sm mt-1">Manage tenant-scoped access for Admin, Finance, and Sales users.</div>
      </div>
      <button class="btn btn-primary" type="button" (click)="openInvite()">Invite User</button>
    </div>

    <div class="card mb-6">
      <h3 class="section-title">Role Permissions</h3>
      <div class="desktop-table-only">
        <div class="table-wrap">
          <table class="data-table permissions-table">
            <thead>
              <tr><th>Role</th><th>Dashboard</th><th>Invoices</th><th>Customers</th><th>Users</th><th>Settings</th></tr>
            </thead>
            <tbody>
              <tr><td><span class="badge badge-admin">Admin</span></td><td>Full</td><td>Full</td><td>Full</td><td>Full</td><td>Full</td></tr>
              <tr><td><span class="badge badge-finance">Finance</span></td><td>Full</td><td>Full</td><td>View only</td><td>No</td><td>No</td></tr>
              <tr><td><span class="badge badge-sales">Sales</span></td><td>View</td><td>Create / Edit</td><td>Full</td><td>No</td><td>No</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mobile-cards-only">
        <div class="mobile-data-list">
          <div class="mobile-data-card">
            <div class="mobile-data-card-header">
              <div class="mobile-data-card-title"><span class="badge badge-admin">Admin</span></div>
            </div>
            <div class="mobile-data-grid">
              <div class="mobile-data-row"><span class="mobile-data-label">Dashboard</span><span class="mobile-data-value">Full</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Invoices</span><span class="mobile-data-value">Full</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Customers</span><span class="mobile-data-value">Full</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Users</span><span class="mobile-data-value">Full</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Settings</span><span class="mobile-data-value">Full</span></div>
            </div>
          </div>

          <div class="mobile-data-card">
            <div class="mobile-data-card-header">
              <div class="mobile-data-card-title"><span class="badge badge-finance">Finance</span></div>
            </div>
            <div class="mobile-data-grid">
              <div class="mobile-data-row"><span class="mobile-data-label">Dashboard</span><span class="mobile-data-value">Full</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Invoices</span><span class="mobile-data-value">Full</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Customers</span><span class="mobile-data-value">View only</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Users</span><span class="mobile-data-value">No</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Settings</span><span class="mobile-data-value">No</span></div>
            </div>
          </div>

          <div class="mobile-data-card">
            <div class="mobile-data-card-header">
              <div class="mobile-data-card-title"><span class="badge badge-sales">Sales</span></div>
            </div>
            <div class="mobile-data-grid">
              <div class="mobile-data-row"><span class="mobile-data-label">Dashboard</span><span class="mobile-data-value">View</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Invoices</span><span class="mobile-data-value">Create / Edit</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Customers</span><span class="mobile-data-value">Full</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Users</span><span class="mobile-data-value">No</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Settings</span><span class="mobile-data-value">No</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card card-flush">
      <div class="desktop-table-only">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of pagedUsers()">
                <td>
                  <div class="flex items-center gap-2">
                    <div class="avatar-sm">{{ initials(user.name) }}</div>
                    <div>
                      <div class="font-medium">{{ user.name }}</div>
                      <div class="text-muted text-sm">Tenant user</div>
                    </div>
                  </div>
                </td>
                <td>{{ user.email }}</td>
                <td><span class="badge" [ngClass]="roleBadge(user.role)">{{ user.role }}</span></td>
                <td><span class="badge" [ngClass]="statusBadge(user.status)">{{ user.status }}</span></td>
                <td>{{ user.lastActive || '—' }}</td>
                <td class="row-actions">
                  <button class="btn btn-ghost btn-sm" type="button" (click)="changeRole(user)">Edit Role</button>
                  <button class="btn btn-ghost btn-sm text-red" *ngIf="user.id !== currentUserId" type="button" (click)="requestStatusChange(user)">
                    {{ user.status === 'Suspended' ? 'Activate' : 'Suspend' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mobile-cards-only p-4" *ngIf="users().length">
        <div class="mobile-data-list">
          <div class="mobile-data-card" *ngFor="let user of pagedUsers()">
            <div class="mobile-data-card-header">
              <div class="flex items-center gap-2">
                <div class="avatar-sm">{{ initials(user.name) }}</div>
                <div>
                  <div class="mobile-data-card-title">{{ user.name }}</div>
                  <div class="mobile-data-card-subtitle">Tenant user</div>
                </div>
              </div>
              <span class="badge" [ngClass]="statusBadge(user.status)">{{ user.status }}</span>
            </div>
            <div class="mobile-data-grid">
              <div class="mobile-data-row"><span class="mobile-data-label">Email</span><span class="mobile-data-value">{{ user.email }}</span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Role</span><span class="mobile-data-value"><span class="badge" [ngClass]="roleBadge(user.role)">{{ user.role }}</span></span></div>
              <div class="mobile-data-row"><span class="mobile-data-label">Last Login</span><span class="mobile-data-value">{{ user.lastActive || '—' }}</span></div>
            </div>
            <div class="mobile-data-actions">
              <button class="btn btn-ghost btn-sm" type="button" (click)="changeRole(user)">Edit Role</button>
              <button class="btn btn-ghost btn-sm text-red" *ngIf="user.id !== currentUserId" type="button" (click)="requestStatusChange(user)">
                {{ user.status === 'Suspended' ? 'Activate' : 'Suspend' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!users().length" class="p-8 text-center text-muted text-sm">No users found.</div>

      <div class="pagination-bar" *ngIf="users().length > 0 && totalPages() > 1">
        <div class="pagination-info">Showing {{ pageStart() }}-{{ pageEnd() }} of {{ users().length }}</div>
        <div class="pagination-controls">
          <button class="btn btn-secondary btn-sm" type="button" [disabled]="currentPage() === 1" (click)="setPage(currentPage() - 1)">Previous</button>
          <span class="pagination-page">Page {{ currentPage() }} / {{ totalPages() }}</span>
          <button class="btn btn-secondary btn-sm" type="button" [disabled]="currentPage() === totalPages()" (click)="setPage(currentPage() + 1)">Next</button>
        </div>
      </div>
    </div>

    <ng-container *ngIf="inviteOpen()">
      <div class="overlay" (click.self)="inviteOpen.set(false)" (keydown.escape)="inviteOpen.set(false)" tabindex="-1">
        <div class="modal" style="max-width:420px" role="dialog" aria-modal="true" aria-labelledby="invite-user-title">
          <div class="modal-header">
            <h3 id="invite-user-title">Invite User</h3>
            <button class="btn btn-ghost btn-sm" type="button" (click)="inviteOpen.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-4">
              <label class="form-label">Email Address <span class="required">*</span></label>
              <input class="form-control" type="email" [(ngModel)]="invite.email" placeholder="name@company.com"/>
            </div>
            <div class="form-group mb-4">
              <label class="form-label">Full Name <span class="required">*</span></label>
              <input class="form-control" [(ngModel)]="invite.name" placeholder="Full name"/>
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Role <span class="required">*</span></label>
              <select class="form-control" [(ngModel)]="invite.role">
                <option *ngFor="let role of roles" [value]="role">{{ role }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" type="button" (click)="inviteOpen.set(false)">Cancel</button>
            <button class="btn btn-primary" type="button" (click)="sendInvite()">Send Invitation</button>
          </div>
        </div>
      </div>
    </ng-container>

    <ng-container *ngIf="roleEditorOpen() && editingUser() as user">
      <div class="overlay" (click.self)="roleEditorOpen.set(false)" (keydown.escape)="roleEditorOpen.set(false)" tabindex="-1">
        <div class="modal" style="max-width:380px" role="dialog" aria-modal="true" aria-labelledby="edit-role-title">
          <div class="modal-header">
            <h3 id="edit-role-title">Edit Role</h3>
            <button class="btn btn-ghost btn-sm" type="button" (click)="roleEditorOpen.set(false)">✕</button>
          </div>
          <div class="modal-body">
            <div class="text-sm text-muted mb-3">Update access for {{ user.name }}.</div>
            <div class="form-group mb-0">
              <label class="form-label">Role</label>
              <select class="form-control" [(ngModel)]="newRole">
                <option *ngFor="let role of roles" [value]="role">{{ role }}</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" type="button" (click)="roleEditorOpen.set(false)">Cancel</button>
            <button class="btn btn-primary" type="button" (click)="saveRole()">Save</button>
          </div>
        </div>
      </div>
    </ng-container>

    <ng-container *ngIf="pendingStatusChange() as pending">
      <div class="overlay" (click.self)="pendingStatusChange.set(null)" (keydown.escape)="pendingStatusChange.set(null)" tabindex="-1">
        <div class="modal" style="max-width:420px" role="dialog" aria-modal="true" aria-labelledby="status-change-title">
          <div class="modal-header">
            <h3 id="status-change-title">Confirm Status Change</h3>
            <button class="btn btn-ghost btn-sm" type="button" (click)="pendingStatusChange.set(null)" aria-label="Close dialog">✕</button>
          </div>
          <div class="modal-body">
            <div class="text-sm">{{ pending.user.name }} will be {{ pending.nextStatus === 'Active' ? 'activated' : 'suspended' }}.</div>
            <div class="text-muted text-sm mt-2" *ngIf="pending.nextStatus === 'Suspended'">Suspended users cannot access CashDay until reactivated.</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" type="button" (click)="pendingStatusChange.set(null)">Cancel</button>
            <button class="btn btn-primary" type="button" (click)="confirmStatusChange()">Confirm</button>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .section-title { font-size:12px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.06em; margin-bottom:12px; }
    .avatar-sm { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--brand); color:#fff; font-size:12px; font-weight:700; }
    .permissions-table td { font-size:13px; }
  `],
})
export class UsersComponent implements OnInit {
  private readonly svc = inject(MockDataService);
  private readonly toast = inject(ToastService);

  users = signal<AppUser[]>([]);
  readonly pageSize = 8;
  page = signal(1);
  inviteOpen = signal(false);
  roleEditorOpen = signal(false);
  editingUser = signal<AppUser | null>(null);
  pendingStatusChange = signal<{ user: AppUser; nextStatus: UserStatus } | null>(null);
  currentUserId = 'u1';
  newRole: UserRole = 'Finance';
  roles: UserRole[] = ['Admin', 'Finance', 'Sales'];
  invite: { name: string; email: string; role: UserRole } = { name: '', email: '', role: 'Finance' };

  ngOnInit(): void {
    this.load();
  }

  initials(name: string): string {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  }

  roleBadge(role: UserRole): string {
    return { Admin: 'badge-admin', Finance: 'badge-finance', Sales: 'badge-sales' }[role];
  }

  statusBadge(status: UserStatus): string {
    return { Active: 'badge-active', Invited: 'badge-invited', Suspended: 'badge-suspended' }[status];
  }

  openInvite(): void {
    this.invite = { name: '', email: '', role: 'Finance' };
    this.inviteOpen.set(true);
  }

  sendInvite(): void {
    if (!this.invite.name.trim() || !this.invite.email.trim()) {
      this.toast.error('Name and email are required.');
      return;
    }
    this.svc.saveUser({
      id: '',
      name: this.invite.name.trim(),
      email: this.invite.email.trim(),
      role: this.invite.role,
      status: 'Invited',
      isActive: false,
      lastActive: 'Invitation Pending',
    }).subscribe(() => {
      this.toast.success(`Invitation sent to ${this.invite.email}.`);
      this.inviteOpen.set(false);
      this.load();
    });
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.users().length / this.pageSize));
  }

  currentPage(): number {
    return Math.min(this.page(), this.totalPages());
  }

  pagedUsers(): AppUser[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.users().slice(start, start + this.pageSize);
  }

  setPage(nextPage: number): void {
    this.page.set(Math.min(Math.max(1, nextPage), this.totalPages()));
  }

  pageStart(): number {
    return (this.currentPage() - 1) * this.pageSize + 1;
  }

  pageEnd(): number {
    return Math.min(this.currentPage() * this.pageSize, this.users().length);
  }

  changeRole(user: AppUser): void {
    this.editingUser.set(user);
    this.newRole = user.role;
    this.roleEditorOpen.set(true);
  }

  saveRole(): void {
    const user = this.editingUser();
    if (!user) return;
    this.svc.saveUser({ ...user, role: this.newRole }).subscribe(() => {
      this.toast.success(`Role updated to ${this.newRole}.`);
      this.roleEditorOpen.set(false);
      this.load();
    });
  }

  requestStatusChange(user: AppUser): void {
    const nextStatus: UserStatus = user.status === 'Suspended' ? 'Active' : 'Suspended';
    this.pendingStatusChange.set({ user, nextStatus });
  }

  confirmStatusChange(): void {
    const pending = this.pendingStatusChange();
    if (!pending) return;
    this.pendingStatusChange.set(null);
    const { user, nextStatus } = pending;
    this.svc.saveUser({ ...user, status: nextStatus, isActive: nextStatus === 'Active' }).subscribe(() => {
      this.toast.info(`${user.name} is now ${nextStatus.toLowerCase()}.`);
      this.load();
    });
  }

  private load(): void {
    this.svc.getUsers().subscribe(users => {
      this.users.set(users);
      this.page.set(1);
    });
  }
}
