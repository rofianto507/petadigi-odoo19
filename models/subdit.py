from odoo import models, fields

class Subdit(models.Model):
    _name = 'petadigi.subdit'
    _description = 'Subdit'
    _order = 'name asc'

    name = fields.Char(string='Nama', required=True)
    keterangan = fields.Text(string='Keterangan')
