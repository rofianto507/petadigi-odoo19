"""
Migration: giats (MySQL) → petadigi.hasil_giat (Odoo)

CSV columns (0-indexed):
 0  id                MySQL id
 1  nrp               → nrp
 2  nama              → nama_petugas
 3  pangkat           → pangkat_petugas
 4  tanggal           → tanggal (WIB→UTC)
 5  kegiatan          → kegiatan
 6  latitude          varchar → float
 7  longitude         varchar → float
 8  foto              filename → download + base64
 9  polres_nama       → polres_id
10  polsek_nama       → polsek_id
11  jenis_laporan_nama → jenis_laporan_id

Foto URL: https://petadigi.polisibaik.id/public/upload/giat/<filename>

Run di Odoo shell:
  exec(open('/home/rofi/petadigi-migration/migrate_giat.py').read())
"""

import csv
import base64
import urllib.request
from datetime import datetime, timedelta

CSV_PATH   = '/home/rofi/petadigi-migration/giat.csv'
BASE_FOTO  = 'https://petadigi.polisibaik.id/public/upload/giat/'
BATCH_SIZE = 50   # kecil karena ada download foto


def _v(s):
    if s is None or s == r'\N' or s.strip() == '':
        return None
    return s.strip()


def _dt(s):
    val = _v(s)
    if not val:
        return None
    try:
        return datetime.strptime(val, '%Y-%m-%d %H:%M:%S') - timedelta(hours=7)
    except ValueError:
        return None


def _foto(filename):
    """Download foto dari server lama, return (base64_bytes, filename) atau (False, False)."""
    if not filename:
        return False, False
    try:
        url = BASE_FOTO + filename
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
        if len(data) < 100:   # file kosong / placeholder
            return False, False
        return base64.b64encode(data), filename
    except Exception:
        return False, False


# ── Build lookup caches ────────────────────────────────────────────────
print("Building lookup caches...")

polres_cache = {r.name.upper(): r.id
                for r in env['petadigi.polres'].search([])}

polsek_cache = {(r.polres_id.id, r.name.upper()): r.id
                for r in env['petadigi.polsek'].search([])}

jenis_laporan_cache = {r.nama.upper(): r.id
                       for r in env['petadigi.jenis_laporan'].search([])}

print(f"  polres: {len(polres_cache)}, polsek: {len(polsek_cache)}, "
      f"jenis_laporan: {len(jenis_laporan_cache)}")

# ── Process CSV ────────────────────────────────────────────────────────
ok = skip_err = foto_fail = 0
batch = []


def _flush(batch):
    if not batch:
        return 0
    created = env['petadigi.hasil_giat'].create(batch)
    env.cr.commit()
    return len(created)


with open(CSV_PATH, encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)  # skip header
    for row in reader:
        try:
            # ── validasi field required ────────────────────────────────
            nama_petugas = _v(row[2])
            if not nama_petugas:
                skip_err += 1
                continue

            polres_nama = _v(row[9])
            polres_id   = polres_cache.get(polres_nama.upper()) if polres_nama else False
            if not polres_id:
                skip_err += 1
                print(f"  SKIP row {row[0]}: polres '{polres_nama}' tidak ditemukan")
                continue

            jl_nama        = _v(row[11])
            jenis_laporan_id = jenis_laporan_cache.get(jl_nama.upper()) if jl_nama else False
            if not jenis_laporan_id:
                skip_err += 1
                print(f"  SKIP row {row[0]}: jenis_laporan '{jl_nama}' tidak ditemukan")
                continue

            tanggal = _dt(row[4])
            if not tanggal:
                skip_err += 1
                continue

            # ── polsek ────────────────────────────────────────────────
            polsek_nama = _v(row[10])
            polsek_id   = False
            if polsek_nama and polres_id:
                polsek_id = polsek_cache.get((polres_id, polsek_nama.upper()), False)

            # ── koordinat ─────────────────────────────────────────────
            try:
                lat = float(row[6]) if _v(row[6]) else 0.0
                lng = float(row[7]) if _v(row[7]) else 0.0
            except ValueError:
                lat = lng = 0.0

            # ── foto ──────────────────────────────────────────────────
            foto_b64, foto_fname = _foto(_v(row[8]))
            if _v(row[8]) and not foto_b64:
                foto_fail += 1

            vals = {
                'jenis_laporan_id': jenis_laporan_id,
                'nrp':              _v(row[1]) or False,
                'nama_petugas':     nama_petugas,
                'pangkat_petugas':  _v(row[3]) or False,
                'polres_id':        polres_id,
                'polsek_id':        polsek_id,
                'tanggal':          tanggal,
                'kegiatan':         _v(row[5]) or False,
                'latitude':         lat,
                'longitude':        lng,
                'foto':             foto_b64 or False,
                'foto_filename':    foto_fname or False,
            }
            batch.append(vals)

            if len(batch) >= BATCH_SIZE:
                n = _flush(batch)
                ok += n
                batch = []
                print(f"  {ok} records imported...")

        except Exception as e:
            skip_err += 1
            print(f"  ERROR row {row[0]}: {e}")

if batch:
    ok += _flush(batch)

print(f"\n{'='*48}")
print(f"Selesai:")
print(f"  Berhasil diimport : {ok}")
print(f"  Skip (error)      : {skip_err}")
print(f"  Foto gagal unduh  : {foto_fail}")
print(f"{'='*48}")
