from odoo import models, fields

class SubKategoriKriminal(models.Model):
    _name = 'petadigi.sub_kategori_kriminal'
    _description = 'Sub Kategori Kriminal'

    name = fields.Char(string="Nama", required=True)
    keterangan = fields.Text(string="Keterangan")
    kategori_kriminal_id = fields.Many2one(
        'petadigi.kategori_kriminal', string="Kategori Kriminal", required=True
    )