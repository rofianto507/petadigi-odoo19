from odoo import models, fields, api

class Desa(models.Model):
    _name = 'petadigi.desa'
    _description = 'Desa/Kelurahan'

    code = fields.Char(string="Kode", required=True, size=10)
    name = fields.Char(string="Nama", required=True)
    kecamatan_id = fields.Many2one('petadigi.kecamatan', string='Kecamatan', required=True)
    kabupaten_id = fields.Many2one(
        'petadigi.kabupaten', string='Kabupaten/Kota',
        related='kecamatan_id.kabupaten_id', store=True, readonly=True
    )
    type = fields.Selection(
        [('KELURAHAN', 'Kelurahan'), ('DESA', 'Desa')],
        string="Tipe", required=True
    )
    geometry = fields.Text(string="GeoJSON Geometry (Peta)")
    has_geometry = fields.Boolean(
        string='Ada Peta', compute='_compute_has_geometry', store=True
    )

    @api.depends('geometry')
    def _compute_has_geometry(self):
        for rec in self:
            rec.has_geometry = bool(rec.geometry and rec.geometry.strip())