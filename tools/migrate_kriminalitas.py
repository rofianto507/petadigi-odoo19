"""
Migration: kriminals (MySQL) → petadigi.kriminalitas (Odoo)

CSV columns (0-indexed):
 0  id              MySQL id (ref only)
 1  no_lp
 2  lokasi          → tempat_kejadian
 3  penyebab        → apa_yang_terjadi
 4  keterangan      → uraian_singkat (combined with uraian)
 5  uraian          → uraian_singkat (combined with keterangan)
 6  penanggungjawab → penanggung_jawab
 7  state           → status_perkara (PROSES/SELESAI)
 8  sub_state       → sub_status_perkara_id (lookup by name+state)
 9  tujuan          → subdit_id (lookup by name)
10  pelapor
11  terlapor
12  korban
13  tindak_pidana
14  saksi
15  barang_bukti
16  latitude
17  longitude
18  tanggal         → tanggal_kejadian (WIB→UTC)
19  tanggal_laporan (WIB→UTC)
20  tanggal_selesai (WIB→UTC)
21  desa_kode       → desa_id / kecamatan_id / kabupaten_id
22  sub_kategori_nama → sub_kategori_id
23  kategori_nama   → kategori_id
24  polres_nama     → polres_id
25  polsek_nama     → polsek_id
26  jenis_tkp_nama  → jenis_tkp_id
27  sumber_nama     → sumber_dokumen_id

Run in Odoo shell:
  exec(open('/home/rofi/petadigi-migration/migrate_kriminalitas.py').read())
"""

import csv
from datetime import datetime, timedelta

CSV_PATH = '/home/rofi/petadigi-migration/kriminalitas.csv'
BATCH_SIZE = 200


def _v(s):
    """Return None for empty / MySQL NULL (\\N) values."""
    if s is None or s == r'\N' or s.strip() == '':
        return None
    return s.strip()


def _dt(s):
    """Parse WIB datetime string → UTC datetime object, or None."""
    val = _v(s)
    if not val:
        return None
    try:
        return datetime.strptime(val, '%Y-%m-%d %H:%M:%S') - timedelta(hours=7)
    except ValueError:
        return None


# ── Build lookup caches ────────────────────────────────────────────────
print("Building lookup caches...")

polres_cache = {r.name.upper(): r.id
                for r in env['petadigi.polres'].search([])}

polsek_cache = {(r.polres_id.id, r.name.upper()): r.id
                for r in env['petadigi.polsek'].search([])}

desa_cache = {r.code: r
              for r in env['petadigi.desa'].search([])}

kategori_cache = {r.name.upper(): r.id
                  for r in env['petadigi.kategori_kriminal'].search([])}

sub_kat_cache = {(r.kategori_kriminal_id.id, r.name.upper()): r.id
                 for r in env['petadigi.sub_kategori_kriminal'].search([])}

jenis_tkp_cache = {r.name.upper(): r.id
                   for r in env['petadigi.jenis_tkp'].search([])}

sumber_cache = {r.name.upper(): r.id
                for r in env['petadigi.sumber_dokumen'].search([])}

subdit_cache = {r.name.upper(): r.id
                for r in env['petadigi.subdit'].search([])}

sub_status_cache = {(r.status_perkara, r.name.upper()): r.id
                    for r in env['petadigi.sub_status_perkara'].search([])}

existing_nolp = set(env['petadigi.kriminalitas'].search([]).mapped('no_lp'))

print(f"  polres: {len(polres_cache)}, polsek: {len(polsek_cache)}, "
      f"desa: {len(desa_cache)}, existing no_lp: {len(existing_nolp)}")


# ── Process CSV ────────────────────────────────────────────────────────
ok = skip_dup = skip_err = auto_nolp = 0
batch = []


def _flush(batch):
    if not batch:
        return 0
    created = env['petadigi.kriminalitas'].create(batch)
    env.cr.commit()
    return len(created)


with open(CSV_PATH, encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)  # skip header row
    for row in reader:
        try:
            # ── no_lp ──────────────────────────────────────────────────
            no_lp = _v(row[1])
            if not no_lp:
                auto_nolp += 1
                no_lp = f'IMPORT-{row[0]}'

            if no_lp in existing_nolp:
                skip_dup += 1
                continue
            existing_nolp.add(no_lp)

            # ── wilayah ────────────────────────────────────────────────
            desa_kode = _v(row[21])
            desa_rec  = desa_cache.get(desa_kode) if desa_kode else None
            desa_id      = desa_rec.id if desa_rec else False
            kecamatan_id = desa_rec.kecamatan_id.id if desa_rec and desa_rec.kecamatan_id else False
            kabupaten_id = (desa_rec.kecamatan_id.kabupaten_id.id
                            if desa_rec and desa_rec.kecamatan_id else False)

            # ── kesatuan ───────────────────────────────────────────────
            polres_nama = _v(row[24])
            polsek_nama = _v(row[25])
            polres_id = polres_cache.get(polres_nama.upper()) if polres_nama else False
            polsek_id = False
            if polsek_nama and polres_id:
                polsek_id = polsek_cache.get((polres_id, polsek_nama.upper()), False)

            # ── kategori ───────────────────────────────────────────────
            kat_nama     = _v(row[23])
            sub_kat_nama = _v(row[22])
            kategori_id    = kategori_cache.get(kat_nama.upper()) if kat_nama else False
            sub_kategori_id = False
            if sub_kat_nama and kategori_id:
                sub_kategori_id = sub_kat_cache.get((kategori_id, sub_kat_nama.upper()), False)

            # ── relasi lain ────────────────────────────────────────────
            jtkp   = _v(row[26])
            sumber = _v(row[27])
            tujuan = _v(row[9])
            jenis_tkp_id      = jenis_tkp_cache.get(jtkp.upper()) if jtkp else False
            sumber_dokumen_id = sumber_cache.get(sumber.upper()) if sumber else False
            subdit_id         = subdit_cache.get(tujuan.upper()) if tujuan else False

            # ── status perkara ─────────────────────────────────────────
            state          = _v(row[7]) or 'PROSES'
            sub_state_nama = _v(row[8])
            sub_status_perkara_id = False
            if sub_state_nama:
                sub_status_perkara_id = sub_status_cache.get(
                    (state, sub_state_nama.upper()), False)

            # ── uraian singkat = keterangan + uraian ───────────────────
            keterangan = _v(row[4])
            uraian     = _v(row[5])
            parts = [p for p in [keterangan, uraian] if p]
            uraian_singkat = '\n'.join(parts) if parts else False

            # ── koordinat ──────────────────────────────────────────────
            try:
                lat = float(row[16]) if _v(row[16]) else 0.0
                lng = float(row[17]) if _v(row[17]) else 0.0
            except (ValueError, IndexError):
                lat = lng = 0.0

            vals = {
                'no_lp':                no_lp,
                'tempat_kejadian':      _v(row[2]) or False,
                'apa_yang_terjadi':     _v(row[3]) or False,
                'uraian_singkat':       uraian_singkat,
                'penanggung_jawab':     _v(row[6]) or False,
                'status_perkara':       state,
                'sub_status_perkara_id': sub_status_perkara_id,
                'subdit_id':            subdit_id,
                'pelapor':              _v(row[10]) or False,
                'terlapor':             _v(row[11]) or False,
                'korban':               _v(row[12]) or False,
                'tindak_pidana':        _v(row[13]) or False,
                'saksi':               _v(row[14]) or False,
                'barang_bukti':         _v(row[15]) or False,
                'latitude':             lat,
                'longitude':            lng,
                'tanggal_kejadian':     _dt(row[18]),
                'tanggal_laporan':      _dt(row[19]),
                'tanggal_selesai':      _dt(row[20]) if state == 'SELESAI' else False,
                'desa_id':              desa_id,
                'kecamatan_id':         kecamatan_id,
                'kabupaten_id':         kabupaten_id,
                'polres_id':            polres_id,
                'polsek_id':            polsek_id,
                'kategori_id':          kategori_id,
                'sub_kategori_id':      sub_kategori_id,
                'jenis_tkp_id':         jenis_tkp_id,
                'sumber_dokumen_id':    sumber_dokumen_id,
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

# flush remaining batch
if batch:
    ok += _flush(batch)

print(f"\n{'='*50}")
print(f"Import selesai:")
print(f"  Berhasil diimport : {ok}")
print(f"  Skip (duplikat)   : {skip_dup}")
print(f"  Skip (error)      : {skip_err}")
print(f"  Auto no_lp        : {auto_nolp}")
print(f"{'='*50}")
