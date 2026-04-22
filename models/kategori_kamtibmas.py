from odoo import models, fields

class KategoriKamtibmas(models.Model):
    _name = 'petadigi.kategori_kamtibmas'
    _description = 'Kategori Kamtibmas'

    name = fields.Char(string="Nama", required=True)
    keterangan = fields.Text(string="Keterangan")