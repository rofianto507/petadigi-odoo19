from odoo import http, fields
from odoo.http import request
from datetime import datetime, timedelta
import json
import requests as http_requests
import logging
from .public_utils import check_rate_limit, is_valid_image, parse_user_agent

_logger = logging.getLogger(__name__)


class GiatPublicController(http.Controller):

    @http.route('/giat/<string:token>', type='http', auth='public', csrf=False, website=False)
    def giat_form(self, token, **kwargs):
        jenis = request.env['petadigi.jenis_laporan'].sudo().search([
            ('public_token', '=', token),
            ('state', '=', 'aktif'),
        ], limit=1)

        if not jenis:
            return request.not_found()

        polres_list = request.env['petadigi.polres'].sudo().search_read(
            [], ['id', 'name'], order='name asc'
        )

        recaptcha_site_key = request.env['ir.config_parameter'].sudo().get_param('recaptcha_public_key', '')

        init_data = json.dumps({
            'token': token,
            'jenis_laporan': {
                'id': jenis.id,
                'nama': jenis.nama,
                'keterangan': jenis.keterangan or '',
            },
            'polres_list': polres_list,
            'recaptcha_site_key': recaptcha_site_key,
        })

        return request.render('petadigi.template_giat_form', {
            'jenis_laporan': jenis,
            'init_data': init_data,
            'recaptcha_site_key': recaptcha_site_key,
        })

    def _parse_tanggal(self, tanggal_str):
        """Parse datetime-local string (WIB, YYYY-MM-DDTHH:MM) → UTC untuk disimpan Odoo."""
        if tanggal_str:
            for fmt in ('%Y-%m-%dT%H:%M', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M'):
                try:
                    dt_wib = datetime.strptime(tanggal_str.strip(), fmt)
                    return dt_wib - timedelta(hours=7)  # WIB (UTC+7) → UTC
                except ValueError:
                    continue
        return fields.Datetime.now()

    @http.route('/giat/api/polsek', type='jsonrpc', auth='public', csrf=False)
    def get_polsek(self, polres_id, token=None, **kwargs):
        if not token:
            _logger.warning('get_polsek: request tanpa token dari ip=%s',
                            request.httprequest.remote_addr)
            return []
        try:
            valid = request.env['petadigi.jenis_laporan'].sudo().search_count([
                ('public_token', '=', token),
                ('state', '=', 'aktif'),
            ])
            if not valid:
                _logger.warning('get_polsek: token tidak valid atau non-aktif')
                return []
            return request.env['petadigi.polsek'].sudo().search_read(
                [('polres_id', '=', int(polres_id))],
                ['id', 'name'],
                order='name asc'
            )
        except Exception as e:
            _logger.error('get_polsek error: %s', e, exc_info=True)
            return []

    def _verify_recaptcha(self, recaptcha_token):
        secret_key = request.env['ir.config_parameter'].sudo().get_param('recaptcha_private_key', '')
        if not secret_key:
            return True
        if not recaptcha_token:
            _logger.warning('reCAPTCHA giat: token kosong dari client (ip=%s)',
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
                _logger.info('reCAPTCHA giat verified, score=%.2f', score)
            else:
                _logger.warning('reCAPTCHA giat failed: %s', result.get('error-codes'))
            min_score = float(request.env['ir.config_parameter'].sudo().get_param(
                'recaptcha_min_score', '0.5'))
            return success and score >= min_score
        except Exception as e:
            _logger.error('reCAPTCHA verification error (ip=%s): %s',
                          request.httprequest.remote_addr, e)
            return False

    def _validate_submit_data(self, data):
        """Validasi server-side seluruh field sebelum disimpan ke database."""
        errors = []

        # ── NRP ──────────────────────────────────────────────────────────────
        nrp = (data.get('nrp') or '').strip()
        if not nrp:
            errors.append('NRP wajib diisi')
        elif len(nrp) > 50:
            errors.append('NRP terlalu panjang (maks 50 karakter)')

        # ── Nama Petugas ─────────────────────────────────────────────────────
        nama_petugas = (data.get('nama_petugas') or '').strip()
        if not nama_petugas:
            errors.append('Nama petugas wajib diisi')
        elif len(nama_petugas) > 200:
            errors.append('Nama petugas terlalu panjang (maks 200 karakter)')

        # ── Pangkat ──────────────────────────────────────────────────────────
        pangkat_petugas = (data.get('pangkat_petugas') or '').strip()
        if not pangkat_petugas:
            errors.append('Pangkat wajib diisi')
        elif len(pangkat_petugas) > 100:
            errors.append('Pangkat terlalu panjang (maks 100 karakter)')

        # ── Polres ───────────────────────────────────────────────────────────
        try:
            polres_id = int(data.get('polres_id') or 0)
        except (ValueError, TypeError):
            polres_id = 0
        if not polres_id:
            errors.append('Polres wajib dipilih')

        # ── Polsek: integritas relasional ─────────────────────────────────────
        try:
            polsek_id = int(data.get('polsek_id') or 0)
        except (ValueError, TypeError):
            polsek_id = 0
        if polsek_id and polres_id:
            if not request.env['petadigi.polsek'].sudo().search_count([
                ('id', '=', polsek_id),
                ('polres_id', '=', polres_id),
            ]):
                errors.append('Polsek tidak valid untuk Polres yang dipilih')

        # ── Tanggal ──────────────────────────────────────────────────────────
        tanggal_str = (data.get('tanggal') or '').strip()
        if not tanggal_str:
            errors.append('Tanggal kegiatan wajib diisi')
        else:
            parsed_ok = False
            for fmt in ('%Y-%m-%dT%H:%M', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M'):
                try:
                    datetime.strptime(tanggal_str, fmt)
                    parsed_ok = True
                    break
                except ValueError:
                    continue
            if not parsed_ok:
                errors.append('Format tanggal tidak valid')

        # ── Kegiatan ─────────────────────────────────────────────────────────
        kegiatan = (data.get('kegiatan') or '').strip()
        if not kegiatan:
            errors.append('Uraian kegiatan wajib diisi')
        elif len(kegiatan) > 5000:
            errors.append('Uraian kegiatan terlalu panjang (maks 5000 karakter)')

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
            if len(foto_b64) > 700_000:
                errors.append('Ukuran foto terlalu besar. Coba pilih foto lain atau hapus foto.')
            elif not is_valid_image(foto_b64 or ''):
                errors.append('Foto harus berupa file gambar (JPEG, PNG, atau WebP)')

        return errors

    @http.route('/giat/api/submit', type='jsonrpc', auth='public', csrf=False)
    def giat_submit(self, token, data, **kwargs):
        # ── Rate limiting ─────────────────────────────────────────────────────
        client_ip = (
            request.httprequest.environ.get('HTTP_X_FORWARDED_FOR', '')
            .split(',')[0].strip()
            or request.httprequest.remote_addr
        )
        if not check_rate_limit(client_ip, 'giat'):
            _logger.warning('giat_submit: rate limit exceeded (ip=%s)', client_ip)
            return {
                'success': False,
                'message': 'Terlalu banyak pengiriman. Silakan coba lagi dalam 1 jam.',
            }

        # ── Sanitasi token & data ─────────────────────────────────────────────
        if not isinstance(token, str) or len(token) > 200:
            return {'success': False, 'message': 'Token tidak valid'}
        if not isinstance(data, dict):
            return {'success': False, 'message': 'Data tidak valid'}

        # ── Token & status jenis laporan ──────────────────────────────────────
        jenis = request.env['petadigi.jenis_laporan'].sudo().search([
            ('public_token', '=', token),
            ('state', '=', 'aktif'),
        ], limit=1)

        if not jenis:
            return {'success': False, 'message': 'Form tidak valid atau sudah tidak aktif'}

        # ── reCAPTCHA ─────────────────────────────────────────────────────────
        recaptcha_token = data.get('recaptcha_token', '')
        if not self._verify_recaptcha(recaptcha_token):
            return {'success': False, 'message': 'Verifikasi keamanan gagal. Silakan coba lagi.'}

        # ── Validasi server-side ──────────────────────────────────────────────
        errors = self._validate_submit_data(data)
        if errors:
            _logger.warning('giat_submit: validasi gagal (ip=%s): %s', client_ip, errors)
            return {'success': False, 'message': '; '.join(errors)}

        # ── Simpan data ───────────────────────────────────────────────────────
        try:
            foto_raw = data.get('foto', '')
            foto_b64 = (
                foto_raw.split(',', 1)[1]
                if isinstance(foto_raw, str) and ',' in foto_raw
                else foto_raw
            )

            vals = {
                'jenis_laporan_id': jenis.id,
                'nrp':              (data.get('nrp') or '').strip(),
                'nama_petugas':     (data.get('nama_petugas') or '').strip(),
                'pangkat_petugas':  (data.get('pangkat_petugas') or '').strip(),
                'polres_id':        int(data.get('polres_id') or 0) or False,
                'polsek_id':        int(data.get('polsek_id') or 0) or False,
                'tanggal':          self._parse_tanggal(data.get('tanggal')),
                'kegiatan':         (data.get('kegiatan') or '').strip(),
                'latitude':         float(data.get('latitude') or 0),
                'longitude':        float(data.get('longitude') or 0),
                'foto':             foto_b64,
                'submitter_ip':     client_ip,
                'submitter_ua':     parse_user_agent(
                    request.httprequest.environ.get('HTTP_USER_AGENT', '')
                ),
            }

            result = request.env['petadigi.hasil_giat'].sudo().create(vals)
            return {'success': True, 'code': result.code}
        except Exception as e:
            _logger.error('giat_submit error (token=%s): %s', token, e, exc_info=True)
            return {'success': False, 'message': 'Terjadi kesalahan pada server. Silakan coba lagi.'}
