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
