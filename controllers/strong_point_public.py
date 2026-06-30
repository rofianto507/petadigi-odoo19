from odoo import http
from odoo.http import request
from datetime import datetime, timedelta
import json
import base64
import logging

_logger = logging.getLogger(__name__)

_WIB_OFFSET = timedelta(hours=7)


def _today_utc_range_wib():
    """Return (start, end) UTC naive datetime strings for 'today' in WIB (UTC+7)."""
    now_wib   = datetime.utcnow() + _WIB_OFFSET
    today_wib = now_wib.date()
    wib_start = datetime(today_wib.year, today_wib.month, today_wib.day, 0, 0, 0)
    wib_end   = datetime(today_wib.year, today_wib.month, today_wib.day, 23, 59, 59)
    utc_start = (wib_start - _WIB_OFFSET).strftime('%Y-%m-%d %H:%M:%S')
    utc_end   = (wib_end   - _WIB_OFFSET).strftime('%Y-%m-%d %H:%M:%S')
    return utc_start, utc_end


def _wib_to_utc(dt_str):
    """Convert naive WIB datetime string to UTC datetime string for Odoo storage."""
    if not dt_str:
        return dt_str
    try:
        dt = datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S')
        return (dt - _WIB_OFFSET).strftime('%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError):
        return dt_str


class StrongPointPublicController(http.Controller):

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _auth_check(self):
        user = request.env.user
        if user._is_public():
            return None
        if not user.polres_id and not user.has_group('petadigi.group_subdit_strong_point'):
            return None
        return user

    def _build_user_ctx(self, user):
        is_polsek    = bool(user.polsek_id)
        is_subdit_sp = user.has_group('petadigi.group_subdit_strong_point')
        polres       = user.polres_id
        polsek       = user.polsek_id

        ctx = {
            'user_id':      user.id,
            'user_name':    user.name,
            'user_login':   user.login,
            'is_polsek':    is_polsek,
            'is_subdit_sp': is_subdit_sp,
            'polres_id':    polres.id   if polres else None,
            'polres_name':  polres.name if polres else None,
            'polsek_id':    polsek.id   if polsek else None,
            'polsek_name':  polsek.name if polsek else None,
        }

        if is_subdit_sp:
            kabupaten_list = request.env['petadigi.kabupaten'].sudo().search_read(
                [], ['id', 'name'], order='name asc',
            )
            # Subdit Strong Point selalu atas nama Polda (polres tanpa polsek) — auto-assign
            polda = self._get_polda_polres()
            ctx['polres_id']      = polda.id   if polda else None
            ctx['polres_name']    = polda.name if polda else None
            ctx['kabupaten_list'] = kabupaten_list
            ctx['polres_list']    = []
            ctx['polsek_list']    = []
            ctx['kecamatan_list'] = []
        else:
            kabupaten_list = request.env['petadigi.kabupaten'].sudo().search_read(
                [('polres_id', '=', polres.id)], ['id', 'name'], order='name asc',
            )
            ctx['kabupaten_list'] = kabupaten_list
            ctx['polres_list']    = []

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
        SP = request.env['petadigi.strong_point'].sudo()
        record = SP.browse(int(record_id))
        if not record.exists():
            return None
        if user.has_group('petadigi.group_subdit_strong_point'):
            return record if record.create_uid.id == user.id else None
        if record.polres_id.id != user.polres_id.id:
            return None
        if user.polsek_id and record.polsek_id and record.polsek_id.id != user.polsek_id.id:
            return None
        return record

    # ── Routes ───────────────────────────────────────────────────────────────

    # ── PWA: Manifest & Service Worker ───────────────────────────────────────

    @http.route('/petadigi/manifest.json', type='http', auth='public', csrf=False, website=False)
    def pwa_manifest(self, **kwargs):
        manifest = {
            "name": "PetaDigi Mobile",
            "short_name": "PetaDigi",
            "description": "Sistem Pemetaan Digital - Polri",
            "start_url": "/petadigi/form",
            "scope": "/petadigi/",
            "display": "standalone",
            "orientation": "portrait-primary",
            "background_color": "#71639e",
            "theme_color": "#71639e",
            "lang": "id",
            "icons": [
                {"src": "/petadigi/static/img/icons/icon-72.png",  "sizes": "72x72",   "type": "image/png", "purpose": "any"},
                {"src": "/petadigi/static/img/icons/icon-96.png",  "sizes": "96x96",   "type": "image/png", "purpose": "any"},
                {"src": "/petadigi/static/img/icons/icon-128.png", "sizes": "128x128", "type": "image/png", "purpose": "any"},
                {"src": "/petadigi/static/img/icons/icon-144.png", "sizes": "144x144", "type": "image/png", "purpose": "any"},
                {"src": "/petadigi/static/img/icons/icon-152.png", "sizes": "152x152", "type": "image/png", "purpose": "any"},
                {"src": "/petadigi/static/img/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
                {"src": "/petadigi/static/img/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable"},
                {"src": "/petadigi/static/img/icons/icon-384.png", "sizes": "384x384", "type": "image/png", "purpose": "any"},
                {"src": "/petadigi/static/img/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                {"src": "/petadigi/static/img/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
            ],
        }
        return request.make_response(
            json.dumps(manifest),
            headers=[
                ('Content-Type', 'application/manifest+json'),
                ('Cache-Control', 'no-cache, no-store, must-revalidate'),
            ],
        )

    @http.route('/petadigi/sw.js', type='http', auth='public', csrf=False, website=False)
    def pwa_service_worker(self, **kwargs):
        sw = """
const CACHE = 'petadigi-v2';
const SHELL = [
  '/petadigi/static/lib/fontawesome/css/font-awesome.css',
  '/petadigi/static/lib/leaflet/leaflet.css',
  '/petadigi/static/lib/leaflet/leaflet.js',
  '/petadigi/static/lib/echart/echarts.min.js',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Cache-first for static assets; network-first for API / HTML
  if (SHELL.some(s => url.pathname === s)) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
  // everything else: network only (Odoo session / API must stay fresh)
});
"""
        return request.make_response(
            sw,
            headers=[
                ('Content-Type', 'application/javascript'),
                ('Service-Worker-Allowed', '/petadigi/'),
                ('Cache-Control', 'no-cache'),
            ],
        )

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
                is_sp = user.has_group('petadigi.group_subdit_strong_point')
                if not user.polres_id and not is_sp:
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
        is_subdit_sp = user.has_group('petadigi.group_subdit_strong_point')
        SP   = request.env['petadigi.strong_point'].sudo()
        base = ([('create_uid', '=', user.id)] if is_subdit_sp
                else [('polsek_id', '=', user.polsek_id.id)] if user.polsek_id
                else [('polres_id', '=', user.polres_id.id)])

        # Total keseluruhan
        total    = SP.search_count(base)
        groups   = SP.read_group(base, ['personel_count:sum'], [])
        personel = groups[0]['personel_count'] if groups else 0

        # Hari ini (boundary dalam WIB, disimpan sebagai UTC di DB)
        utc_start, utc_end = _today_utc_range_wib()
        today_dom      = base + [('tanggal_mulai', '>=', utc_start),
                                  ('tanggal_mulai', '<=', utc_end)]
        total_today    = SP.search_count(today_dom)
        groups_today   = SP.read_group(today_dom, ['personel_count:sum'], [])
        personel_today = groups_today[0]['personel_count'] if groups_today else 0

        P      = request.env['petadigi.patroli'].sudo()
        base_p = ([('create_uid', '=', user.id)] if is_subdit_sp
                  else [('polsek_id', '=', user.polsek_id.id)] if user.polsek_id
                  else [('polres_id', '=', user.polres_id.id)])
        today_domain = base_p + [('tanggal_mulai', '>=', utc_start),
                                   ('tanggal_mulai', '<=', utc_end)]
        total_p = P.search_count(base_p)
        today_p = P.search_count(today_domain)
        titik_total = sum(r['lokasi_count'] for r in P.search_read(base_p, ['lokasi_count']))
        titik_today = sum(r['lokasi_count'] for r in P.search_read(today_domain, ['lokasi_count']))

        def _fmt(dt):
            return dt.strftime('%Y-%m-%d %H:%M:%S') if dt else ''

        sp_rec = SP.search_read(base, ['id', 'code', 'state', 'tanggal_mulai', 'kecamatan_id', 'lokasi_nama'],
                                order='tanggal_mulai desc', limit=5)
        pt_rec = P.search_read(base_p, ['id', 'code', 'state', 'tanggal_mulai', 'kecamatan_id'],
                               order='tanggal_mulai desc', limit=5)
        activities = []
        for r in sp_rec:
            activities.append({
                'type': 'strong_point', 'id': r['id'], 'code': r['code'], 'state': r['state'],
                'tanggal': _fmt(r['tanggal_mulai']),
                'lokasi': (r['kecamatan_id'][1] if r.get('kecamatan_id') else '') or (r.get('lokasi_nama') or ''),
            })
        for r in pt_rec:
            activities.append({
                'type': 'patroli', 'id': r['id'], 'code': r['code'], 'state': r['state'],
                'tanggal': _fmt(r['tanggal_mulai']),
                'lokasi': r['kecamatan_id'][1] if r.get('kecamatan_id') else '',
            })
        activities.sort(key=lambda x: x['tanggal'] or '', reverse=True)

        return {
            'strong_point': {
                'total': total, 'personel': personel,
                'today': total_today, 'personel_today': personel_today,
            },
            'patroli': {
                'total': total_p, 'today': today_p,
                'titik_total': titik_total, 'titik_today': titik_today,
            },
            'recent': activities[:5],
        }

    # ── API: Weekly chart data ────────────────────────────────────────────────

    @http.route('/petadigi/api/weekly', type='jsonrpc', auth='public', csrf=False)
    def api_weekly(self, **kwargs):
        user = self._auth_check()
        if not user:
            return {'error': 'unauthorized'}
        is_subdit_sp = user.has_group('petadigi.group_subdit_strong_point')
        SP   = request.env['petadigi.strong_point'].sudo()
        base = ([('create_uid', '=', user.id)] if is_subdit_sp
                else [('polsek_id', '=', user.polsek_id.id)] if user.polsek_id
                else [('polres_id', '=', user.polres_id.id)])

        now_wib    = datetime.utcnow() + _WIB_OFFSET
        today_wib  = now_wib.date()
        day_names  = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
        days = []
        for i in range(6, -1, -1):
            d        = today_wib - timedelta(days=i)
            wib_s    = datetime(d.year, d.month, d.day, 0, 0, 0)
            wib_e    = datetime(d.year, d.month, d.day, 23, 59, 59)
            utc_s    = (wib_s - _WIB_OFFSET).strftime('%Y-%m-%d %H:%M:%S')
            utc_e    = (wib_e - _WIB_OFFSET).strftime('%Y-%m-%d %H:%M:%S')
            dom      = base + [('tanggal_mulai', '>=', utc_s),
                                ('tanggal_mulai', '<=', utc_e)]
            count    = SP.search_count(dom)
            days.append({'label': day_names[d.weekday()], 'date': str(d), 'count': count})
        return {'days': days}

    # ── API: Lokasi & Wilayah ─────────────────────────────────────────────────

    @http.route('/petadigi/api/lokasi', type='jsonrpc', auth='public', csrf=False)
    def api_lokasi(self, **kwargs):
        user = self._auth_check()
        if not user:
            return []
        is_subdit_sp = user.has_group('petadigi.group_subdit_strong_point')
        if is_subdit_sp:
            domain = [('state', '=', 'aktif'), ('create_uid', '=', user.id)]
        elif user.polsek_id:
            domain = [
                ('polres_id', '=', user.polres_id.id),
                ('polsek_id', '=', user.polsek_id.id),
                ('state',     '=', 'aktif'),
            ]
        else:
            domain = [
                ('polres_id', '=', user.polres_id.id),
                ('polsek_id', '=', False),
                ('state',     '=', 'aktif'),
            ]
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
    def api_list(self, offset=0, limit=20, filter=None, kabupaten_id=None, state=None, **kwargs):
        user = self._auth_check()
        if not user:
            return []
        is_subdit_sp = user.has_group('petadigi.group_subdit_strong_point')
        SP   = request.env['petadigi.strong_point'].sudo()
        base = ([('create_uid', '=', user.id)] if is_subdit_sp
                else [('polsek_id', '=', user.polsek_id.id)] if user.polsek_id
                else [('polres_id', '=', user.polres_id.id)])
        if filter == 'today':
            utc_start, utc_end = _today_utc_range_wib()
            base = base + [('tanggal_mulai', '>=', utc_start),
                           ('tanggal_mulai', '<=', utc_end)]
        if kabupaten_id:
            base = base + [('kabupaten_id', '=', int(kabupaten_id))]
        if state:
            base = base + [('state', '=', state)]
        records = SP.search_read(
            base,
            ['id', 'code', 'state', 'lokasi_nama', 'tanggal_mulai', 'personel_count', 'polres_id', 'kabupaten_id'],
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
        is_subdit_sp = user.has_group('petadigi.group_subdit_strong_point')
        try:
            if is_subdit_sp:
                resolved_polsek = False
                polda = self._get_polda_polres()
                if not polda:
                    return {'error': 'Data Polda tidak ditemukan'}
                resolved_polres = polda.id
            else:
                if user.polsek_id:
                    resolved_polsek = user.polsek_id.id
                elif kwargs.get('polsek_id'):
                    ps = request.env['petadigi.polsek'].sudo().browse(int(kwargs['polsek_id']))
                    if not ps.exists() or ps.polres_id.id != user.polres_id.id:
                        return {'error': 'unauthorized'}
                    resolved_polsek = ps.id
                else:
                    resolved_polsek = False
                resolved_polres = user.polres_id.id
            vals = {
                'polres_id':     resolved_polres,
                'polsek_id':     resolved_polsek,
                'lokasi_id':     int(kwargs['lokasi_id'])    if kwargs.get('lokasi_id')    else False,
                'kabupaten_id':  int(kwargs['kabupaten_id']) if kwargs.get('kabupaten_id') else False,
                'kecamatan_id':  int(kwargs['kecamatan_id']) if kwargs.get('kecamatan_id') else False,
                'desa_id':       int(kwargs['desa_id'])      if kwargs.get('desa_id')      else False,
                'tanggal_mulai': _wib_to_utc(kwargs.get('tanggal_mulai')) or False,
                'latitude':      float(kwargs['latitude'])   if kwargs.get('latitude')     else 0.0,
                'longitude':     float(kwargs['longitude'])  if kwargs.get('longitude')    else 0.0,
                'keterangan':    kwargs.get('keterangan')    or '',
                'state':         'PROSES',
            }
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
            'keterangan':     rec.keterangan or '',
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
            if not p.exists():
                return {'error': 'unauthorized'}
            if user.has_group('petadigi.group_subdit_strong_point'):
                if p.strong_point_id.create_uid.id != user.id:
                    return {'error': 'unauthorized'}
            elif p.strong_point_id.polres_id.id != user.polres_id.id:
                return {'error': 'unauthorized'}
            p.with_user(user.id).unlink()
            return {'success': True}
        except Exception as e:
            return {'error': str(e)}

    # ── API: Update foto profil ───────────────────────────────────────────────

    @http.route('/petadigi/api/update_photo', type='jsonrpc', auth='public', csrf=False)
    def api_update_photo(self, foto_data=None, **kwargs):
        user = self._auth_check()
        if not user or not foto_data:
            return {'error': 'unauthorized'}
        try:
            if ',' in foto_data:
                foto_data = foto_data.split(',', 1)[1]
            request.env['res.users'].sudo().browse(user.id).write({'image_1920': foto_data})
            return {'success': True}
        except Exception as e:
            _logger.error('update_photo error: %s', e, exc_info=True)
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
                'state':           'SELESAI',
                'tanggal_selesai': _wib_to_utc(tanggal_selesai),
            })
            return {'success': True}
        except Exception as e:
            return {'error': str(e)}

    # ════════════════════════════════════════════════════════════════════════
    # PATROLI API
    # ════════════════════════════════════════════════════════════════════════

    def _check_patroli_access(self, user, record_id):
        rec = request.env['petadigi.patroli'].sudo().browse(int(record_id))
        if not rec.exists():
            return None
        if user.has_group('petadigi.group_subdit_strong_point'):
            return rec if rec.create_uid.id == user.id else None
        if rec.polres_id.id != user.polres_id.id:
            return None
        if user.polsek_id and rec.polsek_id and rec.polsek_id.id != user.polsek_id.id:
            return None
        return rec

    def _lokasi_patroli_authorized(self, user, lokasi):
        if not lokasi.exists():
            return False
        if user.has_group('petadigi.group_subdit_strong_point'):
            return lokasi.patroli_id.create_uid.id == user.id
        return lokasi.patroli_id.polres_id.id == user.polres_id.id

    def _get_polda_polres(self):
        """Polres level Polda (tanpa polsek) — auto-assign untuk Subdit Strong Point."""
        return request.env['petadigi.polres'].sudo().search([('polsek_count', '=', 0)], limit=1)

    @http.route('/petadigi/api/patroli/list', type='jsonrpc', auth='public', csrf=False)
    def api_patroli_list(self, offset=0, limit=20, filter=None, kabupaten_id=None, state=None, **kwargs):
        user = self._auth_check()
        if not user:
            return []
        is_subdit_sp = user.has_group('petadigi.group_subdit_strong_point')
        P    = request.env['petadigi.patroli'].sudo()
        base = ([('create_uid', '=', user.id)] if is_subdit_sp
                else [('polsek_id', '=', user.polsek_id.id)] if user.polsek_id
                else [('polres_id', '=', user.polres_id.id)])
        if filter == 'today':
            utc_start, utc_end = _today_utc_range_wib()
            base = base + [('tanggal_mulai', '>=', utc_start),
                           ('tanggal_mulai', '<=', utc_end)]
        elif filter == 'aktif':
            base = base + [('state', '=', 'PROSES')]
        if kabupaten_id:
            base = base + [('kabupaten_id', '=', int(kabupaten_id))]
        if state:
            base = base + [('state', '=', state)]
        records = P.search_read(
            base,
            ['id', 'code', 'state', 'tanggal_mulai', 'personel_count', 'lokasi_count', 'polres_id', 'kabupaten_id'],
            order='tanggal_mulai desc',
            offset=int(offset),
            limit=int(limit),
        )
        for r in records:
            if r.get('tanggal_mulai'):
                r['tanggal_mulai'] = r['tanggal_mulai'].strftime('%Y-%m-%d %H:%M:%S')
        return records

    @http.route('/petadigi/api/patroli/record', type='jsonrpc', auth='public', csrf=False)
    def api_patroli_record(self, record_id=None, **kwargs):
        user = self._auth_check()
        if not user or not record_id:
            return {'error': 'unauthorized'}
        rec = self._check_patroli_access(user, record_id)
        if not rec:
            return {'error': 'not found'}

        def _fmt(dt):
            return dt.strftime('%Y-%m-%d %H:%M:%S') if dt else ''

        return {
            'id':              rec.id,
            'code':            rec.code,
            'state':           rec.state,
            'polres_nama':     rec.polres_id.name    if rec.polres_id    else '',
            'polsek_nama':     rec.polsek_id.name    if rec.polsek_id    else '',
            'kabupaten_nama':  rec.kabupaten_id.name if rec.kabupaten_id else '',
            'kecamatan_nama':  rec.kecamatan_id.name if rec.kecamatan_id else '',
            'desa_nama':       rec.desa_id.name      if rec.desa_id      else '',
            'tanggal_mulai':   _fmt(rec.tanggal_mulai),
            'tanggal_selesai': _fmt(rec.tanggal_selesai),
            'personel_count':  rec.personel_count,
            'lokasi_count':    rec.lokasi_count,
            'keterangan':      rec.keterangan or '',
            'personel': [
                {'id': p.id, 'nama_lengkap': p.nama_lengkap, 'pangkat': p.pangkat or ''}
                for p in rec.personel_ids
            ],
            'lokasi': [
                {
                    'id':        l.id,
                    'tanggal':   _fmt(l.tanggal),
                    'latitude':  l.latitude,
                    'longitude': l.longitude,
                    'catatan':   l.catatan or '',
                    'has_foto':  bool(l.foto),
                }
                for l in rec.lokasi_ids.sorted('tanggal')
            ],
        }

    @http.route('/petadigi/api/patroli/create', type='jsonrpc', auth='public', csrf=False)
    def api_patroli_create(self, **kwargs):
        user = self._auth_check()
        if not user:
            return {'error': 'Sesi habis. Silakan login kembali.'}
        is_subdit_sp = user.has_group('petadigi.group_subdit_strong_point')
        try:
            if is_subdit_sp:
                resolved_polsek = False
                polda = self._get_polda_polres()
                if not polda:
                    return {'error': 'Data Polda tidak ditemukan'}
                resolved_polres = polda.id
            else:
                if user.polsek_id:
                    resolved_polsek = user.polsek_id.id
                elif kwargs.get('polsek_id'):
                    ps = request.env['petadigi.polsek'].sudo().browse(int(kwargs['polsek_id']))
                    if not ps.exists() or ps.polres_id.id != user.polres_id.id:
                        return {'error': 'unauthorized'}
                    resolved_polsek = ps.id
                else:
                    resolved_polsek = False
                resolved_polres = user.polres_id.id
            vals = {
                'polres_id':     resolved_polres,
                'polsek_id':     resolved_polsek,
                'kabupaten_id':  int(kwargs['kabupaten_id']) if kwargs.get('kabupaten_id') else False,
                'kecamatan_id':  int(kwargs['kecamatan_id']) if kwargs.get('kecamatan_id') else False,
                'desa_id':       int(kwargs['desa_id'])      if kwargs.get('desa_id')      else False,
                'tanggal_mulai': _wib_to_utc(kwargs.get('tanggal_mulai')) or False,
                'keterangan':    kwargs.get('keterangan') or '',
                'state':         'PROSES',
            }
            record = request.env['petadigi.patroli'].with_user(user.id).create(vals)
            return {'success': True, 'code': record.code, 'record_id': record.id}
        except Exception as e:
            _logger.error('Patroli create error: %s', e, exc_info=True)
            return {'error': str(e)}

    @http.route('/petadigi/api/patroli/set_selesai', type='jsonrpc', auth='public', csrf=False)
    def api_patroli_set_selesai(self, record_id=None, tanggal_selesai=None, **kwargs):
        user = self._auth_check()
        if not user or not record_id:
            return {'error': 'unauthorized'}
        if not tanggal_selesai:
            return {'error': 'Tanggal selesai harus diisi'}
        rec = self._check_patroli_access(user, record_id)
        if not rec:
            return {'error': 'unauthorized'}
        try:
            rec.with_user(user.id).write({
                'state':           'SELESAI',
                'tanggal_selesai': _wib_to_utc(tanggal_selesai),
            })
            return {'success': True}
        except Exception as e:
            return {'error': str(e)}

    @http.route('/petadigi/api/patroli/personel_add', type='jsonrpc', auth='public', csrf=False)
    def api_patroli_personel_add(self, record_id=None, nama=None, pangkat=None, **kwargs):
        user = self._auth_check()
        if not user or not record_id or not nama:
            return {'error': 'Data tidak lengkap'}
        rec = self._check_patroli_access(user, record_id)
        if not rec:
            return {'error': 'unauthorized'}
        try:
            p = request.env['petadigi.personel_patroli'].with_user(user.id).create({
                'patroli_id': rec.id,
                'nama':       nama.strip(),
                'pangkat':    (pangkat or '').strip(),
            })
            return {'success': True, 'id': p.id, 'nama_lengkap': p.nama_lengkap}
        except Exception as e:
            return {'error': str(e)}

    @http.route('/petadigi/api/patroli/personel_remove', type='jsonrpc', auth='public', csrf=False)
    def api_patroli_personel_remove(self, personel_id=None, **kwargs):
        user = self._auth_check()
        if not user or not personel_id:
            return {'error': 'unauthorized'}
        try:
            p = request.env['petadigi.personel_patroli'].sudo().browse(int(personel_id))
            if not p.exists():
                return {'error': 'unauthorized'}
            if user.has_group('petadigi.group_subdit_strong_point'):
                if p.patroli_id.create_uid.id != user.id:
                    return {'error': 'unauthorized'}
            elif p.patroli_id.polres_id.id != user.polres_id.id:
                return {'error': 'unauthorized'}
            p.with_user(user.id).unlink()
            return {'success': True}
        except Exception as e:
            return {'error': str(e)}

    @http.route('/petadigi/api/patroli/lokasi_add', type='jsonrpc', auth='public', csrf=False)
    def api_patroli_lokasi_add(self, record_id=None, latitude=None, longitude=None,
                                catatan=None, tanggal=None, **kwargs):
        user = self._auth_check()
        if not user or not record_id:
            return {'error': 'unauthorized'}
        rec = self._check_patroli_access(user, record_id)
        if not rec:
            return {'error': 'unauthorized'}
        try:
            tgl_utc = (_wib_to_utc(tanggal) if tanggal
                       else datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'))
            l = request.env['petadigi.lokasi_patroli'].with_user(user.id).create({
                'patroli_id': rec.id,
                'tanggal':    tgl_utc,
                'latitude':   float(latitude)  if latitude  else 0.0,
                'longitude':  float(longitude) if longitude else 0.0,
                'catatan':    catatan or '',
            })
            return {'success': True, 'id': l.id}
        except Exception as e:
            _logger.error('Patroli lokasi_add error: %s', e, exc_info=True)
            return {'error': str(e)}

    @http.route('/petadigi/api/patroli/lokasi_foto', type='jsonrpc', auth='public', csrf=False)
    def api_patroli_lokasi_foto(self, lokasi_id=None, foto_data=None, foto_filename=None, **kwargs):
        user = self._auth_check()
        if not user or not lokasi_id or not foto_data:
            return {'error': 'Data tidak lengkap'}
        try:
            l = request.env['petadigi.lokasi_patroli'].sudo().browse(int(lokasi_id))
            if not self._lokasi_patroli_authorized(user, l):
                return {'error': 'unauthorized'}
            if ',' in foto_data:
                foto_data = foto_data.split(',', 1)[1]
            l.with_user(user.id).write({'foto': foto_data})
            return {'success': True}
        except Exception as e:
            _logger.error('Patroli lokasi_foto error: %s', e, exc_info=True)
            return {'error': str(e)}

    @http.route('/petadigi/api/patroli/lokasi_remove', type='jsonrpc', auth='public', csrf=False)
    def api_patroli_lokasi_remove(self, lokasi_id=None, **kwargs):
        user = self._auth_check()
        if not user or not lokasi_id:
            return {'error': 'unauthorized'}
        try:
            l = request.env['petadigi.lokasi_patroli'].sudo().browse(int(lokasi_id))
            if not self._lokasi_patroli_authorized(user, l):
                return {'error': 'unauthorized'}
            l.with_user(user.id).unlink()
            return {'success': True}
        except Exception as e:
            _logger.error('Patroli lokasi_remove error: %s', e, exc_info=True)
            return {'error': str(e)}
