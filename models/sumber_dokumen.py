from odoo import models, fields, api

class SumberDokumen(models.Model):
    _name = 'petadigi.sumber_dokumen'
    _description = 'Sumber Dokumen'
    _order = 'tahun desc, tipe_sumber asc, name asc'

    name = fields.Char(string="Nama Sumber", required=True)
    tipe_sumber = fields.Selection([
        ('BENCANA', 'Bencana'),
        ('KRIMINALITAS', 'Kriminalitas'),
        ('LALU LINTAS', 'Lalu Lintas'),
        ('LOKASI PENTING', 'Lokasi Penting'),
        ('KASUS MENONJOL', 'Kasus Menonjol'),
        ('SUMUR MINYAK', 'Sumur Minyak'),
    ], string="Tipe Sumber", required=True)
    tahun = fields.Selection(
        [(str(t), str(t)) for t in range(2020, 2031)],
        string="Tahun", required=True
    )
    keterangan = fields.Text(string="Keterangan")
    jumlah_data = fields.Integer(
        string="Jumlah Data", compute='_compute_jumlah_data', store=False)

    _MODEL_MAP = {
        'KRIMINALITAS': 'petadigi.kriminalitas',
        'BENCANA':      'petadigi.bencana',
        'LALU LINTAS':  'petadigi.lalu_lintas',
        'KASUS MENONJOL': 'petadigi.kasus_menonjol',
        'SUMUR MINYAK': 'petadigi.sumur_minyak',
    }

    @api.depends('tipe_sumber')
    def _compute_jumlah_data(self):
        for rec in self:
            model = self._MODEL_MAP.get(rec.tipe_sumber)
            if model and rec.id:
                rec.jumlah_data = self.env[model].search_count(
                    [('sumber_dokumen_id', '=', rec.id)])
            else:
                rec.jumlah_data = 0