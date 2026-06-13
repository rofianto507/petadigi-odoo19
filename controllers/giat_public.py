from odoo import http, fields
from odoo.http import request
from markupsafe import Markup
from datetime import datetime
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

        raw_json = json.dumps({
            'token': token,
            'jenis_laporan': {
                'id': jenis.id,
                'nama': jenis.nama,
                'keterangan': jenis.keterangan or '',
            },
            'polres_list': polres_list,
            'recaptcha_site_key': recaptcha_site_key,
        })
        # Markup prevents t-out from HTML-escaping; replace </script> to avoid
        # premature script tag closure (extremely unlikely but safe practice)
        safe_init_data = Markup(raw_json.replace('</script>', r'<\/script>'))

        return request.render('petadigi.template_giat_form', {
            'jenis_laporan': jenis,
            'init_data': safe_init_data,
            'recaptcha_site_key': recaptcha_site_key,
        })

    def _parse_tanggal(self, tanggal_str):
        """Parse datetime-local string (YYYY-MM-DDTHH:MM) → Odoo Datetime (naive UTC-stored)."""
        if tanggal_str:
            for fmt in ('%Y-%m-%dT%H:%M', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d %H:%M'):
                try:
                    return datetime.strptime(tanggal_str.strip(), fmt)
                except ValueError:
                    continue
        return fields.Datetime.now()

    @http.route('/giat/api/polsek', type='json', auth='public', csrf=False)
    def get_polsek(self, polres_id, **kwargs):
        polsek_list = request.env['petadigi.polsek'].sudo().search_read(
            [('polres_id', '=', int(polres_id))],
            ['id', 'name'],
            order='name asc'
        )
        return polsek_list

    def _verify_recaptcha(self, recaptcha_token):
        secret_key = request.env['ir.config_parameter'].sudo().get_param('recaptcha_private_key', '')
        if not secret_key:
            return True  # reCAPTCHA tidak dikonfigurasi, lewati
        if not recaptcha_token:
            # Script gagal load (jaringan lambat/mobile) — izinkan dengan warning
            _logger.warning('reCAPTCHA giat: token kosong (script mungkin belum load), allowed')
            return True
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
            # Threshold 0.3 (bukan 0.5) karena mobile device sering dapat score lebih rendah
            return success and score >= 0.3
        except Exception as e:
            _logger.error('reCAPTCHA verification error: %s', e)
            return True  # Jika gagal koneksi ke Google, tetap izinkan

    @http.route('/giat/api/submit', type='json', auth='public', csrf=False)
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
                vals['foto'] = foto

            result = request.env['petadigi.hasil_giat'].sudo().create(vals)
            return {'success': True, 'code': result.code}
        except Exception as e:
            return {'success': False, 'message': str(e)}
