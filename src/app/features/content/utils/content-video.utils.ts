import type { MovieVideo } from '../data-access/content-api.service';

export function getVideoPlatformLabel(video: Pick<MovieVideo, 'url'>): string {
  try {
    const hostname = new URL(video.url).hostname.toLowerCase().replace(/^www\./, '');
    if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com') || hostname === 'youtu.be') return 'YouTube';
    if (hostname === 'vimeo.com' || hostname.endsWith('.vimeo.com')) return 'Vimeo';
    if (hostname === 'dailymotion.com' || hostname.endsWith('.dailymotion.com')) return 'Dailymotion';
    return hostname;
  } catch {
    return '';
  }
}
