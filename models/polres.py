from odoo import models, fields, api

class Polres(models.Model):
    _name = 'petadigi.polres'
    _description = 'Polres (Police Resort)'

    name = fields.Char(string="Nama Polres", required=True)
    address = fields.Char(string='Alamat')
    polsek_ids = fields.One2many(
        'petadigi.polsek', 'polres_id', string='Daftar Polsek'
    )
    polsek_count = fields.Integer(
        string='Total Polsek', compute='_compute_counts', store=True
    )
    kabupaten_count = fields.Integer(
        string='Total Kabupaten', compute='_compute_counts', store=True
    )
    user_count = fields.Integer(
        string='Total User Polres', compute='_compute_user_count'
    )

    @api.depends('polsek_ids')
    def _compute_counts(self):
        Kabupaten = self.env['petadigi.kabupaten']
        for rec in self:
            rec.polsek_count    = len(rec.polsek_ids)
            rec.kabupaten_count = Kabupaten.search_count([('polres_id', '=', rec.id)])

    def _compute_user_count(self):
        group = self.env.ref('petadigi.group_polres', raise_if_not_found=False)
        for rec in self:
            domain = [('polres_id', '=', rec.id), ('share', '=', False)]
            if group:
                domain.append(('group_ids', 'in', [group.id]))
            rec.user_count = self.env['res.users'].search_count(domain)

    def action_view_polsek(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': f'Polsek — {self.name}',
            'res_model': 'petadigi.polsek',
            'view_mode': 'list,form',
            'domain': [('polres_id', '=', self.id)],
            'context': {'default_polres_id': self.id},
        }

    def action_view_kabupaten(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': f'Kabupaten — {self.name}',
            'res_model': 'petadigi.kabupaten',
            'view_mode': 'list,form',
            'domain': [('polres_id', '=', self.id)],
            'context': {'default_polres_id': self.id},
        }

    def action_view_users(self):
        self.ensure_one()
        group = self.env.ref('petadigi.group_polres', raise_if_not_found=False)
        domain = [('polres_id', '=', self.id), ('share', '=', False)]
        if group:
            domain.append(('group_ids', 'in', [group.id]))
        return {
            'type': 'ir.actions.act_window',
            'name': f'User Polres — {self.name}',
            'res_model': 'res.users',
            'view_mode': 'list,form',
            'domain': domain,
            'context': {'default_polres_id': self.id},
        }