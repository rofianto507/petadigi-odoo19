import secrets
import base64
from io import BytesIO
from urllib.parse import quote
import qrcode
import qrcode.constants

from odoo import models, fields, api


class KategoriSumurMinyak(models.Model):
    _name = 'petadigi.kategori_sumur_minyak'
    _description = 'Kategori Sumur Minyak'
    _order = 'name asc'

    name = fields.Char('Nama Kategori', required=True)
    kode = fields.Selection([
        ('sumur_masyarakat', 'Sumur Masyarakat'),
        ('bku', 'BKU'),
        ('k3s', 'K3S'),
    ], string='Kode Kategori')
    keterangan = fields.Text('Keterangan')
    state = fields.Selection([
        ('draft', 'Draft'),
        ('aktif', 'Aktif'),
        ('non_aktif', 'Non Aktif'),
    ], string='State', required=True, default='draft')
    public_token = fields.Char('Token', readonly=True, copy=False)
    public_url = fields.Char('URL Form', compute='_compute_public_url', store=False)
    qr_code_image = fields.Binary(compute='_compute_qr_code', string='QR Code', store=False)

    sumur_ids = fields.One2many('petadigi.sumur_minyak', 'kategori_id', string='Data Sumur')
    jumlah_sumur = fields.Integer(string='Total Sumur', compute='_compute_jumlah_sumur')
    total_minyak = fields.Float(
        string='Total Minyak',
        digits=(10, 2),
        compute='_compute_total_minyak',
    )

    @api.depends('public_token')
    def _compute_public_url(self):
        base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
        for rec in self:
            rec.public_url = f"{base_url}/sumur/{rec.public_token}" if rec.public_token else ''

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
                img = qr.make_image(fill_color='#B45309', back_color='white')
                buf = BytesIO()
                img.save(buf, format='PNG')
                rec.qr_code_image = base64.b64encode(buf.getvalue())
            else:
                rec.qr_code_image = False

    @api.depends()
    def _compute_jumlah_sumur(self):
        data = self.env['petadigi.sumur_minyak'].read_group(
            [('kategori_id', 'in', self.ids)],
            ['kategori_id'],
            ['kategori_id'],
        )
        counts = {d['kategori_id'][0]: d['kategori_id_count'] for d in data}
        for rec in self:
            rec.jumlah_sumur = counts.get(rec.id, 0)

    @api.depends()
    def _compute_total_minyak(self):
        data = self.env['petadigi.sumur_minyak'].read_group(
            [('kategori_id', 'in', self.ids)],
            ['kategori_id', 'total_minyak:sum'],
            ['kategori_id'],
        )
        totals = {d['kategori_id'][0]: d['total_minyak'] for d in data}
        for rec in self:
            rec.total_minyak = totals.get(rec.id, 0.0)

    def action_view_sumur(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': f'Sumur Minyak — {self.name}',
            'res_model': 'petadigi.sumur_minyak',
            'view_mode': 'list,form',
            'domain': [('kategori_id', '=', self.id)],
            'context': {'default_kategori_id': self.id},
        }

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('public_token'):
                vals['public_token'] = secrets.token_urlsafe(32)
        return super().create(vals_list)

    def action_set_aktif(self):
        for rec in self:
            if not rec.public_token:
                rec.public_token = secrets.token_urlsafe(32)
        self.write({'state': 'aktif'})

    def action_set_non_aktif(self):
        self.write({'state': 'non_aktif'})

    def action_set_draft(self):
        self.write({'state': 'draft'})

    def action_regenerate_token(self):
        for rec in self:
            rec.public_token = secrets.token_urlsafe(32)

    def action_share_whatsapp(self):
        self.ensure_one()
        msg = f"Form input data sumur minyak '{self.name}':\n{self.public_url}"
        url = f"https://web.whatsapp.com/send?text={quote(msg)}"
        return {
            'type': 'ir.actions.act_url',
            'url': url,
            'target': 'new',
        }
