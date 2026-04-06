import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MockDataService } from './mock-data.service';
import { AppUser } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class UserDataService {
  private readonly mock = inject(MockDataService);

  getUsers(): Observable<AppUser[]> { return this.mock.getUsers(); }
  saveUser(user: AppUser): Observable<AppUser> { return this.mock.saveUser(user); }
}
