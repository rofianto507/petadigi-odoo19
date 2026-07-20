from odoo import models, fields, api


class KategoriKriminal(models.Model):
    _name = 'petadigi.kategori_kriminal'
    _description = 'Kategori Kriminal'

    ICON_SELECTION = [
        ('fa-exclamation-triangle', 'Umum / Kriminal'),
        ('fa-gavel',                'Kejahatan Konvensional'),
        ('fa-university',           'Kejahatan Kekayaan Negara'),
        ('fa-globe',                'Kejahatan Transnasional'),
        ('fa-warning',              'Berimplikasi Kontenjensi'),
        ('fa-user-secret',          'Kejahatan Terorganisir'),
        ('fa-money',                'Kejahatan Finansial / Korupsi'),
        ('fa-bomb',                 'Terorisme / Sabotase'),
        ('fa-fire',                 'Pengrusakan / Pembakaran'),
        ('fa-lock',                 'Penipuan / Pemalsuan'),
        ('fa-car',                  'Kejahatan Jalanan'),
        ('fa-home',                 'Kejahatan Properti'),
        ('fa-male',                 'Kejahatan Perseorangan'),
        ('fa-group',                'Kejahatan Massal'),
        ('fa-shield',               'Keamanan / Pertahanan'),
    ]

    name             = fields.Char(string="Nama", required=True)
    icon             = fields.Selection(ICON_SELECTION, string="Icon Peta", default='fa-exclamation-triangle')
    keterangan       = fields.Text(string="Keterangan")
    sub_kategori_ids = fields.One2many(
        'petadigi.sub_kategori_kriminal', 'kategori_kriminal_id', string='Sub Kategori'
    )

    kriminalitas_ids     = fields.One2many('petadigi.kriminalitas', 'kategori_id')
    kriminalitas_proses  = fields.Integer(compute='_compute_kriminalitas_count', string='Proses', store=True)
    kriminalitas_selesai = fields.Integer(compute='_compute_kriminalitas_count', string='Selesai', store=True)

    @api.depends('kriminalitas_ids.status_perkara')
    def _compute_kriminalitas_count(self):
        groups = self.env['petadigi.kriminalitas'].read_group(
            [('kategori_id', 'in', self.ids)],
            ['kategori_id', 'status_perkara'],
            ['kategori_id', 'status_perkara'],
            lazy=False,
        )
        data = {}
        for g in groups:
            kid    = g['kategori_id'][0]
            status = g['status_perkara']
            count  = g['__count']
            if kid not in data:
                data[kid] = {'PROSES': 0, 'SELESAI': 0}
            if status in ('PROSES', 'SELESAI'):
                data[kid][status] += count
        for rec in self:
            rec.kriminalitas_proses  = data.get(rec.id, {}).get('PROSES',  0)
            rec.kriminalitas_selesai = data.get(rec.id, {}).get('SELESAI', 0)

    def _action_view_kriminalitas(self, status):
        return {
            'type': 'ir.actions.act_window',
            'name': f'Kriminalitas {status} — {self.name}',
            'res_model': 'petadigi.kriminalitas',
            'view_mode': 'list,form',
            'domain': [('kategori_id', '=', self.id), ('status_perkara', '=', status)],
        }

    def action_view_kriminalitas_proses(self):
        return self._action_view_kriminalitas('PROSES')

    def action_view_kriminalitas_selesai(self):
        return self._action_view_kriminalitas('SELESAI')

    icon_preview = fields.Html(compute='_compute_icon_preview', string='Preview', store=False)

    @api.depends('icon')
    def _compute_icon_preview(self):
        for rec in self:
            fa = rec.icon or 'fa-exclamation-triangle'
            rec.icon_preview = (
                f'<i class="fa {fa} fa-2x" '
                f'style="color:#922b21; padding:6px; vertical-align:middle;"></i>'
                f'<span style="color:#555; font-size:12px; margin-left:6px;">{fa}</span>'
            )
