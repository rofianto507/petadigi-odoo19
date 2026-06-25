# PetaDigi — Project Context Brief

> **Tujuan dokumen ini**: Briefing lengkap untuk sesi baru Claude agar dapat melanjutkan development tanpa kehilangan konteks. Module ini dibuat khusus kompatibel dengan **Odoo 19**.

---

## 1. Identitas Proyek

| Field | Value |
|---|---|
| Nama Module | PetaDigi |
| Versi | 19.0.2.0.0 |
| Platform | Odoo 19 |
| Author | Cv Sel Studio |
| Path | `c:\Program Files\Odoo 19.0.20251203\server\odoo\addons\petadigi\` |
| Dependencies | `base`, `web`, `mail` |
| Tujuan | Sistem manajemen data kepolisian berbasis peta interaktif + Cooling System + Sumur Minyak |

---

## 2. Gambaran Sistem

PetaDigi adalah modul Odoo yang menggabungkan:
- **Manajemen data kepolisian** (CRUD, tracking, chatter) untuk 4 entitas utama
- **Peta interaktif berbasis Leaflet.js** dengan choropleth GeoJSON wilayah Indonesia
- **Import otomatis dokumen LP** (Laporan Polisi tipe A dan B dari file `.docx`)
- **Dashboard Maps modular** dengan 6 mode peta + KPI cards + grafik ECharts per mode
- **Drill-down interaktif**: Kabupaten → Kecamatan → Desa/Kelurahan
- **Cooling System**: Monitoring kegiatan lapangan polisi via form publik (QR code / link) + dashboard monitoring
- **Sumur Minyak**: Pendataan sumur minyak masyarakat via form publik lapangan + dashboard peta
- **Strong Point Mobile**: SPA mobile-first untuk pencatatan strong point lapangan polisi — auth session, CRUD data, upload foto, manajemen personel, KPI cards, weekly chart ECharts, avatar user, PWA installable; akses `/petadigi`
- **Patroli**: model backend CRUD patroli wilayah (code PTL-xxxxx, polres/polsek, wilayah, tanggal, state) + model personel patroli; menu di bawah Strong Point

Pengguna utama: **Kepolisian Resort (Polres)** dan **Kepolisian Sektor (Polsek)** di Indonesia.

---

## 3. Struktur Folder

```
petadigi/
├── __manifest__.py
├── __init__.py
├── models/                    # 29 model data
│   ├── kategori_sumur_minyak.py  # State/token/URL/QR (upgrade dari model sederhana)
│   ├── sumur_minyak.py
│   ├── patroli.py                # Model patroli wilayah (PTL00001)
│   ├── personel_patroli.py       # Personel terkait patroli (One2many)
│   └── ...
├── views/
│   ├── menu_restrictions.xml  # Batasi menu "Apps" hanya group_system
│   ├── kategori_sumur_minyak_views.xml
│   ├── sumur_minyak_views.xml
│   ├── giat_form_template.xml
│   ├── sumur_form_template.xml  # Template publik input sumur lapangan
│   ├── patroli_views.xml        # List/form/search/graph/pivot/calendar + action
│   └── ...                    # 32+ file XML views
├── controllers/
│   ├── __init__.py
│   ├── giat_public.py         # Public form controller Cooling System
│   ├── sumur_public.py        # Public form controller Sumur Minyak
│   └── strong_point_public.py # Mobile SPA controller Strong Point (/petadigi/*)
├── wizard/
│   ├── import_lp_wizard.py
│   ├── tindak_lanjut_wizard.py
│   └── ...
├── utils/
│   ├── parser_lp_a.py
│   └── parser_lp_b.py
├── security/
│   └── ir.model.access.csv
└── static/
    ├── lib/
    │   ├── leaflet/
    │   ├── leaflet-markercluster/
    │   ├── flatpickr/
    │   └── echart/
    └── src/
        ├── js/                         # 20 file JavaScript modular
        ├── css/
        │   ├── backend.css             # Widget foto + sembunyikan user menu
        │   ├── login.css
        │   ├── giat_form.css           # Tema biru (Cooling System)
        │   ├── sumur_form.css          # Tema amber/oranye (Sumur Minyak)
        │   ├── strong_form.css         # Tema ungu/purple (Strong Point Mobile)
        │   └── ...
        └── xml/
            ├── dashboard_map.xml
            ├── image_popup_widget.xml
            └── ...
```

---

## 4. Model Data

### Model Hierarki Geografis
```
petadigi.polres          → Kepolisian Resort
petadigi.polsek          → Kepolisian Sektor
petadigi.kabupaten       → Kabupaten/Kota (menyimpan GeoJSON geometry)
petadigi.kecamatan       → Kecamatan (menyimpan GeoJSON geometry, FK: kabupaten_id)
petadigi.desa            → Desa/Kelurahan (menyimpan GeoJSON geometry, FK: kecamatan_id)
```

### Model Utama Aplikasi — Peta

**`petadigi.kriminalitas`** — Kasus kriminalitas
- `no_lp`, `jenis_lp` (A/B), `tanggal_kejadian`, `tanggal_laporan`, `tanggal_selesai`
- `latitude`, `longitude`, `tempat_kejadian`
- `pelapor`, `terlapor`, `korban`, `saksi`, `penanggung_jawab`
- `polres_id`, `polsek_id`, `subdit_id`
- `kabupaten_id`, `kecamatan_id`, `desa_id`
- `kategori_id`, `sub_kategori_id`, `jenis_tkp_id`, `modus_operandi_id`
- `status_perkara`: `PROSES` / `SELESAI`
- `sumber_dokumen_id` → `petadigi.sumber_dokumen` (field: `tahun`)

**`petadigi.kasus_menonjol`** — Kasus menonjol / KAM
- `code` (auto-sequence, readonly), `no_lp`, `tanggal_kejadian`, `latitude`, `longitude`
- `kabupaten_id`, `kecamatan_id`, `desa_id`
- `polres_id`, `polsek_id`, `subdit_id`, `sumber_dokumen_id`
- `kategori_id`, `modus_operandi_id`, `jenis_tkp_id`
- `tersangka`, `permasalahan`, `penanganan`
- `state`: `PROSES` / `SELESAI`
- `tindak_lanjut_ids` → One2many ke `petadigi.tindak_lanjut`
- `has_tindak_lanjut` (Boolean, computed stored)
- Method: `action_set_selesai`, `action_set_proses`, `action_open_tindak_lanjut_wizard`

**`petadigi.tindak_lanjut`** — Tindak Lanjut Kasus Menonjol
- `kasus_menonjol_id` (Many2one, required, ondelete='cascade')
- `tanggal` (Datetime, required, default now), `_order = 'tanggal desc'`
- `tindakan` (Text, required)
- `attachment` (Binary, attachment=True), `attachment_filename` (Char)
- **Auto-log chatter** di `kasus_menonjol_id`:
  - `create`: log "Tindak Lanjut Ditambahkan" (internal note)
  - `unlink`: kumpulkan data dulu sebelum `super().unlink()`, lalu log "Tindak Lanjut Dihapus"
- Import wajib: `from markupsafe import Markup` dan `from odoo.tools import format_datetime`

**`petadigi.bencana`** — Data bencana
- `code`, `nama_bencana`, `tanggal_kejadian`, `latitude`, `longitude`
- `kabupaten_id`, `kecamatan_id`, `desa_id`
- `kategori_id`, `penyebab`, `tindak_lanjut`, `keterangan`
- `state`: `AKTIF` / `NON AKTIF`
- `sumber_dokumen_id`

**`petadigi.lalu_lintas`** — Data lalu lintas
- `code`, `nama_lokasi`, `penanggung_jawab`, `tanggal_kejadian`, `latitude`, `longitude`
- `kabupaten_id`, `kecamatan_id`, `desa_id`
- `kategori_id`, `jenis_jalan_id`, `penyebab`, `tindak_lanjut`, `keterangan`
- `state`: `PROSES` / `SELESAI`
- `sumber_dokumen_id`

**`petadigi.lokasi_penting`** — Lokasi penting
- `code`, `nama_lokasi`, `alamat_lengkap`, `hp_kontak`, `keterangan`
- `kabupaten_id`, `kecamatan_id`, `desa_id`
- `kategori_id`, `latitude`, `longitude`
- `state`: `AKTIF` / `NON AKTIF`
- **TIDAK punya `tanggal_kejadian` dan `sumber_dokumen_id`**

### Model Sumur Minyak

**`petadigi.sumur_minyak`** — Data sumur minyak masyarakat
- `code` (auto-sequence, readonly, default='New'), `name` (Nama Sumur, required)
- `kategori_id` → `petadigi.kategori_sumur_minyak`
- `kabupaten_id`, `kecamatan_id`, `desa_id`
- `latitude`, `longitude` (Float, digits 10,6)
- `foto` (Binary, attachment=True), `foto_filename` (Char)
- `sumber_dokumen_id` (domain: `tipe_sumber = 'SUMUR MINYAK'`)
- `jumlah_minyak` (Float, digits 10,2, help: "Jumlah minyak produksi/Minyak masuk")
- `state`: `AKTIF` / `TIDAK AKTIF`
- `is_data_lengkap` (Boolean, computed stored — True jika lat+lon+foto ada)
- Methods: `action_set_aktif`, `action_set_tidak_aktif`
- **Field yang DIHAPUS** (tidak ada lagi): `pemilik_sumur`, `pemilik_lahan`, `penampung`, `sumber_info_1–5`, `deviasi_titik`

**`petadigi.kategori_sumur_minyak`** — Kategori Sumur Minyak (dengan public URL)
- `name` (required), `keterangan`
- `state`: `draft` / `aktif` / `non_aktif`
- `public_token` (Char, readonly, copy=False) — auto-generate `secrets.token_urlsafe(32)` saat create
- `public_url` (Char, computed) — `{base_url}/sumur/{token}`
- `qr_code_image` (Binary, computed) — QR code PNG warna amber `#B45309`
- `sumur_ids` (One2many → `petadigi.sumur_minyak`)
- `jumlah_sumur` (Integer, computed via `read_group`)
- Methods: `action_set_aktif`, `action_set_non_aktif`, `action_set_draft`, `action_regenerate_token`, `action_share_whatsapp`, `action_view_sumur`
- Form view: stat button "Total Sumur", panel URL+QR (background oranye, tampil saat aktif), notebook tab data sumur

### Model Cooling System

**`petadigi.jenis_laporan`** — Jenis Laporan Cooling System
- `nama`, `keterangan`
- `state`: `draft` / `aktif` / `non_aktif`
- `public_token` (Char, readonly, auto-generate via `secrets.token_urlsafe(32)`)
- `public_url` (Char, computed — `{base_url}/giat/{token}`)
- `qr_code_image` (Binary, computed — QR code PNG biru)
- `jumlah_giat` (Integer, computed)
- Methods: `action_set_aktif`, `action_set_non_aktif`, `action_set_draft`, `action_regenerate_token`, `action_share_whatsapp`, `action_view_hasil_giat`

**`petadigi.hasil_giat`** — Hasil Kegiatan Lapangan
- `code` (auto-sequence, readonly)
- `jenis_laporan_id` → `petadigi.jenis_laporan`
- `nrp`, `nama_petugas` (required), `pangkat_petugas`
- `polres_id` (required) → `petadigi.polres`
- `polsek_id` (domain: `polres_id`-filtered) → `petadigi.polsek`
- `tanggal` (Datetime, UTC di database)
- `kegiatan` (Text)
- `foto` (Binary, `attachment=True`), `foto_filename` (Char)
- `latitude`, `longitude` (Float, digits 10,6)

### Model Wizard
```
petadigi.tindak_lanjut.wizard  → Tambah tindak lanjut KAM
petadigi.import.lp.wizard      → Import dokumen LP A/B
```

### Model Konfigurasi/Lookup
```
petadigi.kategori_kriminal        petadigi.kategori_bencana
petadigi.sub_kategori_kriminal    petadigi.kategori_kamtibmas
petadigi.kategori_lalu_lintas     petadigi.kategori_lokasi
petadigi.jenis_jalan              petadigi.jenis_tkp
petadigi.modus_operandi           petadigi.sumber_dokumen
petadigi.subdit                   petadigi.sub_status_perkara
```

---

## 5. Sumur Minyak — Arsitektur

### Public Form (`/sumur/<token>`)
- Route: `GET /sumur/<string:token>` — render template `petadigi.template_sumur_form`
- Route: `POST /sumur/api/kecamatan` (JSON-RPC) — return kecamatan list by kabupaten_id (token-validated)
- Route: `POST /sumur/api/desa` (JSON-RPC) — return desa list by kecamatan_id (token-validated)
- Route: `POST /sumur/api/submit` (JSON-RPC) — create `petadigi.sumur_minyak` record langsung
- Template: `views/sumur_form_template.xml` — standalone HTML (tidak pakai Odoo master layout)
- JS: `static/src/js/sumur_form.js` — OWL Component standalone
- CSS: `static/src/css/sumur_form.css` — tema amber `#B45309` (minyak/petroleum)
- Controller: `controllers/sumur_public.py` — `SumurPublicController`

**Form fields**:
- Nama Sumur (required)
- Jumlah Minyak (number, opsional)
- Kabupaten/Kota (required, dropdown dari `petadigi.kabupaten`)
- Kecamatan (opsional, async load by kabupaten)
- Desa/Kelurahan (opsional, async load by kecamatan)
- GPS + Leaflet map (marker draggable, wajib sebelum submit)
- Foto (opsional, compressed)

**Submit**: create `petadigi.sumur_minyak` dengan `kategori_id` dari token, `state='AKTIF'`

**Fitur identik dengan giat_form.js**:
- Kompresi foto Canvas (max 960px, quality 0.75→0.60→0.45, target <500k base64)
- GPS auto-request on load, enforced sebelum submit
- reCAPTCHA v3 action `submit_sumur`
- Error handling: AbortError, HTTP 413, network failure
- Reset form setelah submit sukses

### Dashboard Sumur Minyak (Mode `sumur`)
- Layer: `dashboard_layer_sumur_minyak.js`
- Charts: `dashboard_charts_sumur_minyak.js`
- Mode dipilih dari toggle peta → `currentMode = 'sumur'`

**Filter khusus sumur** — `filterKategoriSumur` (ref terpisah dari `filterKategori`):
- `filterKategori` disembunyikan saat mode sumur (`showKategori = !['umum','sumur'].includes(mode)`)
- `filterKategoriSumur` hanya tampil di mode sumur, populated via `_populateKategoriSumur()` dari `petadigi.kategori_sumur_minyak`
- `_getActiveFilters(ctx)` di `dashboard_layer_sumur_minyak.js`:
  ```js
  { kabupatenId, stateValue, kategoriId: filterKategoriSumur?.el?.value }
  ```

**Charts**:
- Bar chart: total sumur per kabupaten (semua kabupaten muncul termasuk yang 0, sort desc)
- Donut chart: distribusi per kategori (legend horizontal-bottom, center `['50%','46%']`)
- Judul donut: "Kategori Sumur Minyak"

**Tabel data** (pagination 20/halaman):
- Kolom: #, Kode, Nama Sumur, Desa, Kecamatan, Kabupaten, Kategori, Jml. Minyak Produksi/Masuk, Status
- Format `jumlah_minyak`: `toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`
- Klik baris → buka form sumur minyak

**Marker popup**: Nama, Kode, Kabupaten, Kecamatan, Desa, Kategori, Jml. Minyak, Status, Foto

---

## 6. Cooling System — Arsitektur

### Public Form (`/giat/<token>`)
- Route: `GET /giat/<string:token>` → render `petadigi.template_giat_form`
- Route: `POST /giat/api/polsek` (JSON-RPC) — polsek list by polres_id (token-validated)
- Route: `POST /giat/api/submit` (JSON-RPC) — create `hasil_giat` record
- JS: `static/src/js/giat_form.js` — OWL Component standalone
- CSS: `static/src/css/giat_form.css` — tema biru `#1565c0`

**Form fields**: NRP, Nama Petugas (req), Pangkat, Polres (req), Polsek, Tanggal, Deskripsi Kegiatan (req), GPS, Foto
- Cache: `localStorage.petadigi_giat_petugas` untuk NRP/nama/pangkat
- WIB→UTC: `_parse_tanggal` kurangi 7 jam

