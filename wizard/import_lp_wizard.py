from odoo import models, fields


class ImportLpWizard(models.TransientModel):
    _name = 'petadigi.import.lp.wizard'
    _description = 'Import Dokumen Laporan Polisi'

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

    def action_parse_dokumen(self):
        """Tombol Parse Dokumen — akan diimplementasikan di step berikutnya."""
        # TODO: panggil parser LP A atau LP B sesuai jenis_lp
        pass
