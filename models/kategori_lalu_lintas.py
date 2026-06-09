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