### Dashboard Monitoring Giat
- OWL component: `MonitoringGiatDashboard` di `dashboard_monitoring_giat.js`
- Register: `registry.category("actions").add("petadigi.MonitoringGiatDashboard", ...)`
- **KPI Cards**: total giat, petugas unik, polres teraktif, hari teraktif
- **Format angka**: `toLocaleString('id-ID')`
- **Charts**: Bar per polres, Line tren harian, Donut per jenis laporan
  - Donut legend: `orient: "horizontal", bottom: 0, type: "scroll"`
- **Data Tables**: Ringkasan per Polres + Polsek yang Mengirim
- **Map Card**: Leaflet + MarkerCluster, popup foto lazy-load

---

## 7. Strong Point Mobile Web Client — Arsitektur

### URL & Entry Point
- **App**: `GET /petadigi` → redirect ke `/petadigi/form` (jika auth) atau `/petadigi/login`
- **Login**: `GET/POST /petadigi/login` — session auth Odoo + cek `user.polres_id`
- **App Shell**: `GET /petadigi/form` — render `petadigi.template_strong_form` (auth wajib)
- **Logout**: `GET /petadigi/logout`

### Template
- File: `views/strong_point_login_template.xml`
- Template login: `petadigi.template_strong_login`
- Template app: `petadigi.template_strong_form`
- **Standalone HTML** (tidak pakai Odoo master layout) — load sendiri CSS/JS/Leaflet
- Cache busting: `?v=YYYYMMDD` di URL CSS dan JS — **harus di-bump setiap ada perubahan file**

### Controller (`controllers/strong_point_public.py`)
- Class: `StrongPointPublicController`
- Auth helper: `_auth_check()` — cek `user.polres_id`, return None jika public/tanpa polres
- Access check: `_check_record_access(user, record_id)` — validasi ownership polres

**Timezone helpers** (module-level di controller):
```python
_WIB_OFFSET = timedelta(hours=7)

def _today_utc_range_wib():
    now_wib   = datetime.utcnow() + _WIB_OFFSET
    today_wib = now_wib.date()
    wib_start = datetime(today_wib.year, today_wib.month, today_wib.day, 0, 0, 0)
    wib_end   = datetime(today_wib.year, today_wib.month, today_wib.day, 23, 59, 59)
    utc_start = (wib_start - _WIB_OFFSET).strftime('%Y-%m-%d %H:%M:%S')
    utc_end   = (wib_end   - _WIB_OFFSET).strftime('%Y-%m-%d %H:%M:%S')
    return utc_start, utc_end

def _wib_to_utc(dt_str):
    # datetime-local HTML input returns WIB → must subtract 7h before Odoo write
    dt = datetime.strptime(dt_str, '%Y-%m-%d %H:%M:%S')
    return (dt - _WIB_OFFSET).strftime('%Y-%m-%d %H:%M:%S')
```
> Odoo menyimpan Datetime dalam UTC. Semua input dari mobile (`datetime-local`) adalah WIB, jadi perlu `_wib_to_utc()` sebelum write. Filter "hari ini" harus pakai `_today_utc_range_wib()` agar benar saat tengah malam WIB.

**API endpoints** (semua `type='jsonrpc'`):
| Endpoint | Fungsi |
|---|---|
| `POST /petadigi/api/kpi` | KPI: `total`, `personel`, `today`, `personel_today` |
| `POST /petadigi/api/lokasi` | List lokasi SP aktif (filtered by polres/polsek) |
| `POST /petadigi/api/kecamatan` | Cascading by `kabupaten_id` |
| `POST /petadigi/api/desa` | Cascading by `kecamatan_id` |
| `POST /petadigi/api/list` | List SP records — paginated (offset/limit=20), terima `filter='today'` untuk filter WIB hari ini |
| `POST /petadigi/api/submit` | Create SP record baru, `tanggal_mulai` di-`_wib_to_utc()` |
| `POST /petadigi/api/record` | Detail 1 record: info + personel + `foto_src` (base64 data URL) |
| `POST /petadigi/api/personel_add` | Tambah personel ke SP |
| `POST /petadigi/api/personel_remove` | Hapus personel |
| `POST /petadigi/api/upload_foto` | Upload foto base64 → field `foto` (Binary attachment) |
| `POST /petadigi/api/set_selesai` | Set state=SELESAI + `tanggal_selesai` (`_wib_to_utc()`) |
| `POST /petadigi/api/weekly` | Last 7 days SP count (WIB buckets) — `{days: [{label, date, count}]}` |
| `GET /petadigi/foto/<id>` | Serve foto binary langsung (HTTP, bukan JSON) |
| `GET /petadigi/manifest.json` | PWA manifest (Content-Type: application/manifest+json) |
| `GET /petadigi/sw.js` | PWA service worker (cache static assets, network pass-through API) |

**Foto display (KRITIKAL)**:
```python
# api_record — build foto_src sebagai data URL
att = request.env['ir.attachment'].sudo().search([
    ('res_model', '=', 'petadigi.strong_point'),
    ('res_id',    '=', rec.id),
    ('res_field', '=', 'foto'),
], limit=1)
if att and att.datas:
    datas = att.datas
    if isinstance(datas, bytes):
        datas = datas.decode('ascii')
    datas = datas.replace('\n', '').replace('\r', '').strip()  # strip MIME line breaks!
    mime = att.mimetype or 'image/jpeg'
    if not mime.startswith('image/'):
        mime = 'image/jpeg'
    foto_src = 'data:{};base64,{}'.format(mime, datas)
```
> **PENTING**: Odoo menyimpan base64 dengan MIME line-break tiap 76 karakter. Wajib strip `\n\r` sebelum build data URL, jika tidak gambar tidak tampil.

### Model Data Strong Point

**`petadigi.strong_point`** — data strong point lapangan
- `code` (auto-sequence, readonly)
- `state`: `PROSES` / `SELESAI`
- `polres_id`, `polsek_id`
- `lokasi_id` → `petadigi.lokasi_strong_point`, `lokasi_nama` (related/computed)
- `kabupaten_id`, `kecamatan_id`, `desa_id`
- `latitude`, `longitude` (Float 10,6)
- `tanggal_mulai`, `tanggal_selesai` (Datetime)
- `keterangan` (Text)
- `foto` (Binary, `attachment=True`), `foto_filename` (Char)
- `personel_ids` (One2many → `petadigi.personel`)
- `personel_count` (Integer, computed)

**`petadigi.lokasi_strong_point`** — master lokasi strong point
- `nama`, `code`
- `polres_id`, `polsek_id`
- `lat`, `lng` (koordinat GPS)
- `state`: `aktif` / `non_aktif`

**`petadigi.personel`** — data personel yang ditugaskan
- `strong_point_id` (Many2one, ondelete='cascade')
- `nama` (Char, UPPERCASE), `pangkat` (Char, UPPERCASE)
- `nama_lengkap` (Char, computed: `"{pangkat} {nama}"` atau hanya `nama`)

### Model Patroli

**`petadigi.patroli`** — data patroli wilayah
- `code` (auto-sequence readonly, prefix `PTL`, padding 5 → PTL00001)
- `polres_id` (required), `polsek_id` (opsional, domain filtered)
- `kabupaten_id`, `kecamatan_id`, `desa_id` (cascading domain)
- `tanggal_mulai` (Datetime, required, default now), `tanggal_selesai` (Datetime)
- `personel_ids` (One2many → `petadigi.personel_patroli`), `personel_count` (Integer, computed stored)
- `keterangan` (Text), `state`: `PROSES` / `SELESAI`
- Methods: `action_set_selesai`, `action_set_proses`, `action_view_personel`, `default_get` (pre-fill dari user login)
- Sequence code: `petadigi.patroli.sequence`

**`petadigi.personel_patroli`** — personel terkait patroli
- `patroli_id` (Many2one, required, ondelete='cascade')
- `nama` (Char, required), `pangkat` (Char)
- `nama_lengkap` (Char, computed stored: `"{pangkat} {nama}"`)

**View Patroli** (`views/patroli_views.xml`):
- List: code, tanggal, polres/polsek, kabupaten/kecamatan/desa, state badge
- Form: smart button Personel, header state (PROSES→SELESAI), group Wilayah (role-aware readonly) + Pelaksanaan, notebook tab Personel editable inline + tab Keterangan
- Search: filter status, Hari Ini/Minggu/Bulan/Tahun, groupby polres/polsek/kabupaten/status/bulan
- Graph, Pivot, Calendar (date_start=`tanggal_mulai`, color=`state`)

