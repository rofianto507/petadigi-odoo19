from odoo import models, fields, api
from odoo.exceptions import ValidationError


class HasilGiat(models.Model):
    _name = 'petadigi.hasil_giat'
    _description = 'Hasil Kegiatan Cooling System'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'tanggal desc'
    _rec_name = 'code'

    code = fields.Char('Kode', readonly=True, copy=False, default='New', tracking=True)
    jenis_laporan_id = fields.Many2one('petadigi.jenis_laporan', string='Jenis Laporan',
                                       required=True, tracking=True,
                                       domain="[('state','=','aktif')]")
    nrp = fields.Char('NRP Petugas', tracking=True)
    nama_petugas = fields.Char('Nama Petugas', required=True, tracking=True)
    pangkat_petugas = fields.Char('Pangkat', tracking=True)
    polres_id = fields.Many2one('petadigi.polres', string='Polres', required=True, tracking=True)
    polsek_id = fields.Many2one(
        'petadigi.polsek',
        string='Polsek',
        domain="[('polres_id', '=', polres_id)]",
        tracking=True
    )
    tanggal = fields.Datetime('Tanggal Kegiatan', required=True, tracking=True,
                              default=fields.Datetime.now)
    kegiatan = fields.Text('Uraian Kegiatan', tracking=True)
    foto = fields.Binary('Foto', attachment=True)
    foto_filename = fields.Char('Nama File Foto')
    latitude = fields.Float('Latitude', digits=(10, 6), tracking=True, aggregator=False)
    longitude = fields.Float('Longitude', digits=(10, 6), tracking=True, aggregator=False)
    submitter_ip = fields.Char('IP Pengirim', readonly=True)
    submitter_ua = fields.Char('User-Agent Pengirim', readonly=True)

    @api.constrains('latitude', 'longitude')
    def _check_koordinat(self):
        for rec in self:
            lat, lng = rec.latitude, rec.longitude
            if lat or lng:
                if not (-11 <= lat <= 6) or not (95 <= lng <= 141):
                    raise ValidationError(
                        "Koordinat tidak valid (lat=%.6f, lng=%.6f). "
                        "Pastikan latitude antara -11 s/d 6 dan longitude antara 95 s/d 141 "
                        "(wilayah Indonesia)." % (lat, lng)
                    )

    @api.model
    def default_get(self, fields_list):
        defaults = super().default_get(fields_list)
        user = self.env.user
        if user.polres_id and 'polres_id' in fields_list:
            defaults.setdefault('polres_id', user.polres_id.id)
        if user.polsek_id and 'polsek_id' in fields_list:
            defaults.setdefault('polsek_id', user.polsek_id.id)
        return defaults

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('code') or vals['code'] == 'New':
                vals['code'] = self.env['ir.sequence'].next_by_code(
                    'petadigi.hasil_giat.sequence') or 'New'
        return super().create(vals_list)

    @api.onchange('polres_id')
    def _onchange_polres_id(self):
        if self.polsek_id and self.polsek_id.polres_id != self.polres_id:
            self.polsek_id = False
