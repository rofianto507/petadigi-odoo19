"""
Migrasi Sub Kategori Kriminal dari sistem PHP/MySQL ke PetaDigi Odoo.

Cara pakai di VPS:
1. Copy script ini dan file CSV ke direktori yang sama di server.
2. Jalankan Odoo shell:
       python odoo-bin shell -d <nama_database>
3. Di dalam shell, jalankan:
       exec(open('/path/ke/migrate_sub_kategori_kriminal.py').read())

File CSV harus berada di direktori yang sama dengan script ini.
Format CSV (tanpa header):
    old_id, nama, status, kategori_nama
"""

import csv
import os

CSV_PATH = '/home/rofi/petadigi-migration/sub_kategori_kriminal.csv'

print("=" * 60)
print("MIGRASI SUB KATEGORI KRIMINAL")
print("=" * 60)

# --- 1. Load semua kategori kriminal dari Odoo ---
kategori_records = env['petadigi.kategori_kriminal'].search([])
kategori_map = {r.name.upper().strip(): r.id for r in kategori_records}

print(f"\nKategori ditemukan di Odoo ({len(kategori_map)}):")
for nama_kat in sorted(kategori_map.keys()):
    print(f"  - {nama_kat}")

if not kategori_map:
    print("\n[ERROR] Tidak ada kategori kriminal di Odoo!")
    print("Pastikan petadigi.kategori_kriminal sudah diisi terlebih dahulu.")
    raise SystemExit(1)

# --- 2. Baca CSV ---
if not os.path.exists(CSV_PATH):
    print(f"\n[ERROR] File CSV tidak ditemukan: {CSV_PATH}")
    raise SystemExit(1)

print(f"\nMembaca CSV: {CSV_PATH}")

created          = 0
skipped_inactive = 0
skipped_dup      = 0
skipped_no_kat   = []

with open(CSV_PATH, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for i, row in enumerate(reader, start=1):
        if not row or len(row) < 4:
            continue

        old_id       = row[0].strip().strip('"')
        nama         = row[1].strip().strip('"')
        status       = row[2].strip().strip('"')
        kategori_raw = row[3].strip().strip('"')

        if not nama:
            continue

        # Skip record nonaktif
        if status == '0':
            skipped_inactive += 1
            print(f"  [SKIP nonaktif] id={old_id}: {nama}")
            continue

        # Cari kategori di Odoo (case-insensitive)
        kategori_id = kategori_map.get(kategori_raw.upper().strip())
        if not kategori_id:
            skipped_no_kat.append((old_id, nama, kategori_raw))
            continue

        # Cek duplikat berdasarkan nama + kategori
        existing = env['petadigi.sub_kategori_kriminal'].search([
            ('name', '=ilike', nama),
            ('kategori_kriminal_id', '=', kategori_id),
        ], limit=1)
        if existing:
            skipped_dup += 1
            continue

        env['petadigi.sub_kategori_kriminal'].create({
            'name': nama,
            'kategori_kriminal_id': kategori_id,
        })
        created += 1
        print(f"  [OK] [{kategori_raw}] {nama}")

# Commit ke database
env.cr.commit()

# --- 3. Laporan ---
print("\n" + "=" * 60)
print("HASIL MIGRASI")
print("=" * 60)
print(f"  Berhasil dibuat  : {created}")
print(f"  Duplikat dilewati: {skipped_dup}")
print(f"  Nonaktif dilewati: {skipped_inactive}")
print(f"  Kategori tdk ada : {len(skipped_no_kat)}")

if skipped_no_kat:
    print("\n  [PERHATIAN] Sub kategori berikut tidak dapat dimigrasi")
    print("  karena nama kategorinya tidak cocok dengan data di Odoo:")
    for old_id, nama, kat in skipped_no_kat:
        print(f"    id={old_id}: [{kat}] {nama}")
    print("\n  Tambahkan kategori tersebut di Odoo lalu jalankan script ini lagi.")

print("\nSelesai.")
