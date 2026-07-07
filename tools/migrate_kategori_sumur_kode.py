"""
Migrasi satu kali: isi field 'kode' pada record petadigi.kategori_sumur_minyak
berdasarkan nama kategori yang sudah ada (BKU, K3S, SUMUR MASYARAKAT).

Jalankan via Odoo shell:
    python odoo-bin shell -d NAMA_DATABASE < addons/petadigi/tools/migrate_kategori_sumur_kode.py

Setelah migrasi, field kategori_kode pada petadigi.sumur_minyak (related field store=True)
akan otomatis terisi saat module di-upgrade.
"""

# env sudah tersedia otomatis di Odoo shell

NAME_TO_KODE = {
    'SUMUR MASYARAKAT': 'sumur_masyarakat',
    'BKU': 'bku',
    'K3S': 'k3s',
}

count = 0
KategoriSumur = env['petadigi.kategori_sumur_minyak'].sudo()
for name, kode in NAME_TO_KODE.items():
    records = KategoriSumur.search([('name', 'ilike', name), ('kode', '=', False)])
    for rec in records:
        rec.write({'kode': kode})
        count += 1
        print(f"  Set kode='{kode}' untuk kategori: {rec.name}")

env.cr.commit()
print(f"\nMigrasi selesai: {count} kategori diupdate.")
print("Lakukan upgrade modul petadigi agar field kategori_kode pada sumur_minyak terisi otomatis.")
