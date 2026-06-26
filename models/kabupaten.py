from odoo import models, fields, api

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
    kecamatan_count = fields.Integer(
        string='Total Kecamatan', compute='_compute_kecamatan_count', store=True
    )
    has_geometry = fields.Boolean(
        string='Ada Peta', compute='_compute_has_geometry', store=True
    )

    @api.depends('kecamatan_ids')
    def _compute_kecamatan_count(self):
        for rec in self:
            rec.kecamatan_count = len(rec.kecamatan_ids)

    @api.depends('geometry')
    def _compute_has_geometry(self):
        for rec in self:
            rec.has_geometry = bool(rec.geometry and rec.geometry.strip())

    def action_view_kecamatan(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': f'Kecamatan — {self.name}',
            'res_model': 'petadigi.kecamatan',
            'view_mode': 'list,form',
            'domain': [('kabupaten_id', '=', self.id)],
            'context': {'default_kabupaten_id': self.id},
        }