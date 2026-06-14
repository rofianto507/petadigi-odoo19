"""
Migrasi Data Lalu Lintas dari sistem PHP/MySQL ke PetaDigi Odoo.

Cara pakai di Odoo shell:
    exec(open('/home/rofi/petadigi-migration/migrate_lalu_lintas.py').read())

Format CSV (tanpa header, 16 kolom):
    id, nama, keterangan, foto, desa_kode, kategori_nama, jenis_jalan_nama,
    latitude, longitude, status, created_at, sumber_nama,
    penyebab, penanggungjawab, tindak_lanjut, state

Catatan:
- foto = nama file saja (mis. lalin_xxx.jpg); didownload dari server lama
- desa di-lookup via code, kecamatan+kabupaten otomatis dari relasi desa
- created_at adalah WIB, dikonversi ke UTC sebagai tanggal_kejadian
- status=0 dilewati (tidak ada di Odoo)
- state: PROSES / SELESAI (sama persis dengan MySQL enum)
"""

import csv
import base64
import urllib.request
from datetime import datetime, timedelta

CSV_PATH   = '/home/rofi/petadigi-migration/lalin.csv'
BASE_FOTO  = 'https://petadigi.polisibaik.id/public/upload/lalin/'
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
print("MIGRASI DATA LALU LINTAS")
print("=" * 60)

# --- 1. Lookup maps ---
def build_name_map(model, domain=None):
    domain = domain or []
    return {r.name.upper().strip(): r.id
            for r in env[model].search(domain) if r.name}

kategori_map  = build_name_map('petadigi.kategori_lalu_lintas')
jenis_jln_map = build_name_map('petadigi.jenis_jalan')
sumber_map    = build_name_map('petadigi.sumber_dokumen',
                                [('tipe_sumber', '=', 'LALU LINTAS')])
desa_map      = {r.code: r for r in env['petadigi.desa'].search([])}

print(f"  Kategori Lalin  : {len(kategori_map)}")
print(f"  Jenis Jalan     : {len(jenis_jln_map)}")
print(f"  Sumber Dokumen  : {len(sumber_map)}")
print(f"  Desa            : {len(desa_map)}")

# --- 2. Import ---
created  = 0
skipped  = 0
warnings = {
    'kategori': set(), 'jenis_jalan': set(),
    'sumber': set(), 'desa_kode': set(),
}
foto_ok   = 0
foto_fail = 0

print("\nMemulai import...\n")

with open(CSV_PATH, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        if not row or len(row) < 16:
            continue

        old_id        = clean(row[0])
        nama          = clean(row[1])
        keterangan    = clean(row[2])
        foto_file     = clean(row[3])
        desa_kode     = clean(row[4])
        kategori_nm   = clean(row[5])
        jenis_jln_nm  = clean(row[6])
        latitude_str  = clean(row[7])
        longitude_str = clean(row[8])
        status        = clean(row[9])
        created_at    = clean(row[10])
        sumber_nm     = clean(row[11])
        penyebab      = clean(row[12])
        penanggung_jw = clean(row[13])
        tindak_lanjut = clean(row[14])
        state         = clean(row[15]) or 'PROSES'

        # Skip nonaktif
        if status == '0':
            skipped += 1
            print(f"  [SKIP nonaktif] id={old_id}: {nama[:50]}")
            continue

        # State harus valid
        if state not in ('PROSES', 'SELESAI'):
            state = 'PROSES'

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
        kategori_id  = kategori_map.get(kategori_nm.upper()) if kategori_nm else None
        jenis_jln_id = jenis_jln_map.get(jenis_jln_nm.upper()) if jenis_jln_nm else None
        sumber_id    = sumber_map.get(sumber_nm.upper()) if sumber_nm else None

        # Desa → kecamatan → kabupaten
        desa_rec     = desa_map.get(desa_kode) if desa_kode else None
        desa_id      = desa_rec.id if desa_rec else None
        kecamatan_id = desa_rec.kecamatan_id.id if desa_rec else None
        kabupaten_id = desa_rec.kecamatan_id.kabupaten_id.id if desa_rec else None

        # Warning
        if kategori_nm and not kategori_id:
            warnings['kategori'].add(kategori_nm)
        if jenis_jln_nm and not jenis_jln_id:
            warnings['jenis_jalan'].add(jenis_jln_nm)
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
        vals = {'state': state}
        if nama:          vals['nama_lokasi']      = nama
        if keterangan:    vals['keterangan']        = keterangan
        if penyebab:      vals['penyebab']          = penyebab
        if penanggung_jw: vals['penanggung_jawab']  = penanggung_jw
        if tindak_lanjut: vals['tindak_lanjut']     = tindak_lanjut
        if tanggal:       vals['tanggal_kejadian']  = tanggal
        if kategori_id:   vals['kategori_id']       = kategori_id
        if jenis_jln_id:  vals['jenis_jalan_id']    = jenis_jln_id
        if sumber_id:     vals['sumber_dokumen_id'] = sumber_id
        if desa_id:       vals['desa_id']            = desa_id
        if kecamatan_id:  vals['kecamatan_id']       = kecamatan_id
        if kabupaten_id:  vals['kabupaten_id']        = kabupaten_id
        if latitude:      vals['latitude']            = latitude
        if longitude:     vals['longitude']           = longitude
        if foto_b64:
            vals['foto']          = foto_b64
            vals['foto_filename'] = foto_nama

        env['petadigi.lalu_lintas'].create(vals)
        created += 1
        foto_status = '[foto OK]' if foto_b64 else ('[no foto]' if not foto_file else '[foto FAIL]')
        print(f"  [OK] id={old_id} {foto_status}: {nama[:50]}")

env.cr.commit()

# --- 3. Laporan ---
print("\n" + "=" * 60)
print("HASIL MIGRASI")
print("=" * 60)
print(f"  Berhasil dibuat  : {created}")
print(f"  Nonaktif dilewati: {skipped}")
print(f"  Foto berhasil    : {foto_ok}")
print(f"  Foto gagal       : {foto_fail}")
print(f"  Tanpa foto       : {created - foto_ok - foto_fail}")

for key, nilai in warnings.items():
    if nilai:
        label = {
            'kategori': 'Kategori Lalu Lintas',
            'jenis_jalan': 'Jenis Jalan',
            'sumber': 'Sumber Dokumen',
            'desa_kode': 'Kode Desa',
        }.get(key, key)
        print(f"\n  [PERHATIAN] {label} tidak cocok di Odoo ({len(nilai)}):")
        for n in sorted(nilai):
            print(f"    → '{n}'")

print("\nSelesai.")
