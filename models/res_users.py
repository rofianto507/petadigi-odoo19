from odoo import models, fields


class ResUsers(models.Model):
    _inherit = 'res.users'

    polres_id = fields.Many2one(
        'petadigi.polres',
        string='Polres',
        help='Isi jika pengguna ini adalah operator tingkat Polres.',
    )
    polsek_id = fields.Many2one(
        'petadigi.polsek',
        string='Polsek',
        domain="[('polres_id', '=', polres_id)]",
        help='Isi jika pengguna ini adalah operator tingkat Polsek.',
    )
    subdit_id = fields.Many2one(
        'petadigi.subdit',
        string='Subdit',
        help='Isi jika pengguna ini adalah operator Subdit.',
    )

    @property
    def SELF_READABLE_FIELDS(self):
        return super().SELF_READABLE_FIELDS + ['polres_id', 'polsek_id', 'subdit_id']

    @property
    def SELF_WRITEABLE_FIELDS(self):
        return super().SELF_WRITEABLE_FIELDS + ['polres_id', 'polsek_id', 'subdit_id']
