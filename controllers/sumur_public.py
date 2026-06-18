from odoo import http
from odoo.http import request
import json
import requests as http_requests
import logging

_logger = logging.getLogger(__name__)


class SumurPublicController(http.Controller):

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
            },
            'kabupaten_list': kabupaten_list,
            'recaptcha_site_key': recaptcha_site_key,
        })

        return request.render('petadigi.template_sumur_form', {
            'kategori': kategori,
            'init_data': init_data,
            'recaptcha_site_key': recaptcha_site_key,
        })

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
        kategori = request.env['petadigi.kategori_sumur_minyak'].sudo().search([
            ('public_token', '=', token),
            ('state', '=', 'aktif'),
        ], limit=1)

        if not kategori:
            return {'success': False, 'message': 'Form tidak valid atau sudah tidak aktif'}

        recaptcha_token = data.get('recaptcha_token', '')
        if not self._verify_recaptcha(recaptcha_token):
            return {'success': False, 'message': 'Verifikasi keamanan gagal. Silakan coba lagi.'}

        try:
            vals = {
                'name': (data.get('nama_sumur') or '').strip(),
                'kategori_id': kategori.id,
                'kabupaten_id': int(data.get('kabupaten_id') or 0) or False,
                'kecamatan_id': int(data.get('kecamatan_id') or 0) or False,
                'desa_id': int(data.get('desa_id') or 0) or False,
                'latitude': float(data.get('latitude') or 0),
                'longitude': float(data.get('longitude') or 0),
                'jumlah_minyak': float(data.get('jumlah_minyak') or 0),
                'nama_surveyor': (data.get('nama_surveyor') or '').strip(),
                'hp_surveyor': (data.get('hp_surveyor') or '').strip(),
                'state': 'AKTIF',
            }

            foto = data.get('foto')
            if foto:
                if isinstance(foto, str) and ',' in foto:
                    foto = foto.split(',', 1)[1]
                MAX_FOTO_B64 = 700_000
                if len(foto) > MAX_FOTO_B64:
                    return {
                        'success': False,
                        'message': 'Ukuran foto terlalu besar. Coba pilih foto lain atau hapus foto.',
                    }
                vals['foto'] = foto

            result = request.env['petadigi.sumur_minyak'].sudo().create(vals)
            return {'success': True, 'code': result.code}
        except Exception as e:
            _logger.error('sumur_submit error (token=%s): %s', token, e, exc_info=True)
            return {'success': False, 'message': 'Terjadi kesalahan pada server. Silakan coba lagi.'}
