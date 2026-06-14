"""
Fix sub_kategori_id pada petadigi.kriminalitas yang gagal match saat import
karena perbedaan nama antara sistem lama dan Odoo.

Mapping nama yang berbeda:
  Sistem lama                              → Odoo
  "Pencurian dengan kekerasan (Curas)"     → "Curas"
  (tambahkan mapping lain di NAME_MAP jika ada)

Cara kerja:
  - Baca kriminalitas.csv
  - Untuk setiap baris yang sub_kategori_nama-nya ada di NAME_MAP,
    cari record Odoo by no_lp dan update sub_kategori_id-nya

Run di Odoo shell:
  exec(open('/home/rofi/petadigi-migration/fix_sub_kategori_kriminalitas.py').read())
"""

import csv

CSV_PATH = '/home/rofi/petadigi-migration/kriminalitas.csv'

# ── Mapping nama sistem lama → nama di Odoo ────────────────────────────
NAME_MAP = {
    'PENCURIAN DENGAN KEKERASAN (CURAS)': 'Curas',
    # tambahkan baris di sini jika ada mismatch lain, contoh:
    # 'PENCURIAN DENGAN PEMBERATAN (CURAT)': 'Curat',
}

# ── Build cache sub_kategori Odoo ──────────────────────────────────────
sub_kat_by_name = {r.name.upper(): r.id
                   for r in env['petadigi.sub_kategori_kriminal'].search([])}

# Validasi semua target nama ada di Odoo
for lama, odoo_name in NAME_MAP.items():
    if odoo_name.upper() not in sub_kat_by_name:
        print(f"WARNING: '{odoo_name}' tidak ditemukan di Odoo! Periksa nama.")
    else:
        print(f"OK: '{lama}' → '{odoo_name}' (id={sub_kat_by_name[odoo_name.upper()]})")

# ── Baca CSV, kumpulkan (no_lp → sub_kategori_id) yang perlu difix ────
fixes = {}   # no_lp → sub_kategori_id

with open(CSV_PATH, encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)  # skip header
    for row in reader:
        sub_kat_lama = row[22].strip().upper() if row[22] and row[22] != r'\N' else ''
        if sub_kat_lama not in NAME_MAP:
            continue

        odoo_name = NAME_MAP[sub_kat_lama]
        sub_kat_id = sub_kat_by_name.get(odoo_name.upper())
        if not sub_kat_id:
            continue

        no_lp_raw = row[1].strip()
        no_lp = no_lp_raw if no_lp_raw and no_lp_raw != r'\N' else f'IMPORT-{row[0]}'
        fixes[no_lp] = sub_kat_id

print(f"\nRecords dari CSV yang perlu difix: {len(fixes)}")

# ── Update Odoo ────────────────────────────────────────────────────────
# Kelompokkan by sub_kategori_id untuk bulk write
from collections import defaultdict
by_subkat = defaultdict(list)
for no_lp, sub_kat_id in fixes.items():
    by_subkat[sub_kat_id].append(no_lp)

total_updated = 0
for sub_kat_id, nolp_list in by_subkat.items():
    # Ambil records yang memang belum punya sub_kategori (gagal import)
    records = env['petadigi.kriminalitas'].search([
        ('no_lp', 'in', nolp_list),
        ('sub_kategori_id', '=', False),
    ])
    if records:
        records.write({'sub_kategori_id': sub_kat_id})
        env.cr.commit()
        total_updated += len(records)
        sub_name = env['petadigi.sub_kategori_kriminal'].browse(sub_kat_id).name
        print(f"  Updated {len(records)} records → sub_kategori '{sub_name}'")

print(f"\nTotal diupdate: {total_updated}")
