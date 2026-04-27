from odoo import models, fields

class SubStatusPerkara(models.Model):
    _name = 'petadigi.sub_status_perkara'
    _description = 'Sub Status Perkara'

    status_perkara = fields.Selection([
        ('PROSES', 'PROSES'),
        ('SELESAI', 'SELESAI')
    ], string='Status Perkara', required=True)
    name = fields.Char('Nama', required=True)
    keterangan = fields.Text('Keterangan')