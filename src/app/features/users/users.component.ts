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

    <div class="card card-flush">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users()">
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
                <button class="btn btn-ghost btn-sm text-red" *ngIf="user.id !== currentUserId" type="button" (click)="toggleStatus(user)">
                  {{ user.status === 'Suspended' ? 'Activate' : 'Suspend' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ng-container *ngIf="inviteOpen()">
      <div class="overlay">
        <div class="modal" style="max-width:420px">
          <div class="modal-header">
            <h3>Invite User</h3>
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
      <div class="overlay">
        <div class="modal" style="max-width:360px">
          <div class="modal-header">
            <h3>Edit Role</h3>
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
  inviteOpen = signal(false);
  roleEditorOpen = signal(false);
  editingUser = signal<AppUser | null>(null);
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

  toggleStatus(user: AppUser): void {
    const nextStatus: UserStatus = user.status === 'Suspended' ? 'Active' : 'Suspended';
    this.svc.saveUser({ ...user, status: nextStatus, isActive: nextStatus === 'Active' }).subscribe(() => {
      this.toast.info(`${user.name} is now ${nextStatus.toLowerCase()}.`);
      this.load();
    });
  }

  private load(): void {
    this.svc.getUsers().subscribe(users => this.users.set(users));
  }
}
