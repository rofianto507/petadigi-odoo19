from odoo import models, fields

class KategoriKriminal(models.Model):
    _name = 'petadigi.kategori_kriminal'
    _description = 'Kategori Kriminal'

    name = fields.Char(string="Nama", required=True)
    keterangan = fields.Text(string="Keterangan")
    sub_kategori_ids = fields.One2many(
        'petadigi.sub_kategori_kriminal', 'kategori_kriminal_id', string='Sub Kategori'
    )