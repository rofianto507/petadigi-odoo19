from odoo import models, fields, api

class KategoriBencana(models.Model):
    _name = 'petadigi.kategori_bencana'
    _description = 'Kategori Bencana'

    ICON_SELECTION = [
        ('fa-exclamation-triangle', 'Umum / Bencana'),
        ('fa-tint',                 'Banjir'),
        ('fa-level-down',           'Tanah Longsor'),
        ('fa-circle-o-notch',       'Puting Beliung / Angin Kencang'),
        ('fa-bolt',                 'Gempa Bumi'),
        ('fa-fire',                 'Erupsi Gunung Berapi'),
        ('fa-ship',                 'Tsunami / Gelombang Ekstrem'),
        ('fa-sun-o',                'Kekeringan / Gelombang Panas'),
        ('fa-tree',                 'Kebakaran Hutan / Lahan'),
        ('fa-cloud',                'Hujan Ekstrem / Badai'),
        ('fa-warning',              'Bencana Industri / Kimia'),
    ]

    name      = fields.Char(string="Nama", required=True)
    icon      = fields.Selection(ICON_SELECTION, string="Icon Peta", default='fa-exclamation-triangle')
    keterangan = fields.Text(string="Keterangan")

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
