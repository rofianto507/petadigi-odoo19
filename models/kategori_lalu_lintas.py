from odoo import models, fields, api

class KategoriLaluLintas(models.Model):
    _name = 'petadigi.kategori_lalu_lintas'
    _description = 'Kategori Lalu Lintas'

    ICON_SELECTION = [
        ('fa-car',                  'Umum / Lalu Lintas'),
        ('fa-exclamation-triangle', 'Laka Lantas (Kecelakaan)'),
        ('fa-clock-o',              'Kemacetan / Hambatan Lalin'),
        ('fa-flag-checkered',       'Balap Liar'),
        ('fa-road',                 'Kerusakan Jalan'),
        ('fa-bus',                  'Gangguan Angkutan Umum'),
        ('fa-ambulance',            'Evakuasi / Darurat Lalin'),
        ('fa-truck',                'Kendaraan Berat / ODOL'),
        ('fa-warning',              'Bahaya Jalan / Marka Rusak'),
        ('fa-map-signs',            'Penutupan Jalan / Pengalihan Arus'),
        ('fa-bicycle',              'Konflik Kendaraan Non-Motor'),
    ]

    name      = fields.Char(string="Nama", required=True)
    icon      = fields.Selection(ICON_SELECTION, string="Icon Peta", default='fa-car')
    keterangan = fields.Text(string="Keterangan")

    lalin_ids     = fields.One2many('petadigi.lalu_lintas', 'kategori_id')
    lalin_proses  = fields.Integer(compute='_compute_lalin_count', string='Proses', store=True)
    lalin_selesai = fields.Integer(compute='_compute_lalin_count', string='Selesai', store=True)

    @api.depends('lalin_ids.state')
    def _compute_lalin_count(self):
        groups = self.env['petadigi.lalu_lintas'].read_group(
            [('kategori_id', 'in', self.ids)],
            ['kategori_id', 'state'],
            ['kategori_id', 'state'],
            lazy=False,
        )
        data = {}
        for g in groups:
            kid   = g['kategori_id'][0]
            state = g['state']
            count = g['__count']
            if kid not in data:
                data[kid] = {'PROSES': 0, 'SELESAI': 0}
            if state in ('PROSES', 'SELESAI'):
                data[kid][state] += count
        for rec in self:
            rec.lalin_proses  = data.get(rec.id, {}).get('PROSES',  0)
            rec.lalin_selesai = data.get(rec.id, {}).get('SELESAI', 0)

    def _action_view_lalin(self, state):
        return {
            'type': 'ir.actions.act_window',
            'name': f'Lalu Lintas {state} — {self.name}',
            'res_model': 'petadigi.lalu_lintas',
            'view_mode': 'list,form',
            'domain': [('kategori_id', '=', self.id), ('state', '=', state)],
        }

    def action_view_lalin_proses(self):
        return self._action_view_lalin('PROSES')

    def action_view_lalin_selesai(self):
        return self._action_view_lalin('SELESAI')

    icon_preview = fields.Html(compute='_compute_icon_preview', string='Preview', store=False)

    @api.depends('icon')
    def _compute_icon_preview(self):
        for rec in self:
            fa = rec.icon or 'fa-car'
            rec.icon_preview = (
                f'<i class="fa {fa} fa-2x" '
                f'style="color:#7d6608; padding:6px; vertical-align:middle;"></i>'
                f'<span style="color:#555; font-size:12px; margin-left:6px;">{fa}</span>'
            )
