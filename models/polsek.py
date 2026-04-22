from odoo import models, fields

class Polsek(models.Model):
    _name = 'petadigi.polsek'
    _description = 'Polsek (Kepolisian Sektor)'

    name = fields.Char(string="Nama Polsek", required=True)
    address = fields.Char(string='Alamat')
    polres_id = fields.Many2one('petadigi.polres', string='Polres', required=True)
    kecamatan_ids = fields.One2many(
        'petadigi.kecamatan', 'polsek_id', string='Daftar Kecamatan'
    )