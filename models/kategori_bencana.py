from odoo import models, fields

class KategoriBencana(models.Model):
    _name = 'petadigi.kategori_bencana'
    _description = 'Kategori Bencana'

    name = fields.Char(string="Nama", required=True)
    keterangan = fields.Text(string="Keterangan")