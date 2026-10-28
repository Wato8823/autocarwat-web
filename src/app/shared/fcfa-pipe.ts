import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fcfa' })
export class FcfaPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '';
    // 25000 -> "25 000 FCFA" (espaces insécables)
    return value.toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, '\u00A0') + '\u00A0FCFA';
  }
}
