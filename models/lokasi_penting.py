from odoo import models, fields, api

class LokasiPenting(models.Model):
    _name = 'petadigi.lokasi_penting'
    _description = 'Lokasi Penting'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'nama_lokasi asc'
    _rec_name = 'code'

    code = fields.Char('Kode', readonly=True, copy=False, default='New', tracking=True)
    kategori_id = fields.Many2one('petadigi.kategori_lokasi', string='Kategori', tracking=True)
    nama_lokasi = fields.Char('Nama Lokasi', required=True, tracking=True)
    alamat_lengkap = fields.Char('Alamat Lengkap', tracking=True)
    hp_kontak = fields.Char('HP / Kontak', tracking=True)
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
    latitude = fields.Float('Latitude', digits=(10, 6), tracking=True, aggregator=False)
    longitude = fields.Float('Longitude', digits=(10, 6), tracking=True, aggregator=False)
    foto = fields.Binary('Foto', attachment=True)
    foto_filename = fields.Char('Nama File Foto')
    keterangan = fields.Text('Keterangan', tracking=True)
    state = fields.Selection([
        ('AKTIF', 'AKTIF'),
        ('NON AKTIF', 'NON AKTIF'),
    ], string='State', tracking=True, required=True, default='AKTIF')

    def action_set_aktif(self):
        self.write({'state': 'AKTIF'})

    def action_set_non_aktif(self):
        self.write({'state': 'NON AKTIF'})

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('code') or vals['code'] == 'New':
                vals['code'] = self.env['ir.sequence'].next_by_code('petadigi.lokasi_penting.sequence') or 'New'
        return super().create(vals_list)

    @api.onchange('kabupaten_id')
    def _onchange_kabupaten_id(self):
        self.kecamatan_id = False

    @api.onchange('kecamatan_id')
    def _onchange_kecamatan_id(self):
        self.desa_id = False
