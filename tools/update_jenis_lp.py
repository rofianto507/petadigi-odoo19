"""
Update jenis_lp pada petadigi.kriminalitas berdasarkan pola no_lp.

Strategi normalisasi: hapus SEMUA karakter non-alphanumeric, lalu
cari substring 'LPA' atau 'LPB' di mana saja dalam string.

Menangani semua varian:
  LP/A/...                            → LPA... → LP A
  LP - A / ...                        → LPA... → LP A
  LP / B – 12 / ...  (en-dash)        → LPB12  → LP B
  Laporan Polisi Nomor : LP – B / ... → ...LPB → LP B
  Lp/B-08/...        (huruf kecil)    → LPB08  → LP B

Run di Odoo shell:
  exec(open('/home/rofi/petadigi-migration/update_jenis_lp.py').read())
"""

import re

records = env['petadigi.kriminalitas'].search([
    ('jenis_lp', '=', False),
    ('no_lp', '!=', False),
])
print(f"Records tanpa jenis_lp: {len(records)}")

lp_a_ids = []
lp_b_ids = []
unknown = []

for rec in records:
    # hapus semua karakter selain huruf dan angka, lalu uppercase
    norm = re.sub(r'[^A-Za-z0-9]', '', rec.no_lp).upper()
    if 'LPA' in norm:
        lp_a_ids.append(rec.id)
    elif 'LPB' in norm:
        lp_b_ids.append(rec.id)
    elif re.match(r'^B\d', norm):
        # pola: "B / 124 / IV / 2025 / ..." → LP B tanpa prefix LP
        lp_b_ids.append(rec.id)
    else:
        unknown.append(rec.no_lp)

if lp_a_ids:
    env['petadigi.kriminalitas'].browse(lp_a_ids).write({'jenis_lp': 'LP A'})
    env.cr.commit()

if lp_b_ids:
    env['petadigi.kriminalitas'].browse(lp_b_ids).write({'jenis_lp': 'LP B'})
    env.cr.commit()

print(f"\n{'='*45}")
print(f"Selesai:")
print(f"  LP A diupdate : {len(lp_a_ids)}")
print(f"  LP B diupdate : {len(lp_b_ids)}")
print(f"  Tak dikenal   : {len(unknown)}")
if unknown:
    print("Contoh no_lp tak dikenal:")
    for s in unknown[:10]:
        print(f"  {s}")
print(f"{'='*45}")
