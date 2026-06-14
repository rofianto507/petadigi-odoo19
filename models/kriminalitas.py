from odoo import models, fields, api

class Kriminalitas(models.Model):
    _name = 'petadigi.kriminalitas'
    _description = 'Kasus Kriminalitas'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'tanggal_kejadian desc'
    _rec_name = 'code'
    _sql_constraints = [
        ('krim_no_lp_unique', 'unique(no_lp)', "No. LP harus unik!"),
    ]
    code = fields.Char('Kode', readonly=True, copy=False, default='New', tracking=True)
    jenis_lp= fields.Selection([
        ('LP A', 'LP A'),
        ('LP B', 'LP B'),
    ])
    no_lp = fields.Char('No. LP', required=True,tracking=True)
    jenis_tkp_id = fields.Many2one('petadigi.jenis_tkp', string='Jenis TKP', tracking=True)
    tempat_kejadian = fields.Text('Tempat Kejadian',tracking=True)
    latitude = fields.Float('Latitude', digits=(10, 6),tracking=True)
    longitude = fields.Float('Longitude', digits=(10, 6),tracking=True)
    tanggal_kejadian = fields.Datetime('Tanggal Kejadian',tracking=True)
    tanggal_laporan = fields.Datetime('Tanggal Laporan',tracking=True)
    pelapor = fields.Text('Pelapor',tracking=True)
    apa_yang_terjadi = fields.Text('Apa yang Terjadi',tracking=True)
    terlapor = fields.Text('Terlapor',tracking=True)
    korban = fields.Text('Korban',tracking=True)
    tindak_pidana = fields.Text('Tindak Pidana',tracking=True)
    saksi = fields.Text('Saksi',tracking=True)
    barang_bukti = fields.Text('Barang Bukti',tracking=True)
    uraian_singkat = fields.Text('Uraian Singkat',tracking=True)
    penanggung_jawab = fields.Char('Penanggung Jawab',tracking=True)
    subdit_id = fields.Many2one('petadigi.subdit', string='Tujuan', tracking=True)
    sumber_dokumen_id = fields.Many2one(
        'petadigi.sumber_dokumen',
        string='Sumber Dokumen',
        domain=[('tipe_sumber', '=', 'KRIMINALITAS')],
        tracking=True
    )
    tahun = fields.Selection(
        [(str(t), str(t)) for t in range(2020, 2031)],
        string='Tahun',
        related='sumber_dokumen_id.tahun',
        store=True,
    )
    kategori_id = fields.Many2one('petadigi.kategori_kriminal', string='Kategori', tracking=True)
    sub_kategori_id = fields.Many2one(
        'petadigi.sub_kategori_kriminal',
        string='Sub Kategori',
        domain="[('kategori_kriminal_id', '=', kategori_id)]",  # filter by kategori
        tracking=True
    )
    polres_id = fields.Many2one('petadigi.polres', string='Polres', tracking=True)
    polsek_id = fields.Many2one(
        'petadigi.polsek',
        string='Polsek',
        domain="[('polres_id', '=', polres_id)]",  # filter by polres
        tracking=True
    )
    kabupaten_id = fields.Many2one('petadigi.kabupaten', string='Kabupaten/Kota', tracking=True)
    kecamatan_id = fields.Many2one(
        'petadigi.kecamatan',
        string='Kecamatan',
        domain="[('kabupaten_id', '=', kabupaten_id)]",
        tracking=True
    )
    desa_id = fields.Many2one(
        'petadigi.desa',
        string='Desa/Kelurahan',
        domain="[('kecamatan_id', '=', kecamatan_id)]",
        tracking=True
    )
    status_perkara = fields.Selection([
        ('PROSES', 'PROSES'),
        ('SELESAI', 'SELESAI'),
    ], string='Status Perkara', tracking=True, required=True, default='PROSES')
    
    sub_status_perkara_id = fields.Many2one(
        'petadigi.sub_status_perkara',
        string='Sub Status Perkara',
        domain="[('status_perkara', '=', status_perkara)]",
        tracking=True,
    )
    tanggal_selesai = fields.Datetime('Tanggal Selesai', tracking=True)
    is_perkara_selesai = fields.Boolean(
        compute='_compute_is_perkara_selesai',
        store=False
    )
     

    @api.depends('status_perkara')
    def _compute_is_perkara_selesai(self):
        for rec in self:
            rec.is_perkara_selesai = (rec.status_perkara == 'SELESAI')
    def action_set_proses(self):
        self.write({'status_perkara': 'PROSES', 'sub_status_perkara_id': False, 'tanggal_selesai': False})

    def action_set_selesai(self):
        self.write({'status_perkara': 'SELESAI', 'sub_status_perkara_id': False})

    @api.model
    def default_get(self, fields_list):
        defaults = super().default_get(fields_list)
        user = self.env.user
        if user.polres_id and 'polres_id' in fields_list:
            defaults.setdefault('polres_id', user.polres_id.id)
        if user.polsek_id and 'polsek_id' in fields_list:
            defaults.setdefault('polsek_id', user.polsek_id.id)
        if 'kabupaten_id' in fields_list:
            if user.polsek_id:
                kecs = self.env['petadigi.kecamatan'].search(
                    [('polsek_id', '=', user.polsek_id.id)], limit=2)
                kab_ids = kecs.mapped('kabupaten_id')
                if len(kab_ids) == 1:
                    defaults.setdefault('kabupaten_id', kab_ids.id)
            elif user.polres_id:
                kabs = self.env['petadigi.kabupaten'].search(
                    [('polres_id', '=', user.polres_id.id)], limit=2)
                if len(kabs) == 1:
                    defaults.setdefault('kabupaten_id', kabs.id)
        return defaults

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get('code') or vals['code'] == 'New':
                vals['code'] = self.env['ir.sequence'].next_by_code('petadigi.kriminalitas.sequence') or 'New'
        return super().create(vals_list)

    def action_open_import_wizard(self):
        """Buka wizard import dokumen LP"""
        return {
            'type': 'ir.actions.act_window',
            'name': 'Import Dokumen LP',
            'res_model': 'petadigi.import.lp.wizard',
            'view_mode': 'form',
            'target': 'new',

        }
    
    @api.onchange('polres_id')
    def _onchange_polres_id(self):
        if self.polsek_id and self.polsek_id.polres_id != self.polres_id:
            self.polsek_id = False
    @api.onchange('kategori_id')
    def _onchange_kategori_id(self):
        self.sub_kategori_id = False  # reset sub kategori saat kategori diganti

    @api.onchange('kabupaten_id')
    def _onchange_kabupaten_id(self):
        self.kecamatan_id = False  # reset kecamatan saat kabupaten diganti

    @api.onchange('kecamatan_id')
    def _onchange_kecamatan_id(self):
        self.desa_id = False
        if self.kecamatan_id and not self.kabupaten_id:
            self.kabupaten_id = self.kecamatan_id.kabupaten_id

    @api.onchange('status_perkara')
    def _onchange_status_perkara(self):
        self.sub_status_perkara_id = False  # reset sub status perkara saat status perkara diganti
        if self.status_perkara != 'SELESAI':
            self.tanggal_selesai = False