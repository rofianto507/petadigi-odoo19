from odoo import models, fields, api


class Personel(models.Model):
    _name = 'petadigi.personel'
    _description = 'Personel Strong Point'
    _order = 'id'
    _rec_name = 'nama_lengkap'

    nama = fields.Char('Nama', required=True)
    pangkat = fields.Char('Pangkat')
    nama_lengkap = fields.Char('Personel', compute='_compute_nama_lengkap', store=True)
    strong_point_id = fields.Many2one(
        'petadigi.strong_point', string='Strong Point',
        required=True, ondelete='cascade', index=True,
    )

    @api.depends('pangkat', 'nama')
    def _compute_nama_lengkap(self):
        for rec in self:
            parts = [rec.pangkat, rec.nama]
            rec.nama_lengkap = ' '.join(p for p in parts if p)
