from odoo import models, fields, api


class LokasiStrongPoint(models.Model):
    _name = 'petadigi.lokasi_strong_point'
    _description = 'Lokasi Strong Point - Master Data Titik Konsentrasi'
    _order = 'code asc'
    _rec_name = 'nama'

    code = fields.Char('Kode', readonly=True, copy=False, default='New')
    nama = fields.Char('Nama Lokasi', required=True)
    polres_id = fields.Many2one('petadigi.polres', string='Polres', required=True)
    polsek_id = fields.Many2one(
        'petadigi.polsek', string='Polsek',
        domain="[('polres_id', '=', polres_id)]",
    )
    keterangan = fields.Text('Keterangan')
    foto = fields.Binary('Foto', attachment=True)
    foto_filename = fields.Char('Nama File Foto')
    lat = fields.Float('Latitude', digits=(10, 6))
    lng = fields.Float('Longitude', digits=(10, 6))
    state = fields.Selection([
        ('aktif', 'Aktif'),
        ('non_aktif', 'Non Aktif'),
    ], string='Status', required=True, default='aktif')
    strong_point_ids = fields.One2many('petadigi.strong_point', 'lokasi_id', string='Strong Point')
    strong_point_count = fields.Integer('Total Strong Point', compute='_compute_strong_point_count', store=True)

    @api.depends('strong_point_ids')
    def _compute_strong_point_count(self):
        for rec in self:
            rec.strong_point_count = len(rec.strong_point_ids)

    def action_view_strong_point(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': 'Strong Point',
            'res_model': 'petadigi.strong_point',
            'view_mode': 'list,form',
            'domain': [('lokasi_id', '=', self.id)],
            'context': {'default_lokasi_id': self.id},
        }

    @api.model
    def default_get(self, fields_list):
        defaults = super().default_get(fields_list)
        user = self.env.user
        is_admin = (user.has_group('petadigi.group_admin')
                    or user.has_group('petadigi.group_subdit')
                    or user.has_group('petadigi.group_subdit_strong_point'))
        if not is_admin:
            if user.polres_id and 'polres_id' in fields_list:
                defaults['polres_id'] = user.polres_id.id
            if user.polsek_id and 'polsek_id' in fields_list:
                defaults['polsek_id'] = user.polsek_id.id
        return defaults

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('code') or vals['code'] == 'New':
                vals['code'] = self.env['ir.sequence'].next_by_code(
                    'petadigi.lokasi_strong_point.sequence') or 'New'
        return super().create(vals_list)

    @api.onchange('polres_id')
    def _onchange_polres_id(self):
        if self.polsek_id and self.polsek_id.polres_id != self.polres_id:
            self.polsek_id = False
