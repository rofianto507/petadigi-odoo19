from odoo import models, fields, api

class SubKategoriKriminal(models.Model):
    _name = 'petadigi.sub_kategori_kriminal'
    _description = 'Sub Kategori Kriminal'

    name = fields.Char(string="Nama", required=True)
    keterangan = fields.Text(string="Keterangan")
    kategori_kriminal_id = fields.Many2one(
        'petadigi.kategori_kriminal', string="Kategori Kriminal", required=True
    )

    kriminalitas_ids     = fields.One2many('petadigi.kriminalitas', 'sub_kategori_id')
    kriminalitas_proses  = fields.Integer(compute='_compute_kriminalitas_count', string='Proses', store=True)
    kriminalitas_selesai = fields.Integer(compute='_compute_kriminalitas_count', string='Selesai', store=True)

    @api.depends('kriminalitas_ids.status_perkara')
    def _compute_kriminalitas_count(self):
        groups = self.env['petadigi.kriminalitas'].read_group(
            [('sub_kategori_id', 'in', self.ids)],
            ['sub_kategori_id', 'status_perkara'],
            ['sub_kategori_id', 'status_perkara'],
            lazy=False,
        )
        data = {}
        for g in groups:
            sid    = g['sub_kategori_id'][0]
            status = g['status_perkara']
            count  = g['__count']
            if sid not in data:
                data[sid] = {'PROSES': 0, 'SELESAI': 0}
            if status in ('PROSES', 'SELESAI'):
                data[sid][status] += count
        for rec in self:
            rec.kriminalitas_proses  = data.get(rec.id, {}).get('PROSES',  0)
            rec.kriminalitas_selesai = data.get(rec.id, {}).get('SELESAI', 0)

    def _action_view_kriminalitas(self, status):
        return {
            'type': 'ir.actions.act_window',
            'name': f'Kriminalitas {status} — {self.name}',
            'res_model': 'petadigi.kriminalitas',
            'view_mode': 'list,form',
            'domain': [('sub_kategori_id', '=', self.id), ('status_perkara', '=', status)],
        }

    def action_view_kriminalitas_proses(self):
        return self._action_view_kriminalitas('PROSES')

    def action_view_kriminalitas_selesai(self):
        return self._action_view_kriminalitas('SELESAI')