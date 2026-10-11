/** Parse standard Twitch Clip/VOD URLs without trusting arbitrary iframe markup. */
export type TwitchMedia = { type: 'clip' | 'vod'; id: string };
export function parseTwitchMedia(value?: string): TwitchMedia | null {
  if (!value) return null;
  let u: URL;
  try { u = new URL(value.trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase();
  const pieces = u.pathname.split('/').filter(Boolean);
  let slug: string | null = null;
  if (host === 'clips.twitch.tv') {
    slug = pieces[0] === 'embed' ? u.searchParams.get('clip') : (pieces.length === 1 ? pieces[0] : null);
  } else if (host === 'www.twitch.tv' || host === 'twitch.tv' || host === 'm.twitch.tv') {
    if (pieces[0] === 'videos' && /^\d+$/.test(pieces[1] || '')) return {type:'vod',id:pieces[1]};
    if (pieces.length === 3 && pieces[1] === 'clip') slug = pieces[2];
  } else if (host === 'player.twitch.tv') {
    const vid = u.searchParams.get('video') || '';
    if (/^v?\d+$/.test(vid) && vid) return {type:'vod',id:vid.replace(/^v/,'')};
  }
  if (slug && /^[A-Za-z0-9_-]{4,160}$/.test(slug)) return {type:'clip',id:slug};
  return null;
}
