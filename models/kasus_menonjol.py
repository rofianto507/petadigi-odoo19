from odoo import models, fields, api

class KasusMenunjol(models.Model):
    _name = 'petadigi.kasus_menonjol'
    _description = 'Kasus Menonjol'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'tanggal_kejadian desc'
    _rec_name = 'code'

    code = fields.Char('Kode', readonly=True, copy=False, default='New', tracking=True)
    no_lp = fields.Char('No. LP', required=True, tracking=True)
    kategori_id = fields.Many2one('petadigi.kategori_kamtibmas', string='Kategori', tracking=True)
    modus_operandi_id = fields.Many2one('petadigi.modus_operandi', string='Modus Operandi', tracking=True)
    jenis_tkp_id = fields.Many2one('petadigi.jenis_tkp', string='Jenis TKP', tracking=True)
    tanggal_kejadian = fields.Datetime('Tanggal Kejadian', tracking=True)
    tersangka = fields.Text('Tersangka', tracking=True)
    permasalahan = fields.Text('Permasalahan', tracking=True)
    penanganan = fields.Text('Penanganan', tracking=True)
    tindak_lanjut = fields.Text('Tindak Lanjut', tracking=True)
    sumber_dokumen_id = fields.Many2one(
        'petadigi.sumber_dokumen',
        string='Sumber Dokumen',
        domain=[('tipe_sumber', '=', 'KASUS MENONJOL')],
        tracking=True
    )
    state = fields.Selection([
        ('PROSES', 'PROSES'),
        ('SELESAI', 'SELESAI'),
    ], string='State', tracking=True, required=True, default='PROSES')
    subdit_id = fields.Many2one('petadigi.subdit', string='Tujuan', tracking=True)
    polres_id = fields.Many2one('petadigi.polres', string='Polres', tracking=True)
    polsek_id = fields.Many2one(
        'petadigi.polsek',
        string='Polsek',
        domain="[('polres_id', '=', polres_id)]",
        tracking=True
    )
    kabupaten_id = fields.Many2one('petadigi.kabupaten', string='Kabupaten/Kota', tracking=True)
    kecamatan_id = fields.Many2one(
        'petadigi.kecamatan',
        string='Kecamatan',
        domain="[('kabupaten_id', '=', kabupaten_id)]",
        tracking=True
    )
    desa_id = fields.Many2one(
        'petadigi.desa',
        string='Desa/Kelurahan',
        domain="[('kecamatan_id', '=', kecamatan_id)]",
        tracking=True
    )
    latitude = fields.Float('Latitude', digits=(10, 6), tracking=True)
    longitude = fields.Float('Longitude', digits=(10, 6), tracking=True)
    tindak_lanjut_ids = fields.One2many(
        'petadigi.tindak_lanjut', 'kasus_menonjol_id', string='Tindak Lanjut'
    )
    has_tindak_lanjut = fields.Boolean(
        'Ada Tindak Lanjut', compute='_compute_has_tindak_lanjut', store=True
    )

    @api.depends('tindak_lanjut_ids')
    def _compute_has_tindak_lanjut(self):
        for rec in self:
            rec.has_tindak_lanjut = bool(rec.tindak_lanjut_ids)

    def action_open_tindak_lanjut_wizard(self):
        return {
            'type': 'ir.actions.act_window',
            'name': 'Tambah Tindak Lanjut',
            'res_model': 'petadigi.tindak_lanjut.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {'default_kasus_menonjol_id': self.id},
        }

    def action_set_proses(self):
        self.state = 'PROSES'

    def action_set_selesai(self):
        self.state = 'SELESAI'

    @api.model
    def default_get(self, fields_list):
        defaults = super().default_get(fields_list)
        user = self.env.user
        if user.polres_id and 'polres_id' in fields_list:
            defaults.setdefault('polres_id', user.polres_id.id)
        if user.polsek_id and 'polsek_id' in fields_list:
            defaults.setdefault('polsek_id', user.polsek_id.id)
        if 'kabupaten_id' in fields_list:
            if user.polsek_id:
                kecs = self.env['petadigi.kecamatan'].search(
                    [('polsek_id', '=', user.polsek_id.id)], limit=2)
                kab_ids = kecs.mapped('kabupaten_id')
                if len(kab_ids) == 1:
                    defaults.setdefault('kabupaten_id', kab_ids.id)
            elif user.polres_id:
                kabs = self.env['petadigi.kabupaten'].search(
                    [('polres_id', '=', user.polres_id.id)], limit=2)
                if len(kabs) == 1:
                    defaults.setdefault('kabupaten_id', kabs.id)
        return defaults

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('code') or vals['code'] == 'New':
                vals['code'] = self.env['ir.sequence'].next_by_code('petadigi.kasus_menonjol.sequence') or 'New'
        return super().create(vals_list)

    @api.onchange('polres_id')
    def _onchange_polres_id(self):
        if self.polsek_id and self.polsek_id.polres_id != self.polres_id:
            self.polsek_id = False

    @api.onchange('kabupaten_id')
    def _onchange_kabupaten_id(self):
        self.kecamatan_id = False

    @api.onchange('kecamatan_id')
    def _onchange_kecamatan_id(self):
        self.desa_id = False
        if self.kecamatan_id and not self.kabupaten_id:
            self.kabupaten_id = self.kecamatan_id.kabupaten_id
