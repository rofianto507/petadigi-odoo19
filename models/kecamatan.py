from odoo import models, fields

class Kecamatan(models.Model):
    _name = 'petadigi.kecamatan'
    _description = 'Kecamatan'

    code = fields.Char(string="Kode", required=True, size=6)
    name = fields.Char(string="Nama", required=True)
    kabupaten_id = fields.Many2one('petadigi.kabupaten', string='Kabupaten/Kota', required=True)
    polsek_id = fields.Many2one('petadigi.polsek', string='Polsek', required=True)
    desa_ids = fields.One2many(
        'petadigi.desa', 'kecamatan_id', string='Daftar Desa/Kelurahan'
    )
    geometry = fields.Text(string="GeoJSON Geometry (Peta)")