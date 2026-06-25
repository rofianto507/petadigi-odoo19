from odoo import models, fields, api


class PersonelPatroli(models.Model):
    _name = 'petadigi.personel_patroli'
    _description = 'Personel Patroli'
    _order = 'id'
    _rec_name = 'nama_lengkap'

    nama = fields.Char('Nama', required=True)
    pangkat = fields.Char('Pangkat')
    nama_lengkap = fields.Char('Personel', compute='_compute_nama_lengkap', store=True)
    patroli_id = fields.Many2one(
        'petadigi.patroli', string='Patroli',
        required=True, ondelete='cascade', index=True,
    )

    @api.depends('pangkat', 'nama')
    def _compute_nama_lengkap(self):
        for rec in self:
            parts = [rec.pangkat, rec.nama]
            rec.nama_lengkap = ' '.join(p for p in parts if p)
