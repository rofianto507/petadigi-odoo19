from odoo import models, fields

class KategoriLaluLintas(models.Model):
    _name = 'petadigi.kategori_lalu_lintas'
    _description = 'Kategori Lalu Lintas'

    name = fields.Char(string="Nama", required=True)
    keterangan = fields.Text(string="Keterangan")