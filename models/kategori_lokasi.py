from odoo import models, fields, api

class KategoriLokasi(models.Model):
    _name = 'petadigi.kategori_lokasi'
    _description = 'Kategori Lokasi'

    ICON_SELECTION = [
        ('fa-map-marker',    'Default (Umum)'),
        ('fa-hospital-o',    'Rumah Sakit / Puskesmas'),
        ('fa-medkit',        'Klinik / Apotek'),
        ('fa-graduation-cap','Sekolah / Pendidikan'),
        ('fa-university',    'Universitas / Perguruan Tinggi'),
        ('fa-bank',          'Bank / Keuangan'),
        ('fa-shield',        'Keamanan / Kepolisian'),
        ('fa-fire',          'Pemadam Kebakaran'),
        ('fa-building',      'Gedung / Kantor Pemerintah'),
        ('fa-home',          'Perumahan / Pemukiman'),
        ('fa-shopping-cart', 'Pasar / Pertokoan / Mall'),
        ('fa-star',          'Tempat Ibadah'),
        ('fa-tree',          'Taman / Ruang Terbuka Hijau'),
        ('fa-bus',           'Terminal / Stasiun'),
        ('fa-anchor',        'Pelabuhan'),
        ('fa-plane',         'Bandara'),
        ('fa-industry',      'Kawasan Industri / Pabrik'),
        ('fa-cutlery',       'Restoran / Kuliner'),
        ('fa-tint',          'Sumber Air / PDAM'),
        ('fa-bolt',          'Pembangkit / PLN'),
        ('fa-road',          'Infrastruktur / Jalan Utama'),
        ('fa-camera',        'CCTV / Pos Pengawasan'),
        ('fa-flag',          'Pos / Checkpoint'),
        ('fa-signal',        'Menara Telekomunikasi'),
    ]

    name      = fields.Char(string="Nama", required=True)
    icon      = fields.Selection(ICON_SELECTION, string="Icon Peta", default='fa-map-marker')
    keterangan = fields.Text(string="Keterangan")

    icon_preview = fields.Html(compute='_compute_icon_preview', string='Preview', store=False)

    @api.depends('icon')
    def _compute_icon_preview(self):
        for rec in self:
            fa = rec.icon or 'fa-map-marker'
            rec.icon_preview = (
                f'<i class="fa {fa} fa-2x" '
                f'style="color:#6c3483; padding:6px; vertical-align:middle;"></i>'
                f'<span style="color:#555; font-size:12px; margin-left:6px;">{fa}</span>'
            )