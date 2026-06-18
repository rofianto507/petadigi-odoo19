from odoo import http, fields
from odoo.http import request
from datetime import datetime, timedelta
import json
import requests as http_requests
import logging

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
        # Validasi token agar endpoint tidak bisa dienumerasi tanpa form yang valid
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
            # Tidak ada kunci → reCAPTCHA memang tidak diaktifkan (dev/localhost), izinkan
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
            # Baca threshold dari system parameter (default 0.5 jika belum diset)
            min_score = float(request.env['ir.config_parameter'].sudo().get_param(
                'recaptcha_min_score', '0.5'))
            return success and score >= min_score
        except Exception as e:
            # Jika Google tidak bisa dihubungi, tolak submit dan catat error.
            # Lebih aman daripada mengizinkan tanpa verifikasi.
            _logger.error('reCAPTCHA verification error (ip=%s): %s',
                          request.httprequest.remote_addr, e)
            return False

    @http.route('/giat/api/submit', type='jsonrpc', auth='public', csrf=False)
    def giat_submit(self, token, data, **kwargs):
        jenis = request.env['petadigi.jenis_laporan'].sudo().search([
            ('public_token', '=', token),
            ('state', '=', 'aktif'),
        ], limit=1)

        if not jenis:
            return {'success': False, 'message': 'Form tidak valid atau sudah tidak aktif'}

        recaptcha_token = data.get('recaptcha_token', '')
        if not self._verify_recaptcha(recaptcha_token):
            return {'success': False, 'message': 'Verifikasi keamanan gagal. Silakan coba lagi.'}

        try:
            vals = {
                'jenis_laporan_id': jenis.id,
                'nrp': (data.get('nrp') or '').strip(),
                'nama_petugas': (data.get('nama_petugas') or '').strip(),
                'pangkat_petugas': (data.get('pangkat_petugas') or '').strip(),
                'polres_id': int(data.get('polres_id') or 0) or False,
                'polsek_id': int(data.get('polsek_id') or 0) or False,
                'tanggal': self._parse_tanggal(data.get('tanggal')),
                'kegiatan': (data.get('kegiatan') or '').strip(),
                'latitude': float(data.get('latitude') or 0),
                'longitude': float(data.get('longitude') or 0),
            }

            foto = data.get('foto')
            if foto:
                # Hapus prefix data URI jika ada (data:image/jpeg;base64,...)
                if isinstance(foto, str) and ',' in foto:
                    foto = foto.split(',', 1)[1]
                # Batasi ukuran foto: base64 700 ribu karakter ≈ 500 KB file asli
                MAX_FOTO_B64 = 700_000
                if len(foto) > MAX_FOTO_B64:
                    return {'success': False, 'message': 'Ukuran foto terlalu besar. Coba pilih foto lain atau hapus foto.'}
                vals['foto'] = foto

            result = request.env['petadigi.hasil_giat'].sudo().create(vals)
            return {'success': True, 'code': result.code}
        except Exception as e:
            _logger.error('giat_submit error (token=%s): %s', token, e, exc_info=True)
            return {'success': False, 'message': 'Terjadi kesalahan pada server. Silakan coba lagi.'}
