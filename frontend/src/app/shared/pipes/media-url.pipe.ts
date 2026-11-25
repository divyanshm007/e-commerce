import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({ name: 'mediaUrl', standalone: true })
export class MediaUrlPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/')) return environment.mediaBaseUrl + url;
    return url;
  }
}
