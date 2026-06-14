"""
Migrasi Sumber Dokumen dari sistem PHP/MySQL ke PetaDigi Odoo.

Cara pakai di Odoo shell:
    exec(open('/home/rofi/petadigi-migration/migrate_sumber_dokumen.py').read())

Format CSV (tanpa header):
    id, nama, tahun, keterangan, tipe, status
"""

import csv

CSV_PATH = '/home/rofi/petadigi-migration/sumber_dokumen.csv'

# Tipe valid di Odoo
VALID_TIPE = {'BENCANA', 'KRIMINALITAS', 'LALU LINTAS', 'LOKASI PENTING', 'KASUS MENONJOL'}

# Tahun valid sesuai selection di model (2020-2030)
VALID_TAHUN = {str(t) for t in range(2020, 2031)}

print("=" * 60)
print("MIGRASI SUMBER DOKUMEN")
print("=" * 60)

created          = 0
skipped_inactive = 0
skipped_dup      = 0
skipped_tipe     = []
skipped_tahun    = []

with open(CSV_PATH, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        if not row or len(row) < 6:
            continue

        old_id     = row[0].strip().strip('"')
        nama       = row[1].strip().strip('"')
        tahun      = row[2].strip().strip('"')
        keterangan = row[3].strip().strip('"').strip()
        tipe       = row[4].strip().strip('"').upper()
        status     = row[5].strip().strip('"')

        if not nama:
            continue

        # Skip nonaktif
        if status == '0':
            skipped_inactive += 1
            print(f"  [SKIP nonaktif] id={old_id}: {nama}")
            continue

        # Validasi tipe
        if tipe not in VALID_TIPE:
            skipped_tipe.append((old_id, nama, tipe))
            continue

        # Validasi tahun
        if tahun not in VALID_TAHUN:
            skipped_tahun.append((old_id, nama, tahun))
            continue

        # Cek duplikat
        existing = env['petadigi.sumber_dokumen'].search([
            ('name', '=ilike', nama),
            ('tipe_sumber', '=', tipe),
            ('tahun', '=', tahun),
        ], limit=1)
        if existing:
            skipped_dup += 1
            print(f"  [SKIP duplikat] {nama} ({tipe} {tahun})")
            continue

        vals = {
            'name': nama,
            'tipe_sumber': tipe,
            'tahun': tahun,
        }
        if keterangan and keterangan not in ('-', ''):
            vals['keterangan'] = keterangan

        env['petadigi.sumber_dokumen'].create(vals)
        created += 1
        print(f"  [OK] [{tipe}] {nama} ({tahun})")

env.cr.commit()

print("\n" + "=" * 60)
print("HASIL MIGRASI")
print("=" * 60)
print(f"  Berhasil dibuat  : {created}")
print(f"  Duplikat dilewati: {skipped_dup}")
print(f"  Nonaktif dilewati: {skipped_inactive}")
print(f"  Tipe tdk valid   : {len(skipped_tipe)}")
print(f"  Tahun tdk valid  : {len(skipped_tahun)}")

if skipped_tipe:
    print("\n  [PERHATIAN] Tipe tidak dikenali:")
    for old_id, nama, tipe in skipped_tipe:
        print(f"    id={old_id}: [{tipe}] {nama}")

if skipped_tahun:
    print("\n  [PERHATIAN] Tahun di luar range 2020-2030:")
    for old_id, nama, tahun in skipped_tahun:
        print(f"    id={old_id}: [{tahun}] {nama}")

print("\nSelesai.")