**Menu**: Maps → Patroli (di bawah Strong Point, sequence 5)

### JS SPA (`static/src/js/strong_form.js`)
- **Pattern**: IIFE `(function() { 'use strict'; ... })()`  — bukan OWL
- **rpc()**: `fetch` async helper dengan JSON-RPC 2.0
- **State object** `_sp`:
  ```js
  var _sp = {
      rendered: false, userPos: null, lokasiList: [], selected: null,
      map: null, marker: null,
      listOffset: 0, listPerPage: 20, listLoading: false,
      listDone: false, listObserver: null,  // infinite scroll pagination
      detailId: null,
      listFilter: null,  // 'today' atau null (diset saat klik KPI card)
  };
  ```

**Tab navigasi**: Beranda (KPI cards + weekly chart + greeting avatar), Strong Point, Patroli (coming soon), Profil

**Alur Strong Point tab**:
1. `_showRecordList()` — load 20 pertama, infinite scroll (IntersectionObserver sentinel)
2. FAB (+) → `_openLokasiPicker()` — list lokasi sorted by GPS distance (Haversine)
3. Pilih lokasi → `_openFormView()` — isi data SP baru, submit
4. Submit sukses → `_openDetail(recordId)` — detail view
5. Klik record di list → `_openDetail(recordId)`

**Sub-page navigation**:
- `_hideAppbar()` / `_showAppbar()` — toggle class `sp-subpage` pada `#sp-app`
- Sub-page `.sp-subpage`: sembunyikan `.sp-appbar` DAN `.sp-bottom-nav`
- FAB: `_showFab()` / `_hideFab()` — hanya tampil di record list
- Back button → `_showRecordList()` (reload data)

**Foto di Detail View**:
```js
// Insert <img> via createElement (BUKAN lewat innerHTML — base64 besar bisa corrupt)
if (data.has_foto && data.foto_src) {
    var wrap = document.getElementById('sp-foto-wrap');
    if (wrap) {
        var img = document.createElement('img');
        img.className = 'sp-foto-img';
        img.src = data.foto_src;  // set SETELAH createElement
        wrap.insertBefore(img, wrap.firstChild);
    }
}
```

**Input personel**: nama + pangkat selalu `.toUpperCase()` sebelum submit + CSS `text-transform: uppercase` + `autocapitalize="characters"`

**KPI Cards (Beranda)**:
- 2 card side-by-side (2-column grid `.sp-kpi2-grid`)
- "SP Hari Ini" — `today` + `personel_today`; klik → masuk tab Strong Point dengan `listFilter = 'today'`
- "SP Keseluruhan" — `total` + `personel`; klik → masuk tab Strong Point tanpa filter
- Filter badge muncul di header record list ketika `listFilter === 'today'`, ada tombol ✕ untuk clear
- `_navigateToStrongWithFilter(filter)` — set `_sp.listFilter`, call `switchTab('strong')`, panggil `_showRecordList()` jika tab sudah rendered

**Weekly Bar Chart (Beranda)**:
- ECharts bar card full-width di bawah KPI cards
- Data dari `POST /petadigi/api/weekly` → `{days: [{label, date, count}]}`
- Warna: bar hari ini `#71639e` (ungu gelap), bar lainnya `#c4bedd` (ungu muda)
- ECharts diakses sebagai global script (`typeof echarts === 'undefined'` guard)

**User Avatar (Greeting)**:
- Avatar circular 44×44 di kanan nama user
- Initials fallback (huruf pertama nama) selalu dirender
- `<img>` di-overlay absolut di atas initials — jika foto load, tutupi initials
- URL foto: `/web/image/res.users/{id}/image_128`

**PWA (Progressive Web App)**:
- Manifest: `GET /petadigi/manifest.json` (Content-Type: `application/manifest+json`)
- Service Worker: `GET /petadigi/sw.js` — cache-first untuk static assets (fontawesome, leaflet, echarts), network pass-through untuk API/session Odoo
- Icons: `static/img/icons/` — 8 ukuran (72, 96, 128, 144, 152, 192, 384, 512 px), dihasilkan dari icon.png via Pillow
- Template tags: `<link rel="manifest">`, apple-touch-icon, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`
- SW registration inline sebelum `</body>` di template_strong_form
- Installable Android: Chrome "Add to Home Screen"; iOS: Safari Share → Add to Home Screen

### CSS (`static/src/css/strong_form.css`)
- Tema: CSS variable `--sp-primary: #6c3483` (ungu/purple)
- Shell layout (KRITIKAL untuk sticky topbar):
  ```css
  .sp-shell     { height: 100dvh; overflow: hidden; display: flex; flex-direction: column; }
  .sp-tab.active { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .sp-page-body { flex: 1; min-height: 0; overflow-y: auto; }
  ```
  > Tanpa `height: 100dvh` + `min-height: 0`, scroll terjadi di document level → `position: sticky` tidak bekerja.
- Sub-page topbar: `.sp-form-topbar { position: sticky; top: 0; z-index: 20; }`
- FAB tablet/wide: `@media (min-width: 512px) { .sp-fab { right: calc(50% - 224px); } }` — align ke kanan konten bukan ke kanan layar
- Infinite scroll sentinel: `.sp-list-sentinel` (spinner + text "Memuat...")
- `.sp-foto-preview` — **harus TIDAK `display: none`** (ada CSS bug lama, sudah dicomment)
- `.sp-kpi-section { display: flex; flex-direction: column; gap: 8px; }` — wrapper judul + konten; tanpa ini `gap: 20px` dari `.sp-page-body` buat jarak judul-konten terlalu besar
- `.sp-kpi2-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }` — 2 card sejajar
- `.sp-greeting-avatar` — avatar 44×44 circular, initials + img overlay
- `.sp-greeting-av-img { position: absolute; inset: 0; object-fit: cover; }` — overlay foto di atas initials
- `.sp-chart-card / .sp-chart-canvas { height: 150px; }` — weekly bar chart
- `.sp-filter-badge` — pill badge di header record list saat filter aktif

### ModSecurity
Jika deploy ke VPS dengan nginx ModSecurity, tambahkan location block:
```nginx
location ~ ^/petadigi/ {
    modsecurity off;
    proxy_pass http://odoo19;
    proxy_redirect off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}
```
> Diperlukan karena upload foto base64 di JSON body diblokir ModSecurity (sama dengan `/giat/` dan `/sumur/`).

---

## 8. Dashboard Peta — Arsitektur JS

### Komponen Utama (`dashboard_map.js`)
- Owl component, register ke `registry.category("actions")` dengan key `petadigi_dashboard_map`
- Services: `orm`, `action`
- State drill-down: `this.drillKabupatenId`, `this.drillKecamatanId`
- Method utama: `_switchMode()`, `_updateKpiCards()`, `_updateCharts()`, `_clearAllLayers()`
- Filter refs:
  - `filterTahun`, `filterKabupaten`, `filterState`, `filterKategori`, `filterSubKategori`, `filterDateRange` — filter umum
  - `filterKategoriSumur` — filter khusus mode sumur (ref terpisah)
  - `chartSumurRowRef`, `tableSumurRowRef`, `tableSumurBodyRef` — refs sumur
- Active date: `this.activeDateFrom`, `this.activeDateTo`
- `_suppressDateChange` — guard mencegah double-trigger flatpickr

### Filter Visibility per Mode
- Tahun + Date range: **tidak tampil** di mode `umum` dan `lokasi` (dan `sumur`)
- Sub kategori: hanya tampil di mode `kriminal`
- `filterKategori`: **tidak tampil** di mode `umum` dan `sumur`
- `filterKategoriSumur`: **hanya tampil** di mode `sumur`

### File Layer (dashboard_layer_*.js)
Setiap file menerima `ctx` (instance komponen). Pola umum:
1. `addXxxLegend(ctx)` / `removeXxxLegend(ctx)`
2. `loadModeXxx(ctx)` — Level 1 kabupaten choropleth
3. `drillDownXxxKecamatan(ctx, kabProps, kabLayer, filters)`
4. `drillDownXxxKelurahan(ctx, kecProps, kecLayer, filters, kabProps, kabLayer)`
5. `_addXxxBackButton(ctx, targetLevel, backCtx)`

**`dashboard_layer_sumur_minyak.js`** — pola sedikit berbeda:
- Fungsi `_getActiveFilters(ctx)` yang mengembalikan `{ kabupatenId, stateValue, kategoriId }`
- `_buildDomain(filters, drillCtx)` — centralized domain builder
- `loadModeSumur(ctx)` — load marker (tidak choropleth)
- `_loadSumurMarkers(ctx)` — fetch `petadigi.sumur_minyak` dengan fields lengkap
- Popup HTML inline dengan tabel info + foto

### Domain Pattern
```js
const drillDomain = ctx.drillKecamatanId
    ? [['kecamatan_id', '=', ctx.drillKecamatanId]]
    : ctx.drillKabupatenId
        ? [['kabupaten_id', '=', ctx.drillKabupatenId]]
        : [];

const baseDomain = [
    ...drillDomain,
    ...(kabupatenId ? [['kabupaten_id',            '=',  kabupatenId]]  : []),
    ...(stateValue  ? [['state',                   '=',  stateValue]]   : []),
    ...(tahun       ? [['sumber_dokumen_id.tahun', '=',  tahun]]        : []),
    ...(dateFrom    ? [['tanggal_kejadian',         '>=', dateFrom + ' 00:00:00']] : []),
    ...(dateTo      ? [['tanggal_kejadian',         '<=', dateTo   + ' 23:59:59']] : []),
    ...(kategoriId  ? [['kategori_id',              '=',  kategoriId]]  : []),
];
```
> **Sumur Minyak**: domain hanya `kabupaten_id`, `state`, `kategori_id` — tidak ada `tanggal_kejadian` atau `sumber_dokumen_id`.
> **Lokasi Penting**: domain hanya `kabupaten_id`, `state`, `kategori_id`.

### State Field per Model
| Model | Field status | Nilai |
|---|---|---|
| kriminalitas | `status_perkara` | `PROSES` / `SELESAI` |
| kasus_menonjol | `state` | `PROSES` / `SELESAI` |
| bencana | `state` | `AKTIF` / `NON AKTIF` |
| lalu_lintas | `state` | `PROSES` / `SELESAI` |
| lokasi_penting | `state` | `AKTIF` / `NON AKTIF` |
| sumur_minyak | `state` | `AKTIF` / `TIDAK AKTIF` |

---

## 8. Warna Skala Choropleth

| Mode | Skala | Warna |
|---|---|---|
| Kriminal | > 2000 / > 1000 / > 500 / >= 1 / 0 | `#922b21` / `#e74c3c` / `#e67e22` / `#f1c40f` / `#abebc6` |
| KAM | > 50 / 21-50 / 11-20 / 1-10 / 0 | `#922b21` / `#e74c3c` / `#e67e22` / `#f1c40f` / `#abebc6` |
| Bencana | > 50 / 21-50 / 11-20 / 1-10 / 0 | `#922b21` / `#e74c3c` / `#e67e22` / `#f1c40f` / `#abebc6` |
| Lalin | > 2000 / > 1000 / > 500 / >= 1 / 0 | `#922b21` / `#e74c3c` / `#e67e22` / `#f1c40f` / `#abebc6` |
| Lokasi | > 50 / 21-50 / 11-20 / 1-10 / 0 | `#4a235a` / `#7d3c98` / `#a569bd` / `#d2b4de` / `#f4ecf7` (**ungu**) |
| Sumur | Marker saja, tidak choropleth | — |

---

## 9. Grafik (ECharts) per Mode

### Kriminal (5 chart rows)
- Row 1: Bar per kabupaten + Donut per kategori
- Row 2: Bar lokasi TKP + Bar sub kategori (top 10, sort desc)
- Row 3: Area line trend bulanan + Area line waktu kejadian
- Row 4: Area line waktu Curat + Curas + Curanmor
- Row 5: Area line perbandingan 2 tahun

### KAM (3 chart rows)
- Row 1: Bar per kabupaten + Donut per kategori
- Row 2: Bar per modus operandi + Pie per jenis TKP
- Row 3: Area line perbandingan 2 tahun

### Bencana (1 chart row): Bar per kabupaten + Donut per kategori
### Lalin (2 chart rows): Bar + Donut | Pie jenis jalan + Area line rentang waktu
### Lokasi Penting (1 chart row): Bar per kabupaten + Donut per kategori

### Sumur Minyak (2 chart row via `updateSumurCharts`)
- Bar chart: total sumur per kabupaten (semua kabupaten, sort desc, gradasi oranye-coklat)
- Donut chart: distribusi per kategori (judul "Kategori Sumur Minyak")
  - Legend: `orient: 'horizontal', bottom: 4, left: 'center'`
  - Center: `['50%', '46%']`, radius: `['38%', '62%']`
- Instance: `ctx._echartsSumurBar`, `ctx._echartsSumurDonut`

---

## 10. Marker & Cluster

- **Library**: Leaflet.markercluster v1.5.3
- **Inisialisasi**: `L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 60, ... })`
- **Layer cluster**: `ctx.markerLayerGroup`
- **Layer overlay lokasi**: `ctx.lokasiOverlayLayerGroup`

**CSS marker classes**:
- `petadigi-crime-marker` → kriminalitas (merah)
- `petadigi-kam-marker` → kasus menonjol (biru)
- `petadigi-bencana-marker` → bencana, lalin, lokasi
- `petadigi-giat-marker` → hasil giat Cooling System (border `#1a6b9a`)
- `petadigi-overlay-marker` → overlay lokasi penting (ungu `#6c3483`)

Setiap marker punya popup "Lihat Detail":
```js
ctx.action.doAction({
    type: 'ir.actions.act_window',
    res_model: 'petadigi.MODEL_NAME',
    res_id: r.id,
    views: [[false, 'form']],
    target: 'current',
});
```

---

## 11. Format Angka & Tanggal

### Tanggal (UTC → local)
```js
// fmtTanggal(s) di dashboard_helpers.js → "30 Jun 2026"
const iso = s.trim().length <= 10 ? `${s}T00:00:00Z` : `${s.replace(' ', 'T')}Z`;
const d = new Date(iso);
return `${d.getDate()} ${_BULAN[d.getMonth()]} ${d.getFullYear()}`;
```

### Angka — Format Indonesia
```js
// Ribuan tanpa desimal
total.toLocaleString('id-ID')  // → "1.234"

// Dua desimal (jumlah_minyak)
val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
// → "1.234.567,50"
```
Format Indonesia: titik sebagai pemisah ribuan, koma sebagai desimal.

---

## 12. Widget Backend — `image_popup`

File:
- `static/src/xml/image_popup_widget.xml`
- `static/src/js/image_popup_widget.js`
- CSS di `static/src/css/backend.css`

**Register**: `registry.category("fields").add("image_popup", { component: ImagePopupField, supportedTypes: ["binary"] })`

**Penggunaan di views**:
```xml
<field name="foto" widget="image_popup"/>
```

**Behaviour**:
- Ada foto → tampilkan `<img class="pg-foto-preview">` dengan `cursor: zoom-in`
- Klik gambar → lightbox overlay (`.pg-image-overlay`) dengan tombol × close
- Hover gambar (edit mode) → overlay `.pg-foto-actions` muncul di bawah gambar:
  - Tombol pensil (kiri) → trigger file input upload
  - Tombol tempat sampah / danger (kanan) → hapus foto (`clearImage()`)
- Tidak ada foto → placeholder upload (edit mode) atau placeholder "Belum ada foto" (readonly)

**State**: `useState({ showPopup: false, previewSrc: null })`

**`clearImage()`**:
```js
clearImage() {
    this.state.previewSrc = null;
    this.props.record.update({ [this.props.name]: false });
}
```

**CSS hover pattern**:
```css
.pg-foto-actions { opacity: 0; pointer-events: none; transition: opacity 0.15s; }
.pg-foto-wrapper:hover .pg-foto-actions { opacity: 1; pointer-events: auto; }
```

---

## 13. File JavaScript Lengkap

