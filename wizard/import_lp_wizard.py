import base64
from odoo import models, fields, api
from odoo.exceptions import UserError


class ImportLpWizard(models.TransientModel):
    _name = 'petadigi.import.lp.wizard'
    _description = 'Import Dokumen Laporan Polisi'

    # ── STEP KONTROL ────────────────────────────────────────────────────────
    stage = fields.Selection([
        ('upload', 'Upload'),
        ('preview', 'Preview'),
    ], default='upload')

    # ── STEP 1: UPLOAD ───────────────────────────────────────────────────────
    jenis_lp = fields.Selection([
        ('LP A', 'LP A'),
        ('LP B', 'LP B'),
    ], string='Jenis Laporan Polisi', required=True, default='LP A')

    dokumen = fields.Binary(
        string='File Dokumen (.docx)',
        required=True,
        attachment=False,
    )
    dokumen_filename = fields.Char(string='Nama File')

    # ── STEP 2: HASIL PARSING (read-only preview) ────────────────────────────
    no_lp = fields.Char('No. LP')
    tanggal_kejadian = fields.Datetime('Waktu Kejadian')
    tempat_kejadian = fields.Text('Tempat Kejadian')
    latitude = fields.Float('Latitude', digits=(10, 6))
    longitude = fields.Float('Longitude', digits=(10, 6))
    apa_yang_terjadi = fields.Text('Apa yang Terjadi')
    terlapor = fields.Text('Terlapor')
    korban = fields.Text('Korban')
    tanggal_laporan = fields.Datetime('Tanggal Laporan')
    tindak_pidana = fields.Text('Tindak Pidana')
    saksi = fields.Text('Saksi')
    barang_bukti = fields.Text('Barang Bukti')
    uraian_singkat = fields.Text('Uraian Singkat')
    pelapor = fields.Text('Pelapor')

    # ── STEP 2: ISI MANUAL ───────────────────────────────────────────────────
    polres_id = fields.Many2one('petadigi.polres', string='Polres')
    polsek_id = fields.Many2one(
        'petadigi.polsek', string='Polsek',
        domain="[('polres_id', '=', polres_id)]"
    )
    kabupaten_id = fields.Many2one('petadigi.kabupaten', string='Kabupaten/Kota')
    kecamatan_id = fields.Many2one(
        'petadigi.kecamatan', string='Kecamatan',
        domain="[('kabupaten_id', '=', kabupaten_id)]"
    )
    desa_id = fields.Many2one(
        'petadigi.desa', string='Desa/Kelurahan',
        domain="[('kecamatan_id', '=', kecamatan_id)]"
    )
    kategori_id = fields.Many2one('petadigi.kategori_kriminal', string='Kategori')
    sub_kategori_id = fields.Many2one(
        'petadigi.sub_kategori_kriminal', string='Sub Kategori',
        domain="[('kategori_kriminal_id', '=', kategori_id)]"
    )
    status_perkara = fields.Selection([
        ('PROSES', 'PROSES'),
        ('SELESAI', 'SELESAI'),
    ], string='Status Perkara', default='PROSES')
    sub_status_perkara_id = fields.Many2one(
        'petadigi.sub_status_perkara', string='Sub Status Perkara',
        domain="[('status_perkara', '=', status_perkara)]"
    )
    tanggal_selesai = fields.Datetime('Tanggal Selesai')
    is_perkara_selesai = fields.Boolean(compute='_compute_is_perkara_selesai')

    @api.depends('status_perkara')
    def _compute_is_perkara_selesai(self):
        for rec in self:
            rec.is_perkara_selesai = (rec.status_perkara == 'SELESAI')
    
    @api.onchange('status_perkara')
    def _onchange_status_perkara(self):
        self.sub_status_perkara_id = False
        if self.status_perkara != 'SELESAI':
            self.tanggal_selesai = False

    # ── ACTIONS ──────────────────────────────────────────────────────────────

    def action_parse_dokumen(self):
        """Parse file .docx dan tampilkan hasil di step preview."""
        self.ensure_one()

        if not self.dokumen:
            raise UserError('Silakan upload file dokumen terlebih dahulu.')

        if self.dokumen_filename and \
                not self.dokumen_filename.lower().endswith('.docx'):
            raise UserError('Format file harus .docx (Microsoft Word).')

        file_bytes = base64.b64decode(self.dokumen)

        if self.jenis_lp == 'LP A':
            from ..utils import parser_lp_a
            hasil = parser_lp_a.parse(file_bytes)
        else:
            raise UserError('Parser LP B belum tersedia.')

        if not hasil:
            raise UserError(
                'Dokumen tidak dapat diparse. '
                'Pastikan format dokumen sesuai template LP A.'
            )

        # Tulis hasil parsing ke field wizard
        vals = {'stage': 'preview'}
        for key, val in hasil.items():
            if key.endswith('_raw'):
                continue  # skip field bantu
            if hasattr(self, key) and val is not None:
                vals[key] = val

        self.write(vals)

        # Kembalikan action untuk refresh wizard (tetap di popup yang sama)
        return {
            'type': 'ir.actions.act_window',
            'res_model': self._name,
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
        }

    def action_simpan(self):
        """Buat record kriminalitas baru dari hasil parsing + isian manual."""
        self.ensure_one()

        if not self.no_lp:
            raise UserError('No. LP tidak berhasil dibaca dari dokumen.')
        if not self.status_perkara:
            raise UserError('Status Perkara wajib diisi.')

        vals = {
            'jenis_lp': self.jenis_lp,
            'no_lp': self.no_lp,
            'tanggal_kejadian': self.tanggal_kejadian,
            'tempat_kejadian': self.tempat_kejadian,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'apa_yang_terjadi': self.apa_yang_terjadi,
            'terlapor': self.terlapor,
            'korban': self.korban,
            'tanggal_laporan': self.tanggal_laporan,
            'tindak_pidana': self.tindak_pidana,
            'saksi': self.saksi,
            'barang_bukti': self.barang_bukti,
            'uraian_singkat': self.uraian_singkat,
            'pelapor': self.pelapor,
            'polres_id': self.polres_id.id,
            'polsek_id': self.polsek_id.id,
            'kabupaten_id': self.kabupaten_id.id,
            'kecamatan_id': self.kecamatan_id.id,
            'desa_id': self.desa_id.id,
            'kategori_id': self.kategori_id.id,
            'sub_kategori_id': self.sub_kategori_id.id,
            'status_perkara': self.status_perkara,
        }

        record = self.env['petadigi.kriminalitas'].create(vals)

        # Tutup wizard dan buka record yang baru dibuat
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'petadigi.kriminalitas',
            'res_id': record.id,
            'view_mode': 'form',
            'target': 'current',
        }

    @api.onchange('polres_id')
    def _onchange_polres_id(self):
        self.polsek_id = False

    @api.onchange('kabupaten_id')
    def _onchange_kabupaten_id(self):
        self.kecamatan_id = False

    @api.onchange('kecamatan_id')
    def _onchange_kecamatan_id(self):
        self.desa_id = False

    @api.onchange('kategori_id')
    def _onchange_kategori_id(self):
        self.sub_kategori_id = False
