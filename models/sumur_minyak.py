from odoo import models, fields, api


class SumurMinyak(models.Model):
    _name = 'petadigi.sumur_minyak'
    _description = 'Sumur Minyak Masyarakat'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'name asc'
    _rec_name = 'code'

    code = fields.Char('Kode', readonly=True, copy=False, default='New', tracking=True)
    name = fields.Char('Nama Sumur', required=True, tracking=True)
    kategori_id = fields.Many2one('petadigi.kategori_sumur_minyak', string='Kategori', tracking=True)
    kategori_kode = fields.Selection(
        related='kategori_id.kode',
        selection=[
            ('sumur_masyarakat', 'Sumur Masyarakat'),
            ('bku', 'BKU'),
            ('k3s', 'K3S'),
        ],
        string='Kode Kategori',
        store=True,
    )

    desa_id = fields.Many2one('petadigi.desa', string='Desa/Kelurahan', tracking=True)
    kecamatan_id = fields.Many2one(
        'petadigi.kecamatan',
        string='Kecamatan',
        domain="[('kabupaten_id', '=', kabupaten_id)]",
        tracking=True,
    )
    kabupaten_id = fields.Many2one('petadigi.kabupaten', string='Kabupaten/Kota', tracking=True)

    latitude = fields.Float('Latitude', digits=(10, 6), tracking=True, aggregator=False)
    longitude = fields.Float('Longitude', digits=(10, 6), tracking=True, aggregator=False)
    foto = fields.Binary('Foto', attachment=True)
    foto_filename = fields.Char('Nama File Foto')

    sumber_dokumen_id = fields.Many2one(
        'petadigi.sumber_dokumen',
        string='Sumber Dokumen',
        domain=[('tipe_sumber', '=', 'SUMUR MINYAK')],
        tracking=True,
    )

    minyak_produksi = fields.Float('Minyak Produksi', digits=(10, 2), tracking=True)
    minyak_masuk = fields.Float('Minyak Masuk', digits=(10, 2), tracking=True)
    minyak_tersedia = fields.Float('Minyak Tersedia', digits=(10, 2), tracking=True)
    minyak_keluar = fields.Float('Minyak Keluar', digits=(10, 2), tracking=True)
    minyak_ditolak = fields.Float('Minyak Ditolak', digits=(10, 2), tracking=True)

    total_minyak = fields.Float(
        'Total Minyak',
        digits=(10, 2),
        compute='_compute_total_minyak',
        store=True,
        aggregator='sum',
    )

    nama_surveyor = fields.Char('Nama Surveyor', tracking=True)
    hp_surveyor = fields.Char('No. HP Surveyor', tracking=True)

    state = fields.Selection([
        ('AKTIF', 'AKTIF'),
        ('TIDAK AKTIF', 'TIDAK AKTIF'),
    ], string='State', required=True, default='AKTIF', tracking=True)

    is_data_lengkap = fields.Boolean(
        'Data Lengkap',
        compute='_compute_data_lengkap',
        store=True,
    )

    @api.depends('kategori_kode',
                 'minyak_produksi', 'minyak_masuk', 'minyak_tersedia',
                 'minyak_keluar', 'minyak_ditolak')
    def _compute_total_minyak(self):
        for rec in self:
            kode = rec.kategori_kode
            if kode == 'sumur_masyarakat':
                rec.total_minyak = rec.minyak_produksi + rec.minyak_keluar
            elif kode == 'bku':
                rec.total_minyak = rec.minyak_masuk + rec.minyak_tersedia + rec.minyak_keluar
            elif kode == 'k3s':
                rec.total_minyak = rec.minyak_masuk + rec.minyak_ditolak
            else:
                rec.total_minyak = 0.0

    @api.depends('latitude', 'longitude', 'foto')
    def _compute_data_lengkap(self):
        for rec in self:
            rec.is_data_lengkap = bool(rec.latitude and rec.longitude and rec.foto)

    def action_set_aktif(self):
        self.write({'state': 'AKTIF'})

    def action_set_tidak_aktif(self):
        self.write({'state': 'TIDAK AKTIF'})

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('code') or vals['code'] == 'New':
                vals['code'] = self.env['ir.sequence'].next_by_code('petadigi.sumur_minyak.sequence') or 'New'
        return super().create(vals_list)

    @api.onchange('kabupaten_id')
    def _onchange_kabupaten_id(self):
        self.kecamatan_id = False
        self.desa_id = False

    @api.onchange('kecamatan_id')
    def _onchange_kecamatan_id(self):
        self.desa_id = False