| File | Fungsi |
|---|---|
| `dashboard_map.js` | Owl component utama Maps, state, filter, KPI, chart dispatch |
| `dashboard_helpers.js` | `initFilters()`, `fmtTanggal()`, `loadModeComingSoon()` |
| `dashboard_layer_umum.js` | GeoJSON batas wilayah + popup Polres/Polsek |
| `dashboard_layer_kriminal.js` | Choropleth kriminalitas + drill-down 3 level |
| `dashboard_layer_kam.js` | Choropleth kasus menonjol + drill-down 3 level |
| `dashboard_layer_bencana.js` | Choropleth bencana + drill-down 3 level |
| `dashboard_layer_lalin.js` | Choropleth lalu lintas + drill-down 3 level |
| `dashboard_layer_lokasi.js` | Choropleth lokasi penting (ungu) + drill-down 3 level |
| `dashboard_overlay_lokasi.js` | Panel checkbox overlay lokasi penting (multi-mode) |
| `dashboard_charts_kriminal.js` | 5 row grafik kriminalitas |
| `dashboard_charts_kam.js` | 3 row grafik kasus menonjol + badge tindak lanjut |
| `dashboard_charts_bencana.js` | 1 row grafik bencana |
| `dashboard_charts_lalin.js` | 2 row grafik lalu lintas |
| `dashboard_charts_lokasi.js` | 1 row grafik lokasi penting |
| `dashboard_layer_sumur_minyak.js` | Marker sumur minyak + `_getActiveFilters` + popup |
| `dashboard_charts_sumur_minyak.js` | Bar + donut + tabel data sumur minyak |
| `dashboard_monitoring_giat.js` | Dashboard Cooling System: KPI, charts, tables, map cluster |
| `latlon_leaflet_widget.js` | Odoo field widget lat/lon picker |
| `kabupaten_map_widget.js` | Odoo field widget polygon GeoJSON editor |
| `giat_form.js` | Standalone OWL app form publik petugas lapangan (tema biru) |
| `sumur_form.js` | Standalone OWL app form publik input sumur lapangan (tema amber) |
| `strong_form.js` | IIFE SPA mobile Strong Point `/petadigi` — auth, list, form, detail, foto, personel (tema ungu) |
| `dashboard_layer_strong_point.js` | Layer peta Strong Point (backend dashboard) |
| `dashboard_charts_strong_point.js` | Charts Strong Point (backend dashboard) |

---

## 14. Urutan Asset di `__manifest__.py`

```python
'web.assets_frontend': [
    'petadigi/static/src/css/login.css',
],
'web.assets_backend': [
    # Libs
    leaflet.css / leaflet.js / MarkerCluster / flatpickr / echarts.min.js
    # Dashboard Maps
    dashboard_map.css / dashboard_map.xml / leaflet.editable.js
    # Widgets
    kabupaten_map_widget.js / geojson_map_widget.xml / backend.css
    kabupaten_map_widget.css / latlon_leaflet_widget.js+xml+css
    image_popup_widget.xml / image_popup_widget.js
    # Dashboard modular (helpers dulu, map.js TERAKHIR dari Maps)
    dashboard_helpers.js
    dashboard_layer_umum/kriminal/kam/lalin/bencana/lokasi.js
    dashboard_overlay_lokasi.js
    dashboard_charts_kriminal/kam/bencana/lalin/lokasi.js
    dashboard_layer_sumur_minyak.js
    dashboard_charts_sumur_minyak.js
    dashboard_map.js          ← HARUS TERAKHIR dari Maps
    # Monitoring Giat
    dashboard_monitoring_giat.css / .xml / .js
]
```

**Data (views)** — urutan penting untuk referensi XML ID:
```python
'data': [
    ...,
    'views/kategori_sumur_minyak_views.xml',
    'views/sumur_minyak_views.xml',
    ...,
    'views/giat_form_template.xml',
    'views/sumur_form_template.xml',
    ...,
]
```

---

## 15. Pola Implementasi Penting

### ORM Call
```js
// read_group
const groups = await ctx.orm.call('petadigi.sumur_minyak', 'read_group',
    [domain, ['kabupaten_id'], ['kabupaten_id']], { lazy: false });

// searchRead
const records = await ctx.orm.searchRead('petadigi.sumur_minyak', domain,
    ['id', 'code', 'name', 'kategori_id', 'jumlah_minyak', 'state'], { order: 'name asc' });

// searchCount
const total = await ctx.orm.searchCount('petadigi.sumur_minyak', domain);
```

### Pattern Public URL/Token (dipakai di jenis_laporan DAN kategori_sumur_minyak)
```python
import secrets, qrcode, base64
from io import BytesIO

# Create: auto-generate token
@api.model_create_multi
def create(self, vals_list):
    for vals in vals_list:
        if not vals.get('public_token'):
            vals['public_token'] = secrets.token_urlsafe(32)
    return super().create(vals_list)

# Computed URL
@api.depends('public_token')
def _compute_public_url(self):
    base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')
    for rec in self:
        rec.public_url = f"{base_url}/route/{rec.public_token}" if rec.public_token else ''

# Computed QR
@api.depends('public_url')
def _compute_qr_code(self):
    for rec in self:
        if rec.public_url:
            qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M,
                               box_size=6, border=2)
            qr.add_data(rec.public_url)
            qr.make(fit=True)
            img = qr.make_image(fill_color='#HEX', back_color='white')
            buf = BytesIO(); img.save(buf, format='PNG')
            rec.qr_code_image = base64.b64encode(buf.getvalue())
        else:
            rec.qr_code_image = False
```

### Chatter Log dengan Markup
```python
from markupsafe import Markup
body = Markup('<b>Label:</b> %s<br/>') % nilai
record.message_post(body=body, message_type='comment', subtype_xmlid='mail.mt_note')
# JANGAN: body = f'<b>Label:</b> {nilai}'  → HTML di-escape
```

### Mencegah Double-Trigger Filter
```js
onClearDate() {
    this._suppressDateChange = true;
    if (this._fp) this._fp.clear();
    this._suppressDateChange = false;
    this.activeDateFrom = ''; this.activeDateTo = '';
    this.onFilterChange();
}
```

### Membuka Form View dari Dashboard
```js
ctx.action.doAction({ type: 'ir.actions.act_window',
    res_model: 'petadigi.sumur_minyak', res_id: id,
    views: [[false, 'form']], target: 'current' });
```

---

## 16. Import LP Wizard

### Flow 2-step
1. `stage='upload'`: pilih jenis LP, upload `.docx`
2. `stage='preview'`: lihat hasil parsing, koreksi, Simpan → create `petadigi.kriminalitas`

### `default_get` — pre-fill berdasarkan login user
```python
user = self.env.user
if user.polres_id: defaults.setdefault('polres_id', user.polres_id.id)
if user.polsek_id: defaults.setdefault('polsek_id', user.polsek_id.id)
```

### View — field berbeda per group
```xml
<field name="polres_id" groups="petadigi.group_admin,petadigi.group_subdit"/>
<field name="polres_id" groups="petadigi.group_polres" readonly="1"/>
<field name="polres_id" groups="petadigi.group_polsek" readonly="1"/>
```

### Widget Map di Wizard
```xml
<field name="latitude" widget="latlong_map_picker"
       class="latlong-mappicker-wrapper" nolabel="1"/>
```

---

## 17. Kustomisasi UI

### Halaman Login (`login.css` — `web.assets_frontend`)
```css
.oe_login_buttons a.btn-link[href*="signup"] { display: none !important; }  /* signup */
.o_login_auth { display: none !important; }                                  /* passkey */
.o_database_list .text-center.small { display: none !important; }           /* footer */
```

### User Menu Backend (`backend.css`)
```css
[data-menu="account"], [data-menu="install_pwa"],
[data-menu="support"], [data-menu="shortcuts"] { display: none !important; }
```

### Pembatasan Menu "Apps"
```xml
<menuitem id="base.menu_management" name="Apps" groups="base.group_system"/>
```
> Selalu sertakan `name="Apps"` — tanpa `name` akan mereset ke XML ID.

---

## 18. Manajemen User

### Group Akses
- `petadigi.group_admin` — Admin PetaDigi
- `petadigi.group_subdit` — Subdit (baca+tulis KAM & kriminalitas)
- `petadigi.group_polres` — Polres (data wilayahnya sendiri)
- `petadigi.group_polsek` — Polsek (data wilayahnya sendiri)
- `petadigi.group_petadigi_user` — User umum (baca semua data referensi)

### Format Username
- **Polres**: `madmin_[nama_polres_slug]`
- **Polsek**: `[6-7-char-slug][id_polsek]`

### Password Default: `*#PetaDigi2026`

### SQL Fix Group setelah Import CSV
```sql
INSERT INTO res_groups_users_rel (gid, uid)
SELECT
    (SELECT res_id FROM ir_model_data WHERE module='petadigi' AND name='group_polres'),
    id
FROM res_users WHERE login LIKE 'madmin_%'
  AND id NOT IN (SELECT uid FROM res_groups_users_rel WHERE gid = (...));
```

---

## 19. VPS & Server

### Versi
- **Lokal**: Odoo 19.0.20251203, manifest `19.0.2.0.0`
- **VPS**: Odoo 19.0 (harus sama)
- Jika prefix tidak cocok → modul "Uninstallable"

### Odoo 19.4 ALPHA — Tidak Digunakan
OWL API berubah: `useRef` + `t-ref` rusak, `this.el` undefined. Tetap di 19.0.

### `static props = ["*"]` di client action component
```js
export class DashboardMap extends Component {
    static template = "petadigi.DashboardMap";
    static props = ["*"];
}
```

### Migrasi Data ke Server
1. Master data: `pg_dump --data-only --column-inserts`, hapus baris `session_replication_role`
2. Urutan: polres → kabupaten/polsek → kecamatan → desa
3. User: Import CSV via Odoo UI → SQL fix group

---

## 20. View Enhancements (Update 2026-06-19)

### Calendar View & Pivot View

Semua model utama sudah mendapat view tambahan. Pola standar yang digunakan:

**Calendar View** (model dengan `tanggal_kejadian` / `tanggal`):
```xml
<calendar string="Kalender ..." date_start="tanggal_kejadian"
          color="state" mode="month" quick_create="False">
    <field name="field1"/>
    <field name="state" filters="1" invisible="1"/>  <!-- legend filter -->
</calendar>
```
- `quick_create="False"` — wajib karena semua model punya required fields
- `color` = field Many2one atau Selection untuk color coding
- `filters="1" invisible="1"` — tampilkan legend di panel kanan kalender

**Pivot View** (semua model):
```xml
<pivot string="Analisis ..." disable_linking="False">
    <field name="kategori_id" type="row"/>
    <field name="state" type="col"/>
    <!-- JANGAN tambahkan <field name="id" type="measure"/> -->
    <!-- Odoo 19 error: "No aggregate function for measure id" -->
    <!-- Biarkan Count default dari framework -->
</pivot>
```
> **PENTING**: Jangan gunakan `<field name="id" type="measure"/>` di pivot Odoo 17+/19. Ini menyebabkan error `No aggregate function has been provided for the measure 'id'`. Cukup hapus baris measure, Odoo menampilkan Count secara default.

**`aggregator=False` pada Float koordinat**:
```python
latitude  = fields.Float('Latitude',  digits=(10, 6), tracking=True, aggregator=False)
longitude = fields.Float('Longitude', digits=(10, 6), tracking=True, aggregator=False)
```
> Tanpa `aggregator=False`, Latitude dan Longitude muncul sebagai measures di pivot/graph view — tidak relevan. **Wajib ditambahkan ke semua model yang punya lat/lon.**

### Status Calendar + Pivot per Model

| Model | Calendar | Pivot | Date field | Color field |
|---|---|---|---|---|
| `petadigi.kriminalitas` | ✅ | ✅ | `tanggal_kejadian` | `status_perkara` |
| `petadigi.kasus_menonjol` | ✅ | ✅ | `tanggal_kejadian` | `state` |
| `petadigi.bencana` | ✅ | ✅ | `tanggal_kejadian` | `state` |
| `petadigi.lalu_lintas` | ✅ | ✅ | `tanggal_kejadian` | `state` |
| `petadigi.lokasi_penting` | ❌ (no date) | ✅ | — | — |
| `petadigi.sumur_minyak` | ❌ (no date) | ✅ | — | — |
| `petadigi.hasil_giat` | ✅ | ✅ | `tanggal` | `jenis_laporan_id` |

### Filter Tahun & Waktu di Search View

**Model dengan `tahun` (Selection field, string '2026')** — kriminalitas, kasus_menonjol, bencana, lalu_lintas:
```xml
<filter string="Tahun Ini" name="filter_tahun_sekarang"
    domain="[('tahun', '=', context_today().year)]"/>
<filter string="2025" name="filter_tahun_2025" domain="[('tahun', '=', '2025')]"/>
<filter string="2024" name="filter_tahun_2024" domain="[('tahun', '=', '2024')]"/>
<filter string="2023" name="filter_tahun_2023" domain="[('tahun', '=', '2023')]"/>
```
> **PENTING**: Gunakan `context_today().year` (integer), BUKAN `str(context_today().year)`. Domain dievaluasi di JS — fungsi `str()` tidak tersedia. Odoo ORM otomatis coerce integer ke string untuk Selection field.

Default filter aktif di action via context:
```xml
<field name="context">{'search_default_filter_tahun_sekarang': 1}</field>
```

**Model `hasil_giat`** (field `tanggal` Datetime, bukan Selection) — filter waktu relatif:
```xml
<filter string="Hari Ini" name="filter_today"
    domain="[('tanggal','&gt;=', context_today().strftime('%Y-%m-%d 00:00:00')),
             ('tanggal','&lt;=', context_today().strftime('%Y-%m-%d 23:59:59'))]"/>
<filter string="Minggu Ini" name="filter_this_week"
    domain="[('tanggal','&gt;=', (context_today() - relativedelta(days=context_today().weekday())).strftime('%Y-%m-%d 00:00:00')),
             ('tanggal','&lt;=', (context_today() - relativedelta(days=context_today().weekday()) + relativedelta(days=6)).strftime('%Y-%m-%d 23:59:59'))]"/>
<filter string="Bulan Ini" name="filter_this_month"
    domain="[('tanggal','&gt;=', context_today().replace(day=1).strftime('%Y-%m-%d 00:00:00')),
             ('tanggal','&lt;=', (context_today().replace(day=1) + relativedelta(months=1) - relativedelta(days=1)).strftime('%Y-%m-%d 23:59:59'))]"/>
<filter string="Tahun Ini" name="filter_this_year"
    domain="[('tanggal','&gt;=', context_today().replace(month=1, day=1).strftime('%Y-%m-%d 00:00:00')),
             ('tanggal','&lt;=', context_today().replace(month=12, day=31).strftime('%Y-%m-%d 23:59:59'))]"/>
```
> `relativedelta` tersedia di JS domain evaluator Odoo 17+/19. `hasil_giat` tidak punya default filter aktif (by design).

### Action view_mode Update Pattern

Saat menambah view baru, update `view_mode` dan `view_ids` di action:
```xml
<field name="view_mode">list,form,graph,pivot,calendar</field>
<field name="view_ids" eval="[(5, 0, 0),
    (0, 0, {'view_mode': 'list',     'view_id': ref('view_..._list')}),
    (0, 0, {'view_mode': 'form',     'view_id': ref('view_..._form')}),
    (0, 0, {'view_mode': 'graph',    'view_id': ref('view_..._graph')}),
    (0, 0, {'view_mode': 'pivot',    'view_id': ref('view_..._pivot')}),
    (0, 0, {'view_mode': 'calendar', 'view_id': ref('view_..._calendar')}),
]"/>
```

---

## 20. Security — ModSecurity (Nginx)

### Struktur Config
```
/etc/nginx/modsec/main.conf
├── Include modsecurity.conf
├── Include odoo-exceptions.conf   ← Custom exceptions
├── Include coreruleset/crs-setup.conf
└── Include coreruleset/rules/*.conf
```

### File Exceptions (`/etc/nginx/modsec/odoo-exceptions.conf`)
```nginx
# Exception untuk Odoo Settings API endpoint
# Diblokir OWASP CRS rule 949110 karena "res.config.settings" di URL
SecRule REQUEST_URI "@contains /res.config.settings/" \
    "id:10001,phase:1,pass,nolog,ctl:ruleEngine=Off"

# Exception untuk Odoo Change Password wizard
# Diblokir OWASP CRS karena kata "password" di URL path
SecRule REQUEST_URI "@contains /change.password" \
    "id:10002,phase:1,pass,nolog,ctl:ruleEngine=Off"
```

### Menambah Exception Baru
```bash
sudo tee -a /etc/nginx/modsec/odoo-exceptions.conf << 'EOF'

# Keterangan singkat apa yang diblokir dan kenapa
SecRule REQUEST_URI "@contains /pattern.baru/" \
    "id:10003,phase:1,pass,nolog,ctl:ruleEngine=Off"
EOF
sudo nginx -t && sudo systemctl reload nginx
```
> ID harus unik dan increment (10001, 10002, 10003, dst).

