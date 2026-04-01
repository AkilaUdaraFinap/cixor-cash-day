import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'numberToWords', standalone: true })
export class NumberToWordsPipe implements PipeTransform {
  private ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
    'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  private tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  transform(value: number): string {
    if (!value || value === 0) return 'Zero Rupees';
    const n = Math.round(Math.abs(value));
    return this.convert(n) + ' Rupees';
  }

  private convert(n: number): string {
    if (n === 0) return '';
    if (n < 20) return this.ones[n];
    if (n < 100) return this.tens[Math.floor(n/10)] + (n%10 ? ' ' + this.ones[n%10] : '');
    if (n < 1000) return this.ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + this.convert(n%100) : '');
    if (n < 100000) return this.convert(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + this.convert(n%1000) : '');
    if (n < 10000000) return this.convert(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + this.convert(n%100000) : '');
    return this.convert(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + this.convert(n%10000000) : '');
  }
}
