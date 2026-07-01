from odoo import models, fields, api

class Bencana(models.Model):
    _name = 'petadigi.bencana'
    _description = 'Data Bencana'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'tanggal_kejadian desc'
    _rec_name = 'code'

    code = fields.Char('Kode', readonly=True, copy=False, default='New', tracking=True)
    nama_bencana = fields.Char('Nama Bencana', required=True, tracking=True)
    kategori_id = fields.Many2one('petadigi.kategori_bencana', string='Kategori', tracking=True)
    tanggal_kejadian = fields.Datetime('Tanggal Kejadian', tracking=True)
    keterangan = fields.Text('Keterangan', tracking=True)
    penyebab = fields.Text('Penyebab', tracking=True)
    tindak_lanjut = fields.Text('Tindak Lanjut', tracking=True)
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
    sumber_dokumen_id = fields.Many2one(
        'petadigi.sumber_dokumen',
        string='Sumber Dokumen',
        domain=[('tipe_sumber', '=', 'BENCANA')],
        tracking=True
    )
    tahun = fields.Selection(
        [(str(t), str(t)) for t in range(2020, 2031)],
        string='Tahun',
        related='sumber_dokumen_id.tahun',
        store=True, index=True,
    )
    latitude = fields.Float('Latitude', digits=(10, 6), tracking=True, aggregator=False)
    longitude = fields.Float('Longitude', digits=(10, 6), tracking=True, aggregator=False)
    foto = fields.Binary('Foto', attachment=True)
    foto_filename = fields.Char('Nama File Foto')
    state = fields.Selection([
        ('AKTIF', 'AKTIF'),
        ('NON AKTIF', 'NON AKTIF'),
    ], string='State', tracking=True, required=True, default='AKTIF')

    def action_set_aktif(self):
        self.state = 'AKTIF'

    def action_set_non_aktif(self):
        self.state = 'NON AKTIF'

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('code') or vals['code'] == 'New':
                vals['code'] = self.env['ir.sequence'].next_by_code('petadigi.bencana.sequence') or 'New'
        return super().create(vals_list)

    @api.onchange('kabupaten_id')
    def _onchange_kabupaten_id(self):
        self.kecamatan_id = False

    @api.onchange('kecamatan_id')
    def _onchange_kecamatan_id(self):
        self.desa_id = False