### Public Form dengan Upload Foto — Wajib `modsecurity off`

**Root cause**: ModSecurity memblokir request body yang mengandung base64 (foto) karena dianggap serangan. Nginx mengembalikan **HTTP 400** (bukan 413) sebelum request sampai ke Odoo.

**Fix**: Tambahkan location block khusus di `/etc/nginx/sites-available/odoo.conf` dengan `modsecurity off`:

```nginx
# Disable ModSecurity untuk giat public form (ada base64 foto)
location ~ ^/giat/ {
    modsecurity off;
    proxy_pass http://odoo19;
    proxy_redirect off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}

# Disable ModSecurity untuk sumur public form (ada base64 foto)
location ~ ^/sumur/ {
    modsecurity off;
    proxy_pass http://odoo19;
    proxy_redirect off;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}
```

> **ATURAN**: Setiap kali menambah public form baru yang kirim foto (base64 di JSON body), **wajib tambahkan location block** dengan `modsecurity off` di nginx config, lalu `sudo nginx -t && sudo systemctl reload nginx`.

> **TROUBLESHOOTING nginx -t**: Jika muncul `Permission denied` untuk `/run/nginx.pid` padahal `syntax is ok`, jalankan ulang dengan `sudo nginx -t`. Itu bukan syntax error — hanya permission untuk baca PID file.

---

## 21. Development Environment

- **OS**: Windows 11
- **Odoo path**: `C:\Program Files\Odoo 19.0.20251203\server\`
- **Module path**: `...\server\odoo\addons\petadigi\`
- **Database lokal**: `selstudio` (PostgreSQL, user: `openpg`, password: `openpgpwd`, port: 5432)
- **pg_path**: `c:\program files\odoo 19.0.20251203\postgresql\bin`
- **Git branch**: `main`
- **Shell**: PowerShell (Windows)

---

## 22. Tools Migrasi Data (`tools/`)

Script dijalankan via Odoo shell: `exec(open('/path/to/script.py').read())`

| File | Fungsi |
|---|---|
| `migrate_kriminalitas.py` | MySQL `kriminals` → `petadigi.kriminalitas` (14k records, batch 200) |
| `migrate_jenis_laporan.py` | MySQL `rengiats` → `petadigi.jenis_laporan` |
| `migrate_giat.py` | MySQL `giats` → `petadigi.hasil_giat` (1.5k records + foto, batch 50) |
| `update_jenis_lp.py` | Derive `jenis_lp` (A/B) dari format `no_lp` |
| `fix_sub_kategori_kriminalitas.py` | Fix `sub_kategori_id` yang tidak match karena nama alias |

**Pola umum**: `_v(s)` handle NULL, `_dt(s)` parse WIB→UTC, batch commit, skip duplikat.

---

## 23. Status Fitur

### Selesai ✅

**Peta & Dashboard**
- Choropleth + drill-down 3 level semua 5 mode (kriminal, KAM, bencana, lalin, lokasi)
- Overlay lokasi penting (panel checkbox) persisten lintas mode
- Grafik ECharts per mode, sub kategori dibatasi top 10
- Filter tahun, kabupaten, state, kategori, sub kategori, date range

**Sumur Minyak** (terbaru)
- Model `petadigi.sumur_minyak` — field: code, name, kategori_id, kabupaten/kecamatan/desa, lat/lon, foto, jumlah_minyak, state
- Model `petadigi.kategori_sumur_minyak` — upgrade dengan state/public_token/URL/QR code (sama dengan jenis_laporan)
- Dashboard mode `sumur`: marker cluster + bar + donut + tabel paginasi
- Filter `filterKategoriSumur` (ref terpisah, hanya tampil di mode sumur)
- Format `jumlah_minyak` dengan pemisah ribuan Indonesia (`.`) dan dua desimal
- **Public form** `/sumur/<token>` — GPS, kompresi foto, reCAPTCHA, dropdown cascading kabupaten→kecamatan→desa
- Tema amber `#B45309` untuk semua UI sumur minyak

**Cooling System**
- Form publik `/giat/<token>` lengkap dengan GPS, foto, reCAPTCHA
- Dashboard monitoring giat (KPI, chart, tabel polres/polsek, map cluster)
- QR code + share WhatsApp per jenis laporan

**CRUD & Backend**
- Import LP A/B dengan pre-fill polres/polsek, wizard 2-step, map koordinat
- Tindak Lanjut KAM (model, wizard, tab, auto-log chatter)
- Widget `image_popup` — lightbox + hover overlay (pensil + sampah), tanpa hint text
- Widget lat/lon picker, GeoJSON polygon editor

**Infrastruktur**
- CSP-compliant: nol inline script/style di halaman publik
- ModSecurity exceptions: `res.config.settings` (id:10001) + `change.password` (id:10002)
- ModSecurity `off` per-location untuk `/giat/` dan `/sumur/` (base64 foto)
- Pembatasan menu: Apps hanya group_system, user menu dikurangi
- Manajemen user: CSV import + SQL fix group

**View Enhancements (2026-06-19)**
- Calendar + Pivot view untuk: kriminalitas, kasus_menonjol, bencana, lalu_lintas, hasil_giat
- Pivot view (tanpa calendar) untuk: lokasi_penting, sumur_minyak
- Filter tahun (Tahun Ini + 2025/2024/2023) dengan default aktif untuk: kriminalitas, kasus_menonjol, bencana, lalu_lintas
- Filter waktu relatif hasil_giat: Hari Ini, Minggu Ini, Bulan Ini, Tahun Ini (tanpa default)
- `aggregator=False` pada lat/lon semua model agar tidak muncul di pivot measures
- Filter **Jenis LP** di dashboard map kriminalitas: select di XML + `useRef` + visibility + domain di map.js, layer_kriminal.js, charts_kriminal.js — semua selesai ✅

**Strong Point Mobile Web Client (2026-06-23)**
- SPA mobile `/petadigi` — login session Odoo, tab navigasi (Beranda/Strong Point/Patroli/Profil)
- Record list SP dengan infinite scroll (IntersectionObserver, 20/halaman)
- FAB (+) → lokasi picker (GPS Haversine sort) → form tambah → detail view
- Detail view: info, personel (CRUD, nama/pangkat UPPERCASE), dokumentasi foto, set selesai
- Foto upload base64 → `ir.attachment` → tampil sebagai data URL (strip MIME newlines)
- Sticky header sub-pages: shell `height: 100dvh` + tab `flex: 1; min-height: 0` → scroll di page-body
- FAB align tablet: `right: calc(50% - 224px)` untuk layar lebar
- Badge state rata kanan di list item

**Strong Point Mobile — Update (2026-06-25)**
- KPI cards beranda: 2 card sejajar ("SP Hari Ini" + "SP Keseluruhan"), klik → filter list Strong Point
- Filter badge di record list dengan tombol ✕ untuk clear filter
- Timezone audit: `_today_utc_range_wib()` untuk filter "hari ini" yang benar di WIB; `_wib_to_utc()` untuk input datetime dari mobile
- Section spacing fix: wrapper `.sp-kpi-section` agar jarak judul-konten tidak terlalu besar
- Weekly bar chart (ECharts, 7 hari ke belakang, highlight hari ini ungu gelap)
- User avatar circular di greeting (initials fallback + foto overlay)
- PWA setup: manifest.json, service worker, icons 72–512px di `static/img/icons/`

**Patroli Backend (2026-06-25)**
- Model `petadigi.patroli`: code PTL00001, polres/polsek, wilayah, tanggal mulai/selesai, state PROSES/SELESAI, keterangan
- Model `petadigi.personel_patroli`: nama, pangkat, nama_lengkap (computed), patroli_id
- Views lengkap: list, form (smart button + tab personel inline), search (filter + groupby), graph, pivot, calendar
- Sequence PTL + security CSV + menu Maps → Patroli

### Potensial Berikutnya
- Export/report Monitoring Giat ke PDF/Excel
- Notifikasi real-time kasus baru
- Grafik trend tahunan untuk mode bencana dan sumur minyak
- Dashboard backend Strong Point (choropleth / marker di peta utama)
- Tab Patroli di mobile app (form pencatatan patroli via `/petadigi`)

---

*Dokumen diperbarui: 2026-06-25*
