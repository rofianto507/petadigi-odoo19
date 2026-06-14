"""
Migrasi Modus Operandi dari sistem PHP/MySQL ke PetaDigi Odoo.

Cara pakai di Odoo shell:
    exec(open('/home/rofi/petadigi-migration/migrate_modus_operandi.py').read())

Format CSV (tanpa header): id, nama, status
"""

import csv

CSV_PATH = '/home/rofi/petadigi-migration/modus_operandi.csv'

print("=" * 60)
print("MIGRASI MODUS OPERANDI")
print("=" * 60)

# --- 1. Hapus semua data lama ---
existing = env['petadigi.modus_operandi'].search([])
print(f"\nMenghapus {len(existing)} data lama...")
existing.unlink()
env.cr.commit()
print("Data lama berhasil dihapus.")

# --- 2. Import dari CSV ---
print("\nMemulai import...")

created          = 0
skipped_inactive = 0

with open(CSV_PATH, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        if not row or len(row) < 3:
            continue

        old_id = row[0].strip().strip('"')
        nama   = row[1].strip().strip('"')
        status = row[2].strip().strip('"')

        if not nama:
            continue

        if status == '0':
            skipped_inactive += 1
            print(f"  [SKIP nonaktif] id={old_id}: {nama}")
            continue

        env['petadigi.modus_operandi'].create({'name': nama})
        created += 1
        print(f"  [OK] {nama}")

env.cr.commit()

print("\n" + "=" * 60)
print("HASIL MIGRASI")
print("=" * 60)
print(f"  Berhasil dibuat  : {created}")
print(f"  Nonaktif dilewati: {skipped_inactive}")
print("\nSelesai.")
