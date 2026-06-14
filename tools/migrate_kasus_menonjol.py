"""
Migrasi Kasus Menonjol dari sistem PHP/MySQL ke PetaDigi Odoo.

Cara pakai di Odoo shell:
    exec(open('/home/rofi/petadigi-migration/migrate_kasus_menonjol.py').read())

Format CSV (tanpa header, hasil query JOIN):
    old_id, nomor_lp, tanggal, tersangka, permasalahan, penanganan,
    tindak_lanjut, state, tujuan, kategori_nama, modus_operandi_nama,
    jenis_tkp_nama, polres_nama, polsek_nama, desa_kode, sumber_nama

Catatan:
- tanggal di MySQL adalah WIB (UTC+7), dikonversi ke UTC saat import
- NULL di MySQL muncul sebagai \\N di CSV
- no_lp yang kosong/placeholder diganti '-'
- desa di-lookup via code (exact match), kecamatan+kabupaten diambil dari desa
"""

import csv
from datetime import datetime, timedelta

CSV_PATH = '/home/rofi/petadigi-migration/kasus_menonjol.csv'
WIB_OFFSET = timedelta(hours=7)

# Nilai no_lp yang dianggap kosong/placeholder
LP_PLACEHOLDER = {'-', 'nihil', 'NIHIL', 'jika ada', 'Jika Ada', '', '-'}


def clean(val):
    """Strip whitespace dan handle NULL dari MySQL CSV export."""
    if not val:
        return ''
    v = val.strip()
    return '' if v in ('\\N', r'\N', 'NULL') else v


def to_utc(tanggal_str):
    """Parse datetime string WIB dan konversi ke UTC (kurangi 7 jam)."""
    s = clean(tanggal_str)
    if not s:
        return False
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d'):
        try:
            return datetime.strptime(s, fmt) - WIB_OFFSET
        except ValueError:
            continue
    return False


print("=" * 60)
print("MIGRASI KASUS MENONJOL")
print("=" * 60)

# --- 1. Build semua lookup map ---
def build_name_map(model):
    return {r.name.upper().strip(): r.id
            for r in env[model].search([]) if r.name}

kategori_map  = build_name_map('petadigi.kategori_kamtibmas')
modus_map     = build_name_map('petadigi.modus_operandi')
jenis_tkp_map = build_name_map('petadigi.jenis_tkp')
polres_map    = build_name_map('petadigi.polres')
subdit_map    = build_name_map('petadigi.subdit')
sumber_map    = build_name_map('petadigi.sumber_dokumen')

# Polsek: (polres_id, nama_upper) → polsek_id
polsek_map = {}
for ps in env['petadigi.polsek'].search([]):
    key = (ps.polres_id.id, ps.name.upper().strip())
    polsek_map[key] = ps.id

# Desa: code → record (untuk ambil kecamatan + kabupaten sekaligus)
desa_map = {r.code: r for r in env['petadigi.desa'].search([])}

print(f"  Kategori  : {len(kategori_map)}")
print(f"  Modus     : {len(modus_map)}")
print(f"  Jenis TKP : {len(jenis_tkp_map)}")
print(f"  Polres    : {len(polres_map)}")
print(f"  Polsek    : {len(polsek_map)}")
print(f"  Subdit    : {len(subdit_map)}")
print(f"  Sumber    : {len(sumber_map)}")
print(f"  Desa      : {len(desa_map)}")

# --- 2. Import ---
created  = 0
skipped  = 0
warnings = {
    'polres': set(), 'polsek': set(), 'kategori': set(),
    'modus': set(), 'jenis_tkp': set(), 'desa_kode': set(),
    'subdit': set(), 'sumber': set(),
}

print("\nMemulai import...")

with open(CSV_PATH, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        if not row or len(row) < 16:
            continue

        old_id         = clean(row[0])
        nomor_lp       = clean(row[1])
        tanggal        = clean(row[2])
        tersangka      = clean(row[3])
        permasalahan   = clean(row[4])
        penanganan     = clean(row[5])
        tindak_lanjut  = clean(row[6])
        state          = clean(row[7]) or 'PROSES'
        tujuan         = clean(row[8])
        kategori_nama  = clean(row[9])
        modus_nama     = clean(row[10])
        jenis_tkp_nama = clean(row[11])
        polres_nama    = clean(row[12])
        polsek_nama    = clean(row[13])
        desa_kode      = clean(row[14])
        sumber_nama    = clean(row[15])

        # no_lp: required, placeholder '-' jika kosong/tidak valid
        no_lp = nomor_lp if nomor_lp and nomor_lp.lower() not in {
            '', '-', 'nihil', 'jika ada'} else '-'

        # Datetime WIB → UTC
        tanggal_utc = to_utc(tanggal)

        # Resolve relasi
        polres_id    = polres_map.get(polres_nama.upper()) if polres_nama else None
        polsek_id    = polsek_map.get((polres_id, polsek_nama.upper())) if (polsek_nama and polres_id) else None
        kategori_id  = kategori_map.get(kategori_nama.upper()) if kategori_nama else None
        modus_id     = modus_map.get(modus_nama.upper()) if modus_nama else None
        jenis_tkp_id = jenis_tkp_map.get(jenis_tkp_nama.upper()) if jenis_tkp_nama else None
        subdit_id    = subdit_map.get(tujuan.upper()) if tujuan else None
        sumber_id    = sumber_map.get(sumber_nama.upper()) if sumber_nama else None

        # Desa via kode — kecamatan & kabupaten otomatis dari relasi desa
        desa_rec      = desa_map.get(desa_kode) if desa_kode else None
        desa_id       = desa_rec.id if desa_rec else None
        kecamatan_id  = desa_rec.kecamatan_id.id if desa_rec else None
        kabupaten_id  = desa_rec.kecamatan_id.kabupaten_id.id if desa_rec else None

        # Kumpulkan warning (unik per nilai)
        if polres_nama and not polres_id:
            warnings['polres'].add(polres_nama)
        if polsek_nama and not polsek_id:
            warnings['polsek'].add(polsek_nama)
        if kategori_nama and not kategori_id:
            warnings['kategori'].add(kategori_nama)
        if modus_nama and not modus_id:
            warnings['modus'].add(modus_nama)
        if jenis_tkp_nama and not jenis_tkp_id:
            warnings['jenis_tkp'].add(jenis_tkp_nama)
        if desa_kode and not desa_id:
            warnings['desa_kode'].add(desa_kode)
        if tujuan and not subdit_id:
            warnings['subdit'].add(tujuan)
        if sumber_nama and not sumber_id:
            warnings['sumber'].add(sumber_nama)

        # Cek duplikat hanya untuk LP yang riil (bukan placeholder)
        if no_lp != '-':
            existing = env['petadigi.kasus_menonjol'].search(
                [('no_lp', '=', no_lp)], limit=1)
            if existing:
                skipped += 1
                print(f"  [SKIP dup] id={old_id}: {no_lp[:60]}")
                continue

        vals = {'no_lp': no_lp, 'state': state}
        if tanggal_utc:       vals['tanggal_kejadian']   = tanggal_utc
        if tersangka:         vals['tersangka']           = tersangka
        if permasalahan:      vals['permasalahan']        = permasalahan
        if penanganan:        vals['penanganan']          = penanganan
        if tindak_lanjut:     vals['tindak_lanjut']       = tindak_lanjut
        if polres_id:         vals['polres_id']           = polres_id
        if polsek_id:         vals['polsek_id']           = polsek_id
        if kabupaten_id:      vals['kabupaten_id']        = kabupaten_id
        if kecamatan_id:      vals['kecamatan_id']        = kecamatan_id
        if desa_id:           vals['desa_id']             = desa_id
        if kategori_id:       vals['kategori_id']         = kategori_id
        if modus_id:          vals['modus_operandi_id']   = modus_id
        if jenis_tkp_id:      vals['jenis_tkp_id']        = jenis_tkp_id
        if subdit_id:         vals['subdit_id']           = subdit_id
        if sumber_id:         vals['sumber_dokumen_id']   = sumber_id

        env['petadigi.kasus_menonjol'].create(vals)
        created += 1
        lp_short = no_lp[:55] + '...' if len(no_lp) > 55 else no_lp
        print(f"  [OK] id={old_id}: {lp_short}")

env.cr.commit()

# --- 3. Laporan ---
print("\n" + "=" * 60)
print("HASIL MIGRASI")
print("=" * 60)
print(f"  Berhasil dibuat  : {created}")
print(f"  Duplikat dilewati: {skipped}")

for key, nilai in warnings.items():
    if nilai:
        label = {
            'polres': 'Polres', 'polsek': 'Polsek',
            'kategori': 'Kategori Kamtibmas', 'modus': 'Modus Operandi',
            'jenis_tkp': 'Jenis TKP', 'desa_kode': 'Kode Desa',
            'subdit': 'Subdit/Tujuan', 'sumber': 'Sumber Dokumen',
        }.get(key, key)
        print(f"\n  [PERHATIAN] {label} tidak cocok di Odoo ({len(nilai)}):")
        for n in sorted(nilai):
            print(f"    → '{n}'")

print("\nSelesai.")
