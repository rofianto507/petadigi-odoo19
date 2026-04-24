from odoo import models, fields, api

class Kriminalitas(models.Model):
    _name = 'petadigi.kriminalitas'
    _description = 'Kasus Kriminalitas'
    _order = 'tanggal_kejadian desc'
    _rec_name = 'no_lp'
    _sql_constraints = [
        ('krim_no_lp_unique', 'unique(no_lp)', "No. LP harus unik!"),
    ]

    no_lp = fields.Char('No. LP', required=True)
    tempat_kejadian = fields.Text('Tempat Kejadian')
    latitude = fields.Float('Latitude', digits=(10, 6))
    longitude = fields.Float('Longitude', digits=(10, 6))
    tanggal_kejadian = fields.Datetime('Tanggal Kejadian')
    tanggal_laporan = fields.Datetime('Tanggal Laporan')
    pelapor = fields.Text('Pelapor')
    apa_yang_terjadi = fields.Text('Apa yang Terjadi')
    terlapor = fields.Text('Terlapor')
    korban = fields.Text('Korban')
    tindak_pidana = fields.Text('Tindak Pidana')
    saksi = fields.Text('Saksi')
    barang_bukti = fields.Text('Barang Bukti')
    uraian_singkat = fields.Text('Uraian Singkat')
    penanggung_jawab = fields.Char('Penanggung Jawab')