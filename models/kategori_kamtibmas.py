from odoo import models, fields, api

class KategoriKamtibmas(models.Model):
    _name = 'petadigi.kategori_kamtibmas'
    _description = 'Kategori Kamtibmas'

    ICON_SELECTION = [
        ('fa-exclamation-circle', 'Umum / Kasus Menonjol'),
        ('fa-bolt',               'Curas (Pencurian dengan Kekerasan)'),
        ('fa-home',               'Curat (Pencurian dengan Pemberatan)'),
        ('fa-car',                'Curanmor (Pencurian Kendaraan Bermotor)'),
        ('fa-money',              'Pencurian Finansial'),
        ('fa-suitcase',           'Pencurian Barang Bawaan'),
        ('fa-group',              'Tawuran / Bentrokan Massa'),
        ('fa-fire',               'Kerusuhan / Vandalisme'),
        ('fa-warning',            'Darurat Kamtibmas'),
        ('fa-user-secret',        'Kejahatan Terorganisir'),
        ('fa-male',               'Kejahatan Perseorangan'),
        ('fa-shield',             'Gangguan Keamanan'),
    ]

    name      = fields.Char(string="Nama", required=True)
    icon      = fields.Selection(ICON_SELECTION, string="Icon Peta", default='fa-exclamation-circle')
    keterangan = fields.Text(string="Keterangan")

    icon_preview = fields.Html(compute='_compute_icon_preview', string='Preview', store=False)

    @api.depends('icon')
    def _compute_icon_preview(self):
        for rec in self:
            fa = rec.icon or 'fa-exclamation-circle'
            rec.icon_preview = (
                f'<i class="fa {fa} fa-2x" '
                f'style="color:#1a5276; padding:6px; vertical-align:middle;"></i>'
                f'<span style="color:#555; font-size:12px; margin-left:6px;">{fa}</span>'
            )
