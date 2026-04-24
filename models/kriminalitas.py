from odoo import models, fields, api

class Kriminalitas(models.Model):
    _name = 'petadigi.kriminalitas'
    _description = 'Kasus Kriminalitas'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'tanggal_kejadian desc'
    _rec_name = 'no_lp'
    _sql_constraints = [
        ('krim_no_lp_unique', 'unique(no_lp)', "No. LP harus unik!"),
    ]

    no_lp = fields.Char('No. LP', required=True,tracking=True)
    tempat_kejadian = fields.Text('Tempat Kejadian',tracking=True)
    latitude = fields.Float('Latitude', digits=(10, 6),tracking=True)
    longitude = fields.Float('Longitude', digits=(10, 6),tracking=True)
    tanggal_kejadian = fields.Datetime('Tanggal Kejadian',tracking=True)
    tanggal_laporan = fields.Datetime('Tanggal Laporan',tracking=True)
    pelapor = fields.Text('Pelapor',tracking=True)
    apa_yang_terjadi = fields.Text('Apa yang Terjadi',tracking=True)
    terlapor = fields.Text('Terlapor',tracking=True)
    korban = fields.Text('Korban',tracking=True)
    tindak_pidana = fields.Text('Tindak Pidana',tracking=True)
    saksi = fields.Text('Saksi',tracking=True)
    barang_bukti = fields.Text('Barang Bukti',tracking=True)
    uraian_singkat = fields.Text('Uraian Singkat',tracking=True)
    penanggung_jawab = fields.Char('Penanggung Jawab',tracking=True)