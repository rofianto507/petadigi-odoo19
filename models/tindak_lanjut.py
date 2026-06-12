from markupsafe import Markup
from odoo import models, fields, api
from odoo.tools import format_datetime


class TindakLanjut(models.Model):
    _name = 'petadigi.tindak_lanjut'
    _description = 'Tindak Lanjut Kasus Menonjol'
    _order = 'tanggal desc'
    _rec_name = 'tanggal'

    kasus_menonjol_id = fields.Many2one(
        'petadigi.kasus_menonjol',
        string='Kasus Menonjol',
        required=True,
        ondelete='cascade',
    )
    tanggal = fields.Datetime('Tanggal', required=True, default=fields.Datetime.now)
    tindakan = fields.Text('Tindakan', required=True)
    attachment = fields.Binary('Lampiran', attachment=True)
    attachment_filename = fields.Char('Nama Lampiran')

    def unlink(self):
        # Kumpulkan data sebelum dihapus
        logs = []
        for rec in self:
            if rec.kasus_menonjol_id:
                tanggal_str = format_datetime(self.env, rec.tanggal, dt_format='dd/MM/yyyy HH:mm') if rec.tanggal else '-'
                logs.append((rec.kasus_menonjol_id, tanggal_str, rec.tindakan))
        res = super().unlink()
        for kam, tanggal_str, tindakan in logs:
            kam.message_post(
                body=Markup('<b>Tindak Lanjut Dihapus</b><br/>'
                            '<b>Tanggal:</b> %s<br/>'
                            '<b>Tindakan:</b> %s') % (tanggal_str, tindakan),
                message_type='comment',
                subtype_xmlid='mail.mt_note',
            )
        return res

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        for rec in records:
            if not rec.kasus_menonjol_id:
                continue
            tanggal_str = format_datetime(self.env, rec.tanggal, dt_format='dd/MM/yyyy HH:mm')
            lines = [
                Markup('<b>Tindak Lanjut Ditambahkan</b>'),
                Markup('<b>Tanggal:</b> %s') % tanggal_str,
                Markup('<b>Tindakan:</b> %s') % rec.tindakan,
            ]
            if rec.attachment_filename:
                lines.append(Markup('<b>Lampiran:</b> %s') % rec.attachment_filename)
            rec.kasus_menonjol_id.message_post(
                body=Markup('<br/>').join(Markup(l) for l in lines),
                message_type='comment',
                subtype_xmlid='mail.mt_note',
            )
        return records
