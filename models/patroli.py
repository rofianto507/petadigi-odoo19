from odoo import models, fields, api


class Patroli(models.Model):
    _name = 'petadigi.patroli'
    _description = 'Patroli — Pencatatan Kegiatan Patroli Wilayah'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'tanggal_mulai desc'
    _rec_name = 'code'

    code = fields.Char('Kode', readonly=True, copy=False, default='New', tracking=True)
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
    personel_ids = fields.One2many('petadigi.personel_patroli', 'patroli_id', string='Personel')
    personel_count = fields.Integer('Total Personel', compute='_compute_personel_count', store=True)
    lokasi_ids = fields.One2many('petadigi.lokasi_patroli', 'patroli_id', string='Lokasi Patroli')
    lokasi_count = fields.Integer('Total Lokasi', compute='_compute_lokasi_count', store=True)
    keterangan = fields.Text('Keterangan', tracking=True)
    state = fields.Selection([
        ('PROSES', 'PROSES'),
        ('SELESAI', 'SELESAI'),
    ], string='Status', required=True, default='PROSES', tracking=True)

    @api.depends('personel_ids')
    def _compute_personel_count(self):
        for rec in self:
            rec.personel_count = len(rec.personel_ids)

    @api.depends('lokasi_ids')
    def _compute_lokasi_count(self):
        for rec in self:
            rec.lokasi_count = len(rec.lokasi_ids)

    def action_view_personel(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': 'Personel Patroli',
            'res_model': 'petadigi.personel_patroli',
            'view_mode': 'list,form',
            'domain': [('patroli_id', '=', self.id)],
            'context': {'default_patroli_id': self.id},
        }

    @api.model
    def default_get(self, fields_list):
        defaults = super().default_get(fields_list)
        user = self.env.user
        if user.polres_id and 'polres_id' in fields_list:
            defaults.setdefault('polres_id', user.polres_id.id)
        if user.polsek_id and 'polsek_id' in fields_list:
            defaults.setdefault('polsek_id', user.polsek_id.id)
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
                    'petadigi.patroli.sequence') or 'New'
        return super().create(vals_list)

    def action_view_lokasi(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': 'Lokasi Patroli',
            'res_model': 'petadigi.lokasi_patroli',
            'view_mode': 'list,form',
            'domain': [('patroli_id', '=', self.id)],
            'context': {'default_patroli_id': self.id},
        }

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

    @api.onchange('kabupaten_id')
    def _onchange_kabupaten_id(self):
        self.kecamatan_id = False

    @api.onchange('kecamatan_id')
    def _onchange_kecamatan_id(self):
        self.desa_id = False
