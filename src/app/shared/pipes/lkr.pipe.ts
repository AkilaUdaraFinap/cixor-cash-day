import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'lkr', standalone: true })
export class LkrPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return 'LKR 0';
    const rounded = Math.round(value);
    return 'LKR ' + rounded.toLocaleString('en-LK');
  }
}
