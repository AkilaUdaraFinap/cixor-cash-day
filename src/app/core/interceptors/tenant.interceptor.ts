import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const companyId = auth.tenantCompanyId();

  if (!companyId || req.url.includes('/acceptance/portal')) {
    return next(req);
  }

  return next(req.clone({
    setHeaders: {
      'X-Company-Id': companyId,
    },
  }));
};
