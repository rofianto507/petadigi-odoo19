from odoo import models, fields

class ModusOperandi(models.Model):
    _name = 'petadigi.modus_operandi'
    _description = 'Modus Operandi'

    name = fields.Char(string="Nama", required=True)
    keterangan = fields.Text(string="Keterangan")