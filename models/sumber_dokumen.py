from odoo import models, fields

class SumberDokumen(models.Model):
    _name = 'petadigi.sumber_dokumen'
    _description = 'Sumber Dokumen'

    name = fields.Char(string="Nama Sumber", required=True)
    tipe_sumber = fields.Selection([
        ('BENCANA', 'Bencana'),
        ('KRIMINALITAS', 'Kriminalitas'),
        ('LALU LINTAS', 'Lalu Lintas'),
        ('LOKASI PENTING', 'Lokasi Penting'),
        ('KASUS MENONJOL', 'Kasus Menonjol'),
    ], string="Tipe Sumber", required=True)
    tahun = fields.Selection(
        [(str(t), str(t)) for t in range(2020, 2031)],
        string="Tahun", required=True
    )
    keterangan = fields.Text(string="Keterangan")