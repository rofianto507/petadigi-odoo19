"""
Migrasi Data Bencana dari sistem PHP/MySQL ke PetaDigi Odoo.

Cara pakai di Odoo shell:
    exec(open('/home/rofi/petadigi-migration/migrate_bencana.py').read())

Format CSV (tanpa header, 12 kolom):
    id, nama, penyebab, tindaklanjut, foto, desa_kode,
    kategori_nama, latitude, longitude, status, created_at, sumber_nama

Catatan:
- foto = nama file saja (mis. bencana_xxx.jpg); didownload dari server lama
- desa di-lookup via code, kecamatan+kabupaten otomatis dari relasi desa
- created_at adalah WIB, dikonversi ke UTC sebagai tanggal_kejadian
- status 1=AKTIF, 0=NON AKTIF
"""

import csv
import base64
import urllib.request
from datetime import datetime, timedelta

CSV_PATH   = '/home/rofi/petadigi-migration/bencana.csv'
BASE_FOTO  = 'https://petadigi.polisibaik.id/public/upload/bencana/'
WIB_OFFSET = timedelta(hours=7)


def clean(val):
    if not val:
        return ''
    v = val.strip()
    return '' if v in ('\\N', r'\N', 'NULL') else v


def to_utc(s):
    s = clean(s)
    if not s:
        return False
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d'):
        try:
            return datetime.strptime(s, fmt) - WIB_OFFSET
        except ValueError:
            continue
    return False


def download_foto(filename):
    """Download foto dari server lama, kembalikan (base64_str, filename) atau (None, None)."""
    if not filename:
        return None, None
    url = BASE_FOTO + filename
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status == 200:
                return base64.b64encode(resp.read()).decode(), filename
    except Exception as e:
        print(f"    [WARN] Gagal download foto {filename}: {e}")
    return None, None


print("=" * 60)
print("MIGRASI DATA BENCANA")
print("=" * 60)

# --- 1. Lookup maps ---
def build_name_map(model, domain=None):
    domain = domain or []
    return {r.name.upper().strip(): r.id
            for r in env[model].search(domain) if r.name}

kategori_map = build_name_map('petadigi.kategori_bencana')
sumber_map   = build_name_map('petadigi.sumber_dokumen',
                               [('tipe_sumber', '=', 'BENCANA')])
desa_map     = {r.code: r for r in env['petadigi.desa'].search([])}

print(f"  Kategori Bencana: {len(kategori_map)}")
print(f"  Sumber Dokumen  : {len(sumber_map)}")
print(f"  Desa            : {len(desa_map)}")

# --- 2. Import ---
created  = 0
skipped  = 0
warnings = {
    'kategori': set(), 'sumber': set(), 'desa_kode': set(),
}
foto_ok   = 0
foto_fail = 0

print("\nMemulai import...\n")

with open(CSV_PATH, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        if not row or len(row) < 12:
            continue

        old_id       = clean(row[0])
        nama         = clean(row[1])
        penyebab     = clean(row[2])
        tindaklanjut = clean(row[3])
        foto_file    = clean(row[4])
        desa_kode    = clean(row[5])
        kategori_nm  = clean(row[6])
        latitude_str = clean(row[7])
        longitude_str= clean(row[8])
        status       = clean(row[9])
        created_at   = clean(row[10])
        sumber_nm    = clean(row[11])

        if not nama:
            continue

        # State
        state = 'AKTIF' if status != '0' else 'NON AKTIF'

        # Datetime WIB → UTC
        tanggal = to_utc(created_at)

        # Koordinat
        try:
            latitude = float(latitude_str) if latitude_str else 0.0
        except ValueError:
            latitude = 0.0
        try:
            longitude = float(longitude_str) if longitude_str else 0.0
        except ValueError:
            longitude = 0.0

        # Lookup relasi
        kategori_id = kategori_map.get(kategori_nm.upper()) if kategori_nm else None
        sumber_id   = sumber_map.get(sumber_nm.upper()) if sumber_nm else None

        # Desa → kecamatan → kabupaten
        desa_rec     = desa_map.get(desa_kode) if desa_kode else None
        desa_id      = desa_rec.id if desa_rec else None
        kecamatan_id = desa_rec.kecamatan_id.id if desa_rec else None
        kabupaten_id = desa_rec.kecamatan_id.kabupaten_id.id if desa_rec else None

        # Kumpulkan warning
        if kategori_nm and not kategori_id:
            warnings['kategori'].add(kategori_nm)
        if sumber_nm and not sumber_id:
            warnings['sumber'].add(sumber_nm)
        if desa_kode and not desa_id:
            warnings['desa_kode'].add(desa_kode)

        # Download foto
        foto_b64, foto_nama = download_foto(foto_file)
        if foto_file:
            if foto_b64:
                foto_ok += 1
            else:
                foto_fail += 1

        # Build vals
        vals = {
            'nama_bencana': nama,
            'state': state,
        }
        if tanggal:          vals['tanggal_kejadian'] = tanggal
        if penyebab:         vals['penyebab']         = penyebab
        if tindaklanjut:     vals['tindak_lanjut']    = tindaklanjut
        if kategori_id:      vals['kategori_id']      = kategori_id
        if sumber_id:        vals['sumber_dokumen_id']= sumber_id
        if desa_id:          vals['desa_id']           = desa_id
        if kecamatan_id:     vals['kecamatan_id']      = kecamatan_id
        if kabupaten_id:     vals['kabupaten_id']      = kabupaten_id
        if latitude:         vals['latitude']           = latitude
        if longitude:        vals['longitude']          = longitude
        if foto_b64:
            vals['foto']          = foto_b64
            vals['foto_filename'] = foto_nama

        env['petadigi.bencana'].create(vals)
        created += 1
        foto_status = f'[foto OK]' if foto_b64 else ('[no foto]' if not foto_file else '[foto FAIL]')
        print(f"  [OK] id={old_id} {foto_status}: {nama[:50]}")

env.cr.commit()

# --- 3. Laporan ---
print("\n" + "=" * 60)
print("HASIL MIGRASI")
print("=" * 60)
print(f"  Berhasil dibuat  : {created}")
print(f"  Foto berhasil    : {foto_ok}")
print(f"  Foto gagal       : {foto_fail}")
print(f"  Tanpa foto       : {created - foto_ok - foto_fail}")

for key, nilai in warnings.items():
    if nilai:
        label = {
            'kategori': 'Kategori Bencana',
            'sumber': 'Sumber Dokumen',
            'desa_kode': 'Kode Desa',
        }.get(key, key)
        print(f"\n  [PERHATIAN] {label} tidak cocok di Odoo ({len(nilai)}):")
        for n in sorted(nilai):
            print(f"    → '{n}'")

print("\nSelesai.")
