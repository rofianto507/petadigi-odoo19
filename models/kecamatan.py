from odoo import models, fields, api

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
    desa_count = fields.Integer(
        string='Total Desa/Kel.', compute='_compute_desa_count', store=True
    )
    has_geometry = fields.Boolean(
        string='Ada Peta', compute='_compute_has_geometry', store=True
    )

    @api.depends('desa_ids')
    def _compute_desa_count(self):
        for rec in self:
            rec.desa_count = len(rec.desa_ids)

    @api.depends('geometry')
    def _compute_has_geometry(self):
        for rec in self:
            rec.has_geometry = bool(rec.geometry and rec.geometry.strip())

    def action_view_desa(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': f'Desa/Kelurahan — {self.name}',
            'res_model': 'petadigi.desa',
            'view_mode': 'list,form',
            'domain': [('kecamatan_id', '=', self.id)],
            'context': {'default_kecamatan_id': self.id},
        }