from odoo import http
from odoo.http import request
import json
import re
import base64
import time
import threading
from collections import defaultdict
import requests as http_requests
import logging

_logger = logging.getLogger(__name__)

# ── Rate limiting (per IP, in-memory, single-server) ─────────────────────────
_rate_lock = threading.Lock()
_rate_cache = defaultdict(list)
RATE_LIMIT_MAX    = 10    # maks submit per IP per jam
RATE_LIMIT_WINDOW = 3600  # 1 jam dalam detik


def _check_rate_limit(ip):
    now = time.time()
    with _rate_lock:
        _rate_cache[ip] = [t for t in _rate_cache[ip] if now - t < RATE_LIMIT_WINDOW]
        if len(_rate_cache[ip]) >= RATE_LIMIT_MAX:
            return False
        _rate_cache[ip].append(now)
        return True


def _is_valid_image(b64_data):
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


def _parse_user_agent(ua):
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


class SumurPublicController(http.Controller):

    def _validate_submit_data(self, data, kategori):
        """Validasi server-side seluruh field sebelum disimpan ke database."""
        errors = []

        # ── String fields ────────────────────────────────────────────────────
        nama_sumur = (data.get('nama_sumur') or '').strip()
        if not nama_sumur:
            errors.append('Nama sumur wajib diisi')
        elif len(nama_sumur) > 200:
            errors.append('Nama sumur terlalu panjang (maks 200 karakter)')

        nama_surveyor = (data.get('nama_surveyor') or '').strip()
        if not nama_surveyor:
            errors.append('Nama surveyor wajib diisi')
        elif len(nama_surveyor) > 200:
            errors.append('Nama surveyor terlalu panjang (maks 200 karakter)')

        hp_surveyor = (data.get('hp_surveyor') or '').strip()
        if len(hp_surveyor) > 50:
            errors.append('No. HP terlalu panjang (maks 50 karakter)')

        # ── Wilayah ──────────────────────────────────────────────────────────
        try:
            kabupaten_id = int(data.get('kabupaten_id') or 0)
        except (ValueError, TypeError):
            kabupaten_id = 0
        try:
            kecamatan_id = int(data.get('kecamatan_id') or 0)
        except (ValueError, TypeError):
            kecamatan_id = 0
        try:
            desa_id = int(data.get('desa_id') or 0)
        except (ValueError, TypeError):
            desa_id = 0

        if not kabupaten_id:
            errors.append('Kabupaten/Kota wajib dipilih')

        if not kecamatan_id:
            errors.append('Kecamatan wajib dipilih')
        elif kabupaten_id:
            if not request.env['petadigi.kecamatan'].sudo().search_count([
                ('id', '=', kecamatan_id),
                ('kabupaten_id', '=', kabupaten_id),
            ]):
                errors.append('Kecamatan tidak valid untuk kabupaten yang dipilih')

        if not desa_id:
            errors.append('Desa/Kelurahan wajib dipilih')
        elif kecamatan_id:
            if not request.env['petadigi.desa'].sudo().search_count([
                ('id', '=', desa_id),
                ('kecamatan_id', '=', kecamatan_id),
            ]):
                errors.append('Desa/Kelurahan tidak valid untuk kecamatan yang dipilih')

        # ── GPS ──────────────────────────────────────────────────────────────
        try:
            lat = float(data.get('latitude') or 0)
            lng = float(data.get('longitude') or 0)
        except (ValueError, TypeError):
            lat, lng = 0.0, 0.0

        if lat == 0.0 and lng == 0.0:
            errors.append('Lokasi GPS wajib diisi')
        elif not (-90 <= lat <= 90):
            errors.append('Nilai latitude tidak valid')
        elif not (-180 <= lng <= 180):
            errors.append('Nilai longitude tidak valid')

        # ── Foto ─────────────────────────────────────────────────────────────
        foto_raw = data.get('foto')
        if not foto_raw:
            errors.append('Foto dokumentasi wajib diisi')
        else:
            foto_b64 = (
                foto_raw.split(',', 1)[1]
                if isinstance(foto_raw, str) and ',' in foto_raw
                else foto_raw
            )
            if not _is_valid_image(foto_b64 or ''):
                errors.append('Foto harus berupa file gambar (JPEG, PNG, atau WebP)')

        # ── Minyak ───────────────────────────────────────────────────────────
        kode = kategori.kode
        required_minyak = {
            'sumur_masyarakat': ['minyak_produksi', 'minyak_keluar'],
            'bku':              ['minyak_masuk', 'minyak_tersedia', 'minyak_keluar'],
            'k3s':              ['minyak_masuk', 'minyak_ditolak'],
        }.get(kode, [])

        minyak_labels = {
            'minyak_produksi': 'Minyak Produksi',
            'minyak_masuk':    'Minyak Masuk',
            'minyak_tersedia': 'Minyak Tersedia',
            'minyak_keluar':   'Minyak Keluar',
            'minyak_ditolak':  'Minyak Ditolak',
        }
        for field, label in minyak_labels.items():
            raw = data.get(field)
            if raw is None or str(raw).strip() == '':
                if field in required_minyak:
                    errors.append(f'{label} wajib diisi')
                continue
            try:
                v = float(raw)
            except (ValueError, TypeError):
                errors.append(f'{label} harus berupa angka')
                continue
            if v < 0:
                errors.append(f'{label} tidak boleh negatif')
            elif v > 9_999_999:
                errors.append(f'{label} melebihi batas maksimum (9.999.999)')

        return errors

    def _verify_recaptcha(self, recaptcha_token):
        secret_key = request.env['ir.config_parameter'].sudo().get_param(
            'recaptcha_private_key', '')
        if not secret_key:
            return True
        if not recaptcha_token:
            _logger.warning('reCAPTCHA sumur: token kosong dari client (ip=%s)',
                            request.httprequest.remote_addr)
            return False
        try:
            r = http_requests.post('https://www.recaptcha.net/recaptcha/api/siteverify', data={
                'secret': secret_key,
                'response': recaptcha_token,
                'remoteip': request.httprequest.remote_addr,
            }, timeout=5)
            result = r.json()
            score = result.get('score', 0)
            success = result.get('success', False)
            if success:
                _logger.info('reCAPTCHA sumur verified, score=%.2f', score)
            else:
                _logger.warning('reCAPTCHA sumur failed: %s', result.get('error-codes'))
            min_score = float(request.env['ir.config_parameter'].sudo().get_param(
                'recaptcha_min_score', '0.5'))
            return success and score >= min_score
        except Exception as e:
            _logger.error('reCAPTCHA verification error (ip=%s): %s',
                          request.httprequest.remote_addr, e)
            return False

    @http.route('/sumur/<string:token>', type='http', auth='public', csrf=False, website=False)
    def sumur_form(self, token, **kwargs):
        kategori = request.env['petadigi.kategori_sumur_minyak'].sudo().search([
            ('public_token', '=', token),
            ('state', '=', 'aktif'),
        ], limit=1)

        if not kategori:
            return request.not_found()

        kabupaten_list = request.env['petadigi.kabupaten'].sudo().search_read(
            [], ['id', 'name'], order='name asc'
        )

        recaptcha_site_key = request.env['ir.config_parameter'].sudo().get_param(
            'recaptcha_public_key', '')

        init_data = json.dumps({
            'token': token,
            'kategori': {
                'id': kategori.id,
                'name': kategori.name,
                'keterangan': kategori.keterangan or '',
                'kode': kategori.kode or '',
            },
            'kabupaten_list': kabupaten_list,
            'recaptcha_site_key': recaptcha_site_key,
        })

        return request.render('petadigi.template_sumur_form', {
            'kategori': kategori,
            'init_data': init_data,
            'recaptcha_site_key': recaptcha_site_key,
        })

    @http.route('/sumur/api/kecamatan', type='jsonrpc', auth='public', csrf=False)
    def get_kecamatan(self, kabupaten_id, token=None, **kwargs):
        if not token:
            _logger.warning('get_kecamatan: request tanpa token dari ip=%s',
                            request.httprequest.remote_addr)
            return []
        try:
            valid = request.env['petadigi.kategori_sumur_minyak'].sudo().search_count([
                ('public_token', '=', token),
                ('state', '=', 'aktif'),
            ])
            if not valid:
                return []
            return request.env['petadigi.kecamatan'].sudo().search_read(
                [('kabupaten_id', '=', int(kabupaten_id))],
                ['id', 'name'],
                order='name asc'
            )
        except Exception as e:
            _logger.error('get_kecamatan error: %s', e, exc_info=True)
            return []

    @http.route('/sumur/api/desa', type='jsonrpc', auth='public', csrf=False)
    def get_desa(self, kecamatan_id, token=None, **kwargs):
        if not token:
            _logger.warning('get_desa: request tanpa token dari ip=%s',
                            request.httprequest.remote_addr)
            return []
        try:
            valid = request.env['petadigi.kategori_sumur_minyak'].sudo().search_count([
                ('public_token', '=', token),
                ('state', '=', 'aktif'),
            ])
            if not valid:
                return []
            return request.env['petadigi.desa'].sudo().search_read(
                [('kecamatan_id', '=', int(kecamatan_id))],
                ['id', 'name'],
                order='name asc'
            )
        except Exception as e:
            _logger.error('get_desa error: %s', e, exc_info=True)
            return []

    @http.route('/sumur/api/submit', type='jsonrpc', auth='public', csrf=False)
    def sumur_submit(self, token, data, **kwargs):
        # ── Rate limiting ─────────────────────────────────────────────────────
        client_ip = (
            request.httprequest.environ.get('HTTP_X_FORWARDED_FOR', '')
            .split(',')[0].strip()
            or request.httprequest.remote_addr
        )
        if not _check_rate_limit(client_ip):
            _logger.warning('sumur_submit: rate limit exceeded (ip=%s)', client_ip)
            return {
                'success': False,
                'message': 'Terlalu banyak pengiriman. Silakan coba lagi dalam 1 jam.',
            }

        # ── Token & status kategori ───────────────────────────────────────────
        kategori = request.env['petadigi.kategori_sumur_minyak'].sudo().search([
            ('public_token', '=', token),
            ('state', '=', 'aktif'),
        ], limit=1)

        if not kategori:
            return {'success': False, 'message': 'Form tidak valid atau sudah tidak aktif'}

        # ── reCAPTCHA ─────────────────────────────────────────────────────────
        recaptcha_token = data.get('recaptcha_token', '')
        if not self._verify_recaptcha(recaptcha_token):
            return {'success': False, 'message': 'Verifikasi keamanan gagal. Silakan coba lagi.'}

        # ── Validasi server-side ──────────────────────────────────────────────
        errors = self._validate_submit_data(data, kategori)
        if errors:
            _logger.warning('sumur_submit: validasi gagal (ip=%s): %s', client_ip, errors)
            return {'success': False, 'message': '; '.join(errors)}

        # ── Simpan data ───────────────────────────────────────────────────────
        try:
            foto_raw = data.get('foto', '')
            foto_b64 = (
                foto_raw.split(',', 1)[1]
                if isinstance(foto_raw, str) and ',' in foto_raw
                else foto_raw
            )
            MAX_FOTO_B64 = 700_000
            if len(foto_b64) > MAX_FOTO_B64:
                return {
                    'success': False,
                    'message': 'Ukuran foto terlalu besar. Coba pilih foto lain atau hapus foto.',
                }

            vals = {
                'name':           (data.get('nama_sumur') or '').strip(),
                'kategori_id':    kategori.id,
                'kabupaten_id':   int(data.get('kabupaten_id') or 0) or False,
                'kecamatan_id':   int(data.get('kecamatan_id') or 0) or False,
                'desa_id':        int(data.get('desa_id') or 0) or False,
                'latitude':       float(data.get('latitude') or 0),
                'longitude':      float(data.get('longitude') or 0),
                'minyak_produksi':float(data.get('minyak_produksi') or 0),
                'minyak_masuk':   float(data.get('minyak_masuk') or 0),
                'minyak_tersedia':float(data.get('minyak_tersedia') or 0),
                'minyak_keluar':  float(data.get('minyak_keluar') or 0),
                'minyak_ditolak': float(data.get('minyak_ditolak') or 0),
                'nama_surveyor':  (data.get('nama_surveyor') or '').strip(),
                'hp_surveyor':    (data.get('hp_surveyor') or '').strip(),
                'foto':           foto_b64,
                'state':          'AKTIF',
                'submitter_ip':   client_ip,
                'submitter_ua':   _parse_user_agent(
                    request.httprequest.environ.get('HTTP_USER_AGENT', '')
                ),
            }

            result = request.env['petadigi.sumur_minyak'].sudo().create(vals)
            return {'success': True, 'code': result.code}
        except Exception as e:
            _logger.error('sumur_submit error (token=%s): %s', token, e, exc_info=True)
            return {'success': False, 'message': 'Terjadi kesalahan pada server. Silakan coba lagi.'}
