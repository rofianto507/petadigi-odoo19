import re
import base64
import time
import threading
from collections import defaultdict

# ── Rate limiting (per IP, in-memory, single-server) ─────────────────────────
_rate_lock = threading.Lock()
_rate_cache = defaultdict(list)
RATE_LIMIT_MAX    = 10    # maks submit per IP per jam
RATE_LIMIT_WINDOW = 3600  # 1 jam dalam detik


def check_rate_limit(ip, namespace=''):
    """Cek dan catat satu request. Kembalikan False jika melebihi batas.

    Gunakan namespace berbeda per form agar limit-nya independen.
    """
    key = f"{namespace}:{ip}" if namespace else ip
    now = time.time()
    with _rate_lock:
        _rate_cache[key] = [t for t in _rate_cache[key] if now - t < RATE_LIMIT_WINDOW]
        if len(_rate_cache[key]) >= RATE_LIMIT_MAX:
            return False
        _rate_cache[key].append(now)
        return True


def is_valid_image(b64_data):
    """Validasi magic bytes: JPEG, PNG, atau WebP."""
    try:
        sample = b64_data[:40]
        rem = len(sample) % 4
        if rem:
            sample += '=' * (4 - rem)
        raw = base64.b64decode(sample)
        return (
            raw[:3] == b'\xff\xd8\xff' or
            raw[:8] == b'\x89PNG\r\n\x1a\n' or
            (len(raw) >= 12 and raw[:4] == b'RIFF' and raw[8:12] == b'WEBP')
        )
    except Exception:
        return False


def parse_user_agent(ua):
    """Parse UA string → 'BrowserName Ver / OS Name'."""
    if not ua:
        return ''

    browser = 'Unknown'
    if re.search(r'Edg/', ua):
        m = re.search(r'Edg/(\d+)', ua)
        browser = f"Edge {m.group(1)}" if m else 'Edge'
    elif re.search(r'Edge/', ua):
        m = re.search(r'Edge/(\d+)', ua)
        browser = f"Edge {m.group(1)}" if m else 'Edge'
    elif re.search(r'SamsungBrowser/', ua):
        m = re.search(r'SamsungBrowser/(\d+)', ua)
        browser = f"Samsung Browser {m.group(1)}" if m else 'Samsung Browser'
    elif re.search(r'OPR/', ua):
        m = re.search(r'OPR/(\d+)', ua)
        browser = f"Opera {m.group(1)}" if m else 'Opera'
    elif re.search(r'Firefox/', ua):
        m = re.search(r'Firefox/(\d+)', ua)
        browser = f"Firefox {m.group(1)}" if m else 'Firefox'
    elif re.search(r'Chrome/', ua):
        m = re.search(r'Chrome/(\d+)', ua)
        browser = f"Chrome {m.group(1)}" if m else 'Chrome'
    elif re.search(r'Version/', ua) and re.search(r'Safari/', ua):
        m = re.search(r'Version/(\d+)', ua)
        browser = f"Safari {m.group(1)}" if m else 'Safari'
    elif re.search(r'MSIE|Trident/', ua):
        m = re.search(r'MSIE (\d+)', ua)
        browser = f"IE {m.group(1)}" if m else 'IE'

    os_name = 'Unknown'
    if re.search(r'Android', ua):
        m = re.search(r'Android (\d+)', ua)
        os_name = f"Android {m.group(1)}" if m else 'Android'
    elif re.search(r'iPhone|iPad', ua):
        m = re.search(r'OS (\d+)[_.]', ua)
        os_name = f"iOS {m.group(1)}" if m else 'iOS'
    elif re.search(r'Windows NT', ua):
        nt_map = {
            '10.0': 'Windows 10/11',
            '6.3':  'Windows 8.1',
            '6.2':  'Windows 8',
            '6.1':  'Windows 7',
        }
        m = re.search(r'Windows NT ([\d.]+)', ua)
        os_name = nt_map.get(m.group(1), f"Windows NT {m.group(1)}") if m else 'Windows'
    elif re.search(r'Mac OS X', ua):
        m = re.search(r'Mac OS X ([\d_]+)', ua)
        os_name = f"macOS {m.group(1).replace('_', '.')}" if m else 'macOS'
    elif re.search(r'Linux', ua):
        os_name = 'Linux'

    return f"{browser} / {os_name}"
