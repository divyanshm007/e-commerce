import { environment } from '../../../environments/environment';

/** Turns a site-relative upload path (/uploads/...) into a full URL on the media host; other URLs pass through. */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return url.startsWith('/uploads/') ? environment.mediaBaseUrl + url : url;
}
