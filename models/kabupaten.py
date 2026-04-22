from odoo import models, fields

class Kabupaten(models.Model):
    _name = 'petadigi.kabupaten'
    _description = 'Kabupaten/Kota'

    code = fields.Char(string="Kode", required=True, size=4)
    name = fields.Char(string="Nama", required=True)
    type = fields.Selection(
        [('KOTA', 'Kota'), ('KABUPATEN', 'Kabupaten')],
        string="Tipe", required=True
    )
    polres_id = fields.Many2one('petadigi.polres', string='Polres', required=True)
    kecamatan_ids = fields.One2many(
        'petadigi.kecamatan', 'kabupaten_id', string='Daftar Kecamatan'
    )
    geometry = fields.Text(string="GeoJSON Geometry (Peta)")