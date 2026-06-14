from odoo import models, fields, api

class LalLintas(models.Model):
    _name = 'petadigi.lalu_lintas'
    _description = 'Data Lalu Lintas'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'create_date desc'
    _rec_name = 'code'

    code = fields.Char('Kode', readonly=True, copy=False, default='New', tracking=True)
    kategori_id = fields.Many2one('petadigi.kategori_lalu_lintas', string='Kategori', tracking=True)
    jenis_jalan_id = fields.Many2one('petadigi.jenis_jalan', string='Jenis Jalan', tracking=True)
    nama_lokasi = fields.Char('Nama Lokasi', tracking=True)
    penanggung_jawab = fields.Char('Penanggung Jawab', tracking=True)
    tanggal_kejadian = fields.Datetime('Tanggal Kejadian', tracking=True)
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
    penyebab = fields.Text('Penyebab', tracking=True)
    tindak_lanjut = fields.Text('Tindak Lanjut', tracking=True)
    keterangan = fields.Text('Keterangan', tracking=True)
    sumber_dokumen_id = fields.Many2one(
        'petadigi.sumber_dokumen',
        string='Sumber Dokumen',
        domain=[('tipe_sumber', '=', 'LALU LINTAS')],
        tracking=True
    )
    tahun = fields.Selection(
        [(str(t), str(t)) for t in range(2020, 2031)],
        string='Tahun',
        related='sumber_dokumen_id.tahun',
        store=True,
    )
    state = fields.Selection([
        ('PROSES', 'PROSES'),
        ('SELESAI', 'SELESAI'),
    ], string='State', tracking=True, required=True, default='PROSES')
    foto = fields.Binary('Foto', attachment=True)
    foto_filename = fields.Char('Nama File Foto')

    def action_set_selesai(self):
        self.write({'state': 'SELESAI'})

    def action_set_proses(self):
        self.write({'state': 'PROSES'})

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('code') or vals['code'] == 'New':
                vals['code'] = self.env['ir.sequence'].next_by_code('petadigi.lalu_lintas.sequence') or 'New'
        return super().create(vals_list)

    @api.onchange('kabupaten_id')
    def _onchange_kabupaten_id(self):
        self.kecamatan_id = False

    @api.onchange('kecamatan_id')
    def _onchange_kecamatan_id(self):
        self.desa_id = False
