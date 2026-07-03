from odoo import models, fields, api


class StrongPoint(models.Model):
    _name = 'petadigi.strong_point'
    _description = 'Strong Point - Titik Konsentrasi Tugas Lapangan'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'tanggal_mulai desc'
    _rec_name = 'code'

    code = fields.Char('Kode', readonly=True, copy=False, default='New', tracking=True)
    lokasi_id = fields.Many2one('petadigi.lokasi_strong_point', string='Lokasi Strong Point',
                                tracking=True)
    lokasi_lat = fields.Float(related='lokasi_id.lat', string='Lokasi Lat', store=False)
    lokasi_lng = fields.Float(related='lokasi_id.lng', string='Lokasi Lng', store=False)
    lokasi_nama = fields.Char(related='lokasi_id.nama', string='Nama Lokasi', store=False)
    personel_ids = fields.One2many('petadigi.personel', 'strong_point_id', string='Personel')
    personel_count = fields.Integer('Total Personel', compute='_compute_personel_count', store=True)
    polres_id = fields.Many2one('petadigi.polres', string='Polres', required=True, tracking=True)
    polsek_id = fields.Many2one(
        'petadigi.polsek', string='Polsek',
        domain="[('polres_id', '=', polres_id)]",
        tracking=True
    )
    kabupaten_id = fields.Many2one(
        'petadigi.kabupaten', string='Kabupaten/Kota',
        domain="[('polres_id', '=', polres_id)]",
        tracking=True
    )
    kecamatan_id = fields.Many2one(
        'petadigi.kecamatan', string='Kecamatan',
        domain="[('kabupaten_id', '=', kabupaten_id)]",
        tracking=True
    )
    desa_id = fields.Many2one(
        'petadigi.desa', string='Desa/Kelurahan',
        domain="[('kecamatan_id', '=', kecamatan_id)]",
        tracking=True
    )
    tanggal_mulai = fields.Datetime('Tanggal Mulai', required=True, tracking=True,
                                    default=fields.Datetime.now)
    tanggal_selesai = fields.Datetime('Tanggal Selesai', tracking=True)
    latitude = fields.Float('Latitude', digits=(10, 6), tracking=True, aggregator=False)
    longitude = fields.Float('Longitude', digits=(10, 6), tracking=True, aggregator=False)
    foto = fields.Binary('Foto Dokumentasi', attachment=True)
    foto_filename = fields.Char('Nama File Foto')
    keterangan_lokasi = fields.Char('Keterangan Lokasi', tracking=True)
    keterangan = fields.Text('Keterangan', tracking=True)
    subdit_id = fields.Many2one('petadigi.subdit', string='Subdit', tracking=True,
                                help='Diisi otomatis dari form publik atau user subdit yang input')
    state = fields.Selection([
        ('PROSES', 'PROSES'),
        ('SELESAI', 'SELESAI'),
    ], string='Status', required=True, default='PROSES', tracking=True)

    @api.depends('personel_ids')
    def _compute_personel_count(self):
        for rec in self:
            rec.personel_count = len(rec.personel_ids)

    def action_view_personel(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': 'Personel',
            'res_model': 'petadigi.personel',
            'view_mode': 'list,form',
            'domain': [('strong_point_id', '=', self.id)],
            'context': {'default_strong_point_id': self.id},
        }

    @api.model
    def default_get(self, fields_list):
        defaults = super().default_get(fields_list)
        user = self.env.user
        if user.polres_id and 'polres_id' in fields_list:
            defaults.setdefault('polres_id', user.polres_id.id)
        if user.polsek_id and 'polsek_id' in fields_list:
            defaults.setdefault('polsek_id', user.polsek_id.id)
        if user.subdit_id and 'subdit_id' in fields_list:
            defaults.setdefault('subdit_id', user.subdit_id.id)
        if 'kabupaten_id' in fields_list and user.polres_id:
            kabs = self.env['petadigi.kabupaten'].search(
                [('polres_id', '=', user.polres_id.id)], limit=2)
            if len(kabs) == 1:
                defaults.setdefault('kabupaten_id', kabs.id)
        return defaults

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('code') or vals['code'] == 'New':
                vals['code'] = self.env['ir.sequence'].next_by_code(
                    'petadigi.strong_point.sequence') or 'New'
        return super().create(vals_list)

    def action_set_selesai(self):
        self.write({'state': 'SELESAI'})

    def action_set_proses(self):
        self.write({'state': 'PROSES'})

    @api.onchange('polres_id')
    def _onchange_polres_id(self):
        if self.polsek_id and self.polsek_id.polres_id != self.polres_id:
            self.polsek_id = False
        if self.kabupaten_id and self.kabupaten_id.polres_id != self.polres_id:
            self.kabupaten_id = False
        self.kecamatan_id = False
        self.desa_id = False
        self.lokasi_id = False

    @api.onchange('polsek_id')
    def _onchange_polsek_id(self):
        self.lokasi_id = False

    @api.onchange('kabupaten_id')
    def _onchange_kabupaten_id(self):
        self.kecamatan_id = False

    @api.onchange('kecamatan_id')
    def _onchange_kecamatan_id(self):
        self.desa_id = False
