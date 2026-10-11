#!/usr/bin/env python3
"""Read-only CMS -> Discord announcement synchronizer. No site checkout, no bot token."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.request

import yaml

ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = ROOT / '.discord-sync' / 'state.json'
DESTINATIONS = {
    'The Haunted Library — Announcements': ('haunted-library', 'DISCORD_WEBHOOK_HAUNTED_LIBRARY'),
    'The Haunted Library — #stream-schedule': ('haunted-library', 'DISCORD_WEBHOOK_HAUNTED_LIBRARY'),
    'Magnificent Bastages — Events': ('magnificent-bastages', 'DISCORD_WEBHOOK_MAGNIFICENT_BASTAGES'),
}


def request(url, method, payload):
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=body, method=method,
                                 headers={'Content-Type': 'application/json', 'User-Agent': 'ErikTheWriterScheduleSync/1.0'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                raw = response.read().decode('utf-8')
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as err:
            detail = err.read().decode('utf-8', errors='replace')
            if err.code == 429 and attempt < 3:
                try:
                    wait = float(json.loads(detail).get('retry_after', 2))
                except (ValueError, TypeError):
                    wait = 2
                time.sleep(min(max(wait, 1), 30))
                continue
            raise RuntimeError(f'Discord HTTP {err.code}: {detail[:300]}') from None
    raise RuntimeError('Discord retry exhausted')


def entries():
    for folder, label in [('weekly-streams', 'Weekly stream'), ('stream-events', 'Special event')]:
        for file in sorted((ROOT / 'src' / 'content' / folder).glob('**/*.md')):
            raw = file.read_text(encoding='utf-8-sig')
            parts = raw.split('---', 2)
            if len(parts) < 3 or parts[0].strip():
                print(f'Skipping malformed frontmatter: {file.relative_to(ROOT)}')
                continue
            doc = yaml.safe_load(parts[1]) or {}
            if not isinstance(doc, dict):
                continue
            yield str(file.relative_to(ROOT)).replace('\\', '/'), label, doc


def format_time(value):
    """Format Pages CMS time (minutes since midnight) or HH:MM as 12-hour time."""
    if value is None or value == '':
        return 'TBA'
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        minutes = int(value)
        if minutes != value or not 0 <= minutes < 1440:
            return 'TBA'
        hour, minute = divmod(minutes, 60)
    elif isinstance(value, str):
        raw = value.strip()
        if raw.isdigit():
            return format_time(int(raw))
        parts = raw.split(':')
        if len(parts) != 2 or not all(part.isdigit() for part in parts):
            return raw or 'TBA'
        hour, minute = int(parts[0]), int(parts[1])
        if not (0 <= hour < 24 and 0 <= minute < 60):
            return 'TBA'
    elif isinstance(value, dt.time):
        hour, minute = value.hour, value.minute
    else:
        return 'TBA'
    suffix = 'AM' if hour < 12 else 'PM'
    hour12 = hour % 12 or 12
    return f'{hour12}:{minute:02d} {suffix}'


def format_event(kind, doc):
    lines = []
    title = str(doc.get('title') or 'Untitled stream')
    if kind == 'Weekly stream':
        lines.append(f"**Every {doc.get('day', 'TBA')} at {format_time(doc.get('time'))}** ({doc.get('timezone', 'America/Chicago')})")
    else:
        date = doc.get('date', 'TBA')
        if isinstance(date, (dt.date, dt.datetime)):
            date = date.isoformat()[:10]
        lines.append(f"**{date} at {format_time(doc.get('time'))}** ({doc.get('timezone', 'America/Chicago')})")
    if doc.get('game'):
        lines.append(f"**Game:** {doc['game']}")
    if doc.get('status'):
        lines.append(f"**Status:** {doc['status']}")
    if doc.get('description'):
        lines.append(str(doc['description']))
    slug = doc.get('_slug', '')
    link = (f'https://erikthewriter-website.pages.dev/streaming/events/{slug}/' if kind == 'Special event'
            else 'https://erikthewriter-website.pages.dev/streaming/')
    lines.append(f'**Details:** {link}')
    return {'embeds': [{'title': title[:256], 'description': '\n'.join(lines)[:4096], 'color': 0xA64B16,
                        'footer': {'text': f'Erik the Writer • {kind}'}}], 'allowed_mentions': {'parse': []}}


def main():
    state = json.loads(STATE_PATH.read_text(encoding='utf-8')) if STATE_PATH.exists() else {}
    dirty = False
    for key, kind, doc in entries():
        if not doc.get('discordPublish', False):
            continue
        if not doc.get('published', False):
            print(f'Skip unpublished entry: {key}')
            continue
        doc['_slug'] = Path(key).stem
        mode = str(doc.get('discordUpdateMode') or 'Quiet update')
        selected = doc.get('discordDestinations') or []
        if isinstance(selected, str):
            selected = [selected]
        payload = format_event(kind, doc)
        signature = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        for label in selected:
            if label not in DESTINATIONS:
                print(f'Unrecognized destination label {label!r} on {key}; skipped')
                continue
            ident, env_var = DESTINATIONS[label]
            webhook = os.environ.get(env_var, '').strip().rstrip('/')
            if not webhook:
                print(f'Destination {ident} has no configured secret; skipped')
                continue
            statekey = f'{key}::{ident}'
            record = state.get(statekey, {})
            if record.get('hash') == signature:
                print(f'Unchanged: {statekey}')
                continue
            original_id = record.get('message_id')
            if original_id and mode != 'New announcement':
                try:
                    request(f'{webhook}/messages/{original_id}', 'PATCH', payload)
                    print(f'Edited: {statekey}')
                except RuntimeError as err:
                    # Do not send fresh posts on error; prevents accidental duplicates.
                    raise RuntimeError(f'Failed editing {statekey}: {err}') from err
                if mode == 'Update and notify':
                    request(f'{webhook}?wait=true', 'POST', {
                        'content': f"📅 Schedule updated: **{str(doc.get('title', 'Stream'))[:150]}**",
                        'allowed_mentions': {'parse': []}
                    })
                message_id = original_id
            else:
                result = request(f'{webhook}?wait=true', 'POST', payload)
                message_id = result.get('id')
                if not message_id:
                    raise RuntimeError(f'Discord returned no message ID for {statekey}')
                print(f'Created: {statekey}')
            state[statekey] = {'message_id': message_id, 'hash': signature}
            STATE_PATH.parent.mkdir(exist_ok=True)
            STATE_PATH.write_text(json.dumps(state, indent=2, sort_keys=True) + '\n', encoding='utf-8')
            dirty = True
    print('State changed' if dirty else 'No changes')


if __name__ == '__main__':
    main()
