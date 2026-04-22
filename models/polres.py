from odoo import models, fields

class Polres(models.Model):
    _name = 'petadigi.polres'
    _description = 'Polres (Police Resort)'

    name = fields.Char(string="Nama Polres", required=True)
    address = fields.Char(string='Alamat')
    polsek_ids = fields.One2many(
        'petadigi.polsek', 'polres_id', string='Daftar Polsek'
    )