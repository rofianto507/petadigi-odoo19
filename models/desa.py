from odoo import models, fields

class Desa(models.Model):
    _name = 'petadigi.desa'
    _description = 'Desa/Kelurahan'

    code = fields.Char(string="Kode", required=True, size=10)
    name = fields.Char(string="Nama", required=True)
    kecamatan_id = fields.Many2one('petadigi.kecamatan', string='Kecamatan', required=True)
    type = fields.Selection(
        [('KELURAHAN', 'Kelurahan'), ('DESA', 'Desa')],
        string="Tipe", required=True
    )
    geometry = fields.Text(string="GeoJSON Geometry (Peta)")