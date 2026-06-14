"""
Migration: rengiats (MySQL) → petadigi.jenis_laporan (Odoo)

CSV columns (0-indexed):
 0  id       MySQL id (ref only)
 1  judul    → nama
 2  keterangan
 3  status   1=aktif, 0=skip
 4  state    AKTIF → aktif | NON AKTIF → non_aktif | NULL → draft

public_token di-generate otomatis oleh Odoo saat create.

Run di Odoo shell:
  exec(open('/home/rofi/petadigi-migration/migrate_jenis_laporan.py').read())
"""

import csv

CSV_PATH = '/home/rofi/petadigi-migration/jenis_laporan.csv'

STATE_MAP = {
    'AKTIF':     'aktif',
    'NON AKTIF': 'non_aktif',
}

def _v(s):
    if s is None or s == r'\N' or s.strip() == '':
        return None
    return s.strip()

# Cache nama yang sudah ada (hindari duplikat)
existing = {r.nama.upper() for r in env['petadigi.jenis_laporan'].search([])}
print(f"Jenis laporan existing: {len(existing)}")

ok = skip_dup = skip_err = 0

with open(CSV_PATH, encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)  # skip header
    for row in reader:
        try:
            nama = _v(row[1])
            if not nama:
                skip_err += 1
                continue

            if nama.upper() in existing:
                skip_dup += 1
                continue

            state_lama = _v(row[4])
            state_odoo = STATE_MAP.get(state_lama, 'draft') if state_lama else 'draft'

            vals = {
                'nama':        nama,
                'keterangan':  _v(row[2]) or False,
                'state':       state_odoo,
            }

            rec = env['petadigi.jenis_laporan'].create(vals)
            existing.add(nama.upper())
            ok += 1
            print(f"  [{rec.id}] {nama} → {state_odoo} | token: {rec.public_token[:12]}...")

        except Exception as e:
            skip_err += 1
            print(f"  ERROR row {row[0]}: {e}")

env.cr.commit()

print(f"\n{'='*45}")
print(f"Selesai:")
print(f"  Berhasil diimport : {ok}")
print(f"  Skip (duplikat)   : {skip_dup}")
print(f"  Skip (error)      : {skip_err}")
print(f"{'='*45}")
