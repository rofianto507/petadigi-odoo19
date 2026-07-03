import secrets
import base64
from io import BytesIO
import qrcode
import qrcode.constants

from odoo import models, fields, api
from odoo.exceptions import UserError


class StrongPointFormConfig(models.Model):
    _name = 'petadigi.strong_point.form_config'
    _description = 'Konfigurasi Form Publik Strong Point'
    _rec_name = 'name'

    name = fields.Char('Nama Form', required=True)
    subdit_id = fields.Many2one('petadigi.subdit', string='Subdit',
                                help='Opsional. Isi jika form ini khusus untuk subdit tertentu — data akan otomatis ter-tag')
    public_token = fields.Char('Token Publik', readonly=True, copy=False)
    is_aktif = fields.Boolean('Aktif', default=False)
    public_url = fields.Char('URL Form', compute='_compute_public_url', store=False)
    qr_code_image = fields.Binary('QR Code', compute='_compute_qr_code', store=False)

    @api.depends('public_token')
    def _compute_public_url(self):
        base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        for rec in self:
            rec.public_url = f"{base_url}/strong/{rec.public_token}" if rec.public_token else ''

    @api.depends('public_url')
    def _compute_qr_code(self):
        for rec in self:
            if rec.public_url:
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_M,
                    box_size=6,
                    border=2,
                )
                qr.add_data(rec.public_url)
                qr.make(fit=True)
                img = qr.make_image(fill_color='#71639e', back_color='white')
                buf = BytesIO()
                img.save(buf, format='PNG')
                rec.qr_code_image = base64.b64encode(buf.getvalue())
            else:
                rec.qr_code_image = False

    def action_generate_token(self):
        for rec in self:
            rec.public_token = secrets.token_urlsafe(20)

    def action_toggle_aktif(self):
        for rec in self:
            if not rec.public_token:
                raise UserError('Generate token terlebih dahulu sebelum mengaktifkan form.')
            rec.is_aktif = not rec.is_aktif

    def action_open_form(self):
        self.ensure_one()
        if not self.public_url:
            raise UserError('Generate token terlebih dahulu.')
        return {
            'type': 'ir.actions.act_url',
            'url': self.public_url,
            'target': 'new',
        }
