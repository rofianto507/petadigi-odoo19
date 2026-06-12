from odoo import models, fields


class TindakLanjutWizard(models.TransientModel):
    _name = 'petadigi.tindak_lanjut.wizard'
    _description = 'Wizard Tambah Tindak Lanjut'

    kasus_menonjol_id = fields.Many2one(
        'petadigi.kasus_menonjol', string='Kasus Menonjol', required=True
    )
    tanggal = fields.Datetime('Tanggal', required=True, default=fields.Datetime.now)
    tindakan = fields.Text('Tindakan', required=True)
    attachment = fields.Binary('Lampiran')
    attachment_filename = fields.Char('Nama Lampiran')

    def action_confirm(self):
        self.env['petadigi.tindak_lanjut'].create({
            'kasus_menonjol_id': self.kasus_menonjol_id.id,
            'tanggal': self.tanggal,
            'tindakan': self.tindakan,
            'attachment': self.attachment,
            'attachment_filename': self.attachment_filename,
        })
        return {'type': 'ir.actions.act_window_close'}
