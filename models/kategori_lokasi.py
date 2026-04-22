from odoo import models, fields

class KategoriLokasi(models.Model):
    _name = 'petadigi.kategori_lokasi'
    _description = 'Kategori Lokasi'

    name = fields.Char(string="Nama", required=True)
    keterangan = fields.Text(string="Keterangan")