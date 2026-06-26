from odoo import models, fields, api

class Polsek(models.Model):
    _name = 'petadigi.polsek'
    _description = 'Polsek (Kepolisian Sektor)'

    name = fields.Char(string="Nama Polsek", required=True)
    address = fields.Char(string='Alamat')
    polres_id = fields.Many2one('petadigi.polres', string='Polres', required=True)
    kecamatan_ids = fields.One2many(
        'petadigi.kecamatan', 'polsek_id', string='Daftar Kecamatan'
    )
    kecamatan_count = fields.Integer(
        string='Total Kecamatan', compute='_compute_kecamatan_count', store=True
    )
    user_count = fields.Integer(
        string='Total User Polsek', compute='_compute_user_count'
    )

    @api.depends('kecamatan_ids')
    def _compute_kecamatan_count(self):
        for rec in self:
            rec.kecamatan_count = len(rec.kecamatan_ids)

    def _compute_user_count(self):
        group = self.env.ref('petadigi.group_polsek', raise_if_not_found=False)
        for rec in self:
            domain = [('polsek_id', '=', rec.id), ('share', '=', False)]
            if group:
                domain.append(('group_ids', 'in', [group.id]))
            rec.user_count = self.env['res.users'].search_count(domain)

    def action_view_kecamatan(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': f'Kecamatan — {self.name}',
            'res_model': 'petadigi.kecamatan',
            'view_mode': 'list,form',
            'domain': [('polsek_id', '=', self.id)],
            'context': {'default_polsek_id': self.id},
        }

    def action_view_users(self):
        self.ensure_one()
        group = self.env.ref('petadigi.group_polsek', raise_if_not_found=False)
        domain = [('polsek_id', '=', self.id), ('share', '=', False)]
        if group:
            domain.append(('group_ids', 'in', [group.id]))
        return {
            'type': 'ir.actions.act_window',
            'name': f'User Polsek — {self.name}',
            'res_model': 'res.users',
            'view_mode': 'list,form',
            'domain': domain,
            'context': {'default_polsek_id': self.id},
        }