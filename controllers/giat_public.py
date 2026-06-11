from odoo import http, fields
from odoo.http import request
from markupsafe import Markup
from datetime import datetime
import json


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

        raw_json = json.dumps({
            'token': token,
            'jenis_laporan': {
                'id': jenis.id,
                'nama': jenis.nama,
                'keterangan': jenis.keterangan or '',
            },
            'polres_list': polres_list,
        })
        # Markup prevents t-out from HTML-escaping; replace </script> to avoid
        # premature script tag closure (extremely unlikely but safe practice)
        safe_init_data = Markup(raw_json.replace('</script>', r'<\/script>'))

        return request.render('petadigi.template_giat_form', {
            'jenis_laporan': jenis,
            'init_data': safe_init_data,
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

    @http.route('/giat/api/submit', type='json', auth='public', csrf=False)
    def giat_submit(self, token, data, **kwargs):
        jenis = request.env['petadigi.jenis_laporan'].sudo().search([
            ('public_token', '=', token),
            ('state', '=', 'aktif'),
        ], limit=1)

        if not jenis:
            return {'success': False, 'message': 'Form tidak valid atau sudah tidak aktif'}

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
