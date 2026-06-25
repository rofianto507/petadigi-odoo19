from odoo import models, fields


class LokasiPatroli(models.Model):
    _name = 'petadigi.lokasi_patroli'
    _description = 'Lokasi Patroli — Titik yang Dikunjungi Selama Patroli'
    _order = 'tanggal desc'
    _rec_name = 'tanggal'

    patroli_id = fields.Many2one(
        'petadigi.patroli', string='Patroli',
        required=True, ondelete='cascade', index=True,
    )
    tanggal = fields.Datetime('Tanggal', required=True, default=fields.Datetime.now)
    latitude = fields.Float('Latitude', digits=(10, 6), aggregator=False)
    longitude = fields.Float('Longitude', digits=(10, 6), aggregator=False)
    foto = fields.Binary('Foto Dokumentasi', attachment=True)
    foto_filename = fields.Char('Nama File Foto')
    catatan = fields.Text('Catatan')
