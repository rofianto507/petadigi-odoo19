from odoo import http
from odoo.http import request
import json
import base64
import logging

_logger = logging.getLogger(__name__)


class StrongPointPublicController(http.Controller):

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _auth_check(self):
        user = request.env.user
        if user._is_public() or not user.polres_id:
            return None
        return user

    def _build_user_ctx(self, user):
        is_polsek = bool(user.polsek_id)
        polres    = user.polres_id
        polsek    = user.polsek_id

        ctx = {
            'user_id':    user.id,
            'user_name':  user.name,
            'user_login': user.login,
            'is_polsek':  is_polsek,
            'polres_id':  polres.id,
            'polres_name': polres.name,
            'polsek_id':   polsek.id   if polsek else None,
            'polsek_name': polsek.name if polsek else None,
        }

        kabupaten_list = request.env['petadigi.kabupaten'].sudo().search_read(
            [('polres_id', '=', polres.id)], ['id', 'name'], order='name asc',
        )
        ctx['kabupaten_list'] = kabupaten_list

        if not is_polsek:
            polsek_list = request.env['petadigi.polsek'].sudo().search_read(
                [('polres_id', '=', polres.id)], ['id', 'name'], order='name asc',
            )
            ctx['polsek_list'] = polsek_list
        else:
            ctx['polsek_list'] = []

        if is_polsek:
            kecamatan_list = request.env['petadigi.kecamatan'].sudo().search_read(
                [('polsek_id', '=', polsek.id)], ['id', 'name', 'kabupaten_id'], order='name asc',
            )
            ctx['kecamatan_list'] = kecamatan_list
        else:
            ctx['kecamatan_list'] = []

        return ctx

    def _check_record_access(self, user, record_id):
        """Returns record if user has access, else None."""
        SP = request.env['petadigi.strong_point'].sudo()
        record = SP.browse(int(record_id))
        if not record.exists():
            return None
        if record.polres_id.id != user.polres_id.id:
            return None
        return record

    # ── Routes ───────────────────────────────────────────────────────────────

    @http.route('/petadigi', type='http', auth='public', csrf=False, website=False)
    def strong_index(self, **kwargs):
        if self._auth_check():
            return request.redirect('/petadigi/form')
        return request.redirect('/petadigi/login')

    @http.route('/petadigi/login', type='http', auth='public', csrf=False, website=False, methods=['GET'])
    def strong_login_get(self, error=None, redirect=None, **kwargs):
        if self._auth_check():
            return request.redirect(redirect or '/petadigi/form')
        return request.render('petadigi.template_strong_login', {
            'error': error,
            'redirect': redirect or '/petadigi/form',
        })

    @http.route('/petadigi/login', type='http', auth='public', csrf=False, website=False, methods=['POST'])
    def strong_login_post(self, login='', password='', redirect=None, **kwargs):
        try:
            credential = {'type': 'password', 'login': login.strip(), 'password': password}
            request.session.authenticate(request.env, credential)
            uid = request.session.uid
            _logger.info('Strong Point login: user="%s" uid=%s', login, uid)
            if uid:
                user = request.env['res.users'].sudo().browse(uid)
                if not user.polres_id:
                    request.session.logout(keep_db=True)
                    return request.redirect('/petadigi/login?error=unauthorized')
                return request.redirect(redirect or '/petadigi/form')
        except Exception as e:
            _logger.warning('Strong Point login gagal untuk "%s": %s', login, e)
        return request.redirect('/petadigi/login?error=invalid')

    @http.route('/petadigi/logout', type='http', auth='public', csrf=False, website=False)
    def strong_logout(self, **kwargs):
        request.session.logout(keep_db=True)
        return request.redirect('/petadigi/login')

    @http.route('/petadigi/form', type='http', auth='public', csrf=False, website=False)
    def strong_form_get(self, **kwargs):
        user = self._auth_check()
        if not user:
            return request.redirect('/petadigi/login?redirect=/petadigi/form')
        user_ctx  = self._build_user_ctx(user)
        init_data = json.dumps(user_ctx)
        return request.render('petadigi.template_strong_form', {
            'init_data': init_data,
            'user_ctx':  user_ctx,
        })

    # ── API: KPI ─────────────────────────────────────────────────────────────

    @http.route('/petadigi/api/kpi', type='jsonrpc', auth='public', csrf=False)
    def api_kpi(self, **kwargs):
        user = self._auth_check()
        if not user:
            return {'error': 'unauthorized'}
        SP   = request.env['petadigi.strong_point'].sudo()
        base = ([('polsek_id', '=', user.polsek_id.id)] if user.polsek_id
                else [('polres_id', '=', user.polres_id.id)])
        total    = SP.search_count(base)
        proses   = SP.search_count(base + [('state', '=', 'PROSES')])
        selesai  = SP.search_count(base + [('state', '=', 'SELESAI')])
        groups   = SP.read_group(base, ['personel_count:sum'], [])
        personel = groups[0]['personel_count'] if groups else 0
        return {
            'strong_point': {'total': total, 'proses': proses, 'selesai': selesai, 'personel': personel},
            'patroli': {'total': 0, 'aktif': 0},
        }

    # ── API: Lokasi & Wilayah ─────────────────────────────────────────────────

    @http.route('/petadigi/api/lokasi', type='jsonrpc', auth='public', csrf=False)
    def api_lokasi(self, **kwargs):
        user = self._auth_check()
        if not user:
            return []
        domain = [('polres_id', '=', user.polres_id.id), ('state', '=', 'aktif')]
        if user.polsek_id:
            domain.append(('polsek_id', 'in', [user.polsek_id.id, False]))
        return request.env['petadigi.lokasi_strong_point'].sudo().search_read(
            domain, ['id', 'nama', 'code', 'lat', 'lng'], order='nama asc'
        )

    @http.route('/petadigi/api/kecamatan', type='jsonrpc', auth='public', csrf=False)
    def api_kecamatan(self, kabupaten_id=None, **kwargs):
        user = self._auth_check()
        if not user or not kabupaten_id:
            return []
        domain = [('kabupaten_id', '=', int(kabupaten_id))]
        if user.polsek_id:
            domain.append(('polsek_id', '=', user.polsek_id.id))
        return request.env['petadigi.kecamatan'].sudo().search_read(
            domain, ['id', 'name'], order='name asc'
        )

    @http.route('/petadigi/api/desa', type='jsonrpc', auth='public', csrf=False)
    def api_desa(self, kecamatan_id=None, **kwargs):
        user = self._auth_check()
        if not user or not kecamatan_id:
            return []
        return request.env['petadigi.desa'].sudo().search_read(
            [('kecamatan_id', '=', int(kecamatan_id))], ['id', 'name'], order='name asc'
        )

    # ── API: List records ────────────────────────────────────────────────────

    @http.route('/petadigi/api/list', type='jsonrpc', auth='public', csrf=False)
    def api_list(self, offset=0, limit=20, **kwargs):
        user = self._auth_check()
        if not user:
            return []
        SP   = request.env['petadigi.strong_point'].sudo()
        base = ([('polsek_id', '=', user.polsek_id.id)] if user.polsek_id
                else [('polres_id', '=', user.polres_id.id)])
        records = SP.search_read(
            base,
            ['id', 'code', 'state', 'lokasi_nama', 'tanggal_mulai', 'personel_count'],
            order='tanggal_mulai desc',
            offset=int(offset),
            limit=int(limit),
        )
        for r in records:
            if r.get('tanggal_mulai'):
                r['tanggal_mulai'] = r['tanggal_mulai'].strftime('%Y-%m-%d %H:%M:%S')
        return records

    # ── API: Submit (create) ──────────────────────────────────────────────────

    @http.route('/petadigi/api/submit', type='jsonrpc', auth='public', csrf=False)
    def api_submit(self, **kwargs):
        user = self._auth_check()
        if not user:
            return {'error': 'Sesi habis. Silakan login kembali.'}
        try:
            vals = {
                'polres_id':     user.polres_id.id,
                'polsek_id':     int(kwargs['polsek_id'])    if kwargs.get('polsek_id')    else False,
                'lokasi_id':     int(kwargs['lokasi_id'])    if kwargs.get('lokasi_id')    else False,
                'kabupaten_id':  int(kwargs['kabupaten_id']) if kwargs.get('kabupaten_id') else False,
                'kecamatan_id':  int(kwargs['kecamatan_id']) if kwargs.get('kecamatan_id') else False,
                'desa_id':       int(kwargs['desa_id'])      if kwargs.get('desa_id')      else False,
                'tanggal_mulai': kwargs.get('tanggal_mulai') or False,
                'latitude':      float(kwargs['latitude'])   if kwargs.get('latitude')     else 0.0,
                'longitude':     float(kwargs['longitude'])  if kwargs.get('longitude')    else 0.0,
                'keterangan':    kwargs.get('keterangan')    or '',
                'state':         'PROSES',
            }
            if user.polsek_id:
                vals['polsek_id'] = user.polsek_id.id
            record = request.env['petadigi.strong_point'].with_user(user.id).create(vals)
            return {'success': True, 'code': record.code, 'record_id': record.id}
        except Exception as e:
            _logger.error('Strong Point submit error: %s', e, exc_info=True)
            return {'error': str(e)}

    # ── API: Record detail ────────────────────────────────────────────────────

    @http.route('/petadigi/api/record', type='jsonrpc', auth='public', csrf=False)
    def api_record(self, record_id=None, **kwargs):
        user = self._auth_check()
        if not user or not record_id:
            return {'error': 'unauthorized'}
        rec = self._check_record_access(user, record_id)
        if not rec:
            return {'error': 'not found'}

        def _fmt_dt(dt):
            return dt.strftime('%Y-%m-%d %H:%M:%S') if dt else ''

        att = request.env['ir.attachment'].sudo().search([
            ('res_model', '=', 'petadigi.strong_point'),
            ('res_id',    '=', rec.id),
            ('res_field', '=', 'foto'),
        ], limit=1)
        _logger.info('[SP] api_record id=%s att=%s att.datas_size=%s rec.foto_type=%s',
                     rec.id,
                     att.id if att else None,
                     len(att.datas) if att and att.datas else 0,
                     type(rec.foto).__name__)

        foto_src = False
        if att and att.datas:
            try:
                datas = att.datas
                if isinstance(datas, bytes):
                    datas = datas.decode('ascii')
                datas = datas.replace('\n', '').replace('\r', '').strip()
                mime = att.mimetype or 'image/jpeg'
                if not mime.startswith('image/'):
                    mime = 'image/jpeg'
                foto_src = 'data:{};base64,{}'.format(mime, datas)
                _logger.info('[SP] foto_src ok mime=%s b64_len=%s', mime, len(datas))
            except Exception as e:
                _logger.error('[SP] foto_src build error: %s', e, exc_info=True)

        return {
            'id':             rec.id,
            'code':           rec.code,
            'state':          rec.state,
            'lokasi_nama':    rec.lokasi_nama or '',
            'kecamatan_nama': rec.kecamatan_id.name if rec.kecamatan_id else '',
            'desa_nama':      rec.desa_id.name      if rec.desa_id      else '',
            'tanggal_mulai':  _fmt_dt(rec.tanggal_mulai),
            'tanggal_selesai': _fmt_dt(rec.tanggal_selesai),
            'has_foto':       bool(foto_src),
            'foto_src':       foto_src or '',
            'personel': [
                {'id': p.id, 'nama_lengkap': p.nama_lengkap, 'pangkat': p.pangkat or ''}
                for p in rec.personel_ids
            ],
        }

    # ── API: Personel ─────────────────────────────────────────────────────────

    @http.route('/petadigi/api/personel_add', type='jsonrpc', auth='public', csrf=False)
    def api_personel_add(self, record_id=None, nama=None, pangkat=None, **kwargs):
        user = self._auth_check()
        if not user or not record_id or not nama:
            return {'error': 'Data tidak lengkap'}
        rec = self._check_record_access(user, record_id)
        if not rec:
            return {'error': 'unauthorized'}
        try:
            p = request.env['petadigi.personel'].with_user(user.id).create({
                'strong_point_id': rec.id,
                'nama':    nama.strip(),
                'pangkat': (pangkat or '').strip(),
            })
            return {'success': True, 'id': p.id, 'nama_lengkap': p.nama_lengkap}
        except Exception as e:
            return {'error': str(e)}

    @http.route('/petadigi/api/personel_remove', type='jsonrpc', auth='public', csrf=False)
    def api_personel_remove(self, personel_id=None, **kwargs):
        user = self._auth_check()
        if not user or not personel_id:
            return {'error': 'unauthorized'}
        try:
            p = request.env['petadigi.personel'].sudo().browse(int(personel_id))
            if not p.exists() or p.strong_point_id.polres_id.id != user.polres_id.id:
                return {'error': 'unauthorized'}
            p.with_user(user.id).unlink()
            return {'success': True}
        except Exception as e:
            return {'error': str(e)}

    # ── API: Foto ─────────────────────────────────────────────────────────────

    @http.route('/petadigi/foto/<int:record_id>', type='http', auth='public', csrf=False)
    def strong_foto(self, record_id, **kwargs):
        user = self._auth_check()
        if not user:
            return request.not_found()
        rec = self._check_record_access(user, record_id)
        if not rec:
            return request.not_found()
        try:
            att = request.env['ir.attachment'].sudo().search([
                ('res_model', '=', 'petadigi.strong_point'),
                ('res_id',    '=', rec.id),
                ('res_field', '=', 'foto'),
            ], limit=1)
            if not att or not att.datas:
                return request.not_found()
            img_data = base64.b64decode(att.datas)
            filename  = att.name or 'foto.jpg'
            mime      = att.mimetype or (
                'image/jpeg' if filename.lower().endswith(('.jpg', '.jpeg')) else 'image/png'
            )
            headers = [
                ('Content-Type', mime),
                ('Content-Length', str(len(img_data))),
                ('Cache-Control', 'no-cache, no-store'),
            ]
            return request.make_response(img_data, headers)
        except Exception:
            return request.not_found()

    @http.route('/petadigi/api/upload_foto', type='jsonrpc', auth='public', csrf=False)
    def api_upload_foto(self, record_id=None, foto_data=None, foto_filename=None, **kwargs):
        user = self._auth_check()
        if not user or not record_id or not foto_data:
            return {'error': 'Data tidak lengkap'}
        rec = self._check_record_access(user, record_id)
        if not rec:
            return {'error': 'unauthorized'}
        try:
            if ',' in foto_data:
                foto_data = foto_data.split(',', 1)[1]
            _logger.info('[SP] upload_foto rec=%s filename=%s data_len=%s',
                         rec.id, foto_filename, len(foto_data))
            rec.with_user(user.id).write({
                'foto': foto_data,
                'foto_filename': foto_filename or 'foto.jpg',
            })
            # Verify attachment was created
            att = request.env['ir.attachment'].sudo().search([
                ('res_model', '=', 'petadigi.strong_point'),
                ('res_id',    '=', rec.id),
                ('res_field', '=', 'foto'),
            ], limit=1)
            _logger.info('[SP] upload_foto done: att_id=%s att.datas_size=%s',
                         att.id if att else None,
                         len(att.datas) if att and att.datas else 0)
            return {'success': True}
        except Exception as e:
            _logger.error('[SP] upload_foto error: %s', e, exc_info=True)
            return {'error': str(e)}

    # ── API: Set Selesai ──────────────────────────────────────────────────────

    @http.route('/petadigi/api/set_selesai', type='jsonrpc', auth='public', csrf=False)
    def api_set_selesai(self, record_id=None, tanggal_selesai=None, **kwargs):
        user = self._auth_check()
        if not user or not record_id:
            return {'error': 'unauthorized'}
        if not tanggal_selesai:
            return {'error': 'Tanggal selesai harus diisi'}
        rec = self._check_record_access(user, record_id)
        if not rec:
            return {'error': 'unauthorized'}
        try:
            rec.with_user(user.id).write({
                'state':          'SELESAI',
                'tanggal_selesai': tanggal_selesai,
            })
            return {'success': True}
        except Exception as e:
            return {'error': str(e)}
