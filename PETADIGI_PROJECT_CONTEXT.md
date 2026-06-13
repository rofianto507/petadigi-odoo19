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
| Tujuan | Sistem manajemen data kepolisian berbasis peta interaktif + Cooling System (monitoring kegiatan lapangan) |

---

## 2. Gambaran Sistem

PetaDigi adalah modul Odoo yang menggabungkan:
- **Manajemen data kepolisian** (CRUD, tracking, chatter) untuk 4 entitas utama
- **Peta interaktif berbasis Leaflet.js** dengan choropleth GeoJSON wilayah Indonesia
- **Import otomatis dokumen LP** (Laporan Polisi tipe A dan B dari file `.docx`)
- **Dashboard Maps modular** dengan 5 mode peta + KPI cards + grafik ECharts per mode
- **Drill-down interaktif**: Kabupaten → Kecamatan → Desa/Kelurahan
- **Cooling System**: Monitoring kegiatan lapangan polisi via form publik (QR code / link) + dashboard monitoring

Pengguna utama: **Kepolisian Resort (Polres)** dan **Kepolisian Sektor (Polsek)** di Indonesia.

---

## 3. Struktur Folder

```
petadigi/
├── __manifest__.py
├── __init__.py
├── models/                    # 25 model data
│   ├── tindak_lanjut.py       # Model petadigi.tindak_lanjut (baru)
│   └── ...
├── views/
│   ├── menu_restrictions.xml  # Batasi menu "Apps" hanya group_system
│   └── ...                    # 30+ file XML views
├── controllers/
│   ├── __init__.py
│   └── giat_public.py         # Public form controller untuk Cooling System
├── wizard/
│   ├── import_lp_wizard.py
│   ├── import_lp_wizard_views.xml
│   ├── tindak_lanjut_wizard.py       # Wizard tambah tindak lanjut (baru)
│   └── tindak_lanjut_wizard_views.xml
├── utils/
│   ├── parser_lp_a.py
│   └── parser_lp_b.py
├── security/
│   └── ir.model.access.csv
└── static/
    ├── lib/
    │   ├── leaflet/                    # Leaflet.js + Editable plugin
    │   ├── leaflet-markercluster/      # Leaflet.markercluster v1.5.3
    │   ├── flatpickr/                  # Date range picker
    │   └── echart/                     # ECharts untuk grafik
    └── src/
        ├── js/                         # 17 file JavaScript modular
        ├── css/
        │   ├── backend.css             # Menyembunyikan item user menu
        │   ├── login.css               # Menyembunyikan elemen halaman login
        │   └── ...
        └── xml/                        # QWeb templates
```

---

## 4. Model Data

### Model Hierarki Geografis
```
petadigi.polres          → Kepolisian Resort
petadigi.polsek          → Kepolisian Sektor
petadigi.kabupaten       → Kabupaten/Kota (menyimpan GeoJSON geometry)
petadigi.kecamatan       → Kecamatan (menyimpan GeoJSON geometry)
petadigi.desa            → Desa/Kelurahan (menyimpan GeoJSON geometry)
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
- `tersangka`, `permasalahan`, `penanganan`, `tindak_lanjut` (Text — field lama, inline)
- `state`: `PROSES` / `SELESAI`
- `tindak_lanjut_ids` → One2many ke `petadigi.tindak_lanjut`
- `has_tindak_lanjut` (Boolean, computed stored, `@api.depends('tindak_lanjut_ids')`)
- Method: `action_set_selesai`, `action_set_proses`, `action_open_tindak_lanjut_wizard`

**`petadigi.tindak_lanjut`** *(baru)* — Tindak Lanjut Kasus Menonjol
- `kasus_menonjol_id` → Many2one `petadigi.kasus_menonjol` (required, ondelete='cascade')
- `tanggal` (Datetime, required, default now), `_order = 'tanggal desc'`
- `tindakan` (Text, required)
- `attachment` (Binary, attachment=True), `attachment_filename` (Char)
- **Auto-log chatter** di `kasus_menonjol_id`:
  - `create`: log "Tindak Lanjut Ditambahkan" + tanggal + tindakan + lampiran (internal note)
  - `unlink`: kumpulkan data dulu sebelum `super().unlink()`, lalu log "Tindak Lanjut Dihapus"
- Import wajib: `from markupsafe import Markup` dan `from odoo.tools import format_datetime`
- Pattern Markup: `Markup('<b>Label:</b> %s') % value` — JANGAN interpolasi f-string biasa (auto-escaped)

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

### Model Cooling System

**`petadigi.jenis_laporan`** — Jenis Laporan Cooling System
- `nama`, `keterangan`
- `state`: `draft` / `aktif` / `non_aktif`
- `public_token` (Char, readonly, auto-generate via `secrets.token_urlsafe(32)`)
- `public_url` (Char, computed dari `web.base.url + /giat/{token}`)
- `qr_code_image` (Binary, computed — QR code PNG dari `public_url`)
- `jumlah_giat` (Integer, computed — hitung `hasil_giat` terkait via `read_group`)
- Methods: `action_set_aktif`, `action_set_non_aktif`, `action_set_draft`, `action_regenerate_token`, `action_share_whatsapp`, `action_view_hasil_giat`
- Form view punya **stat button** "Total Giat" yang klik membuka list `hasil_giat` terfilter
- Tombol **"Buat Ulang URL"** punya `confirm` attribute untuk konfirmasi sebelum reset token

**`petadigi.hasil_giat`** — Hasil Kegiatan Lapangan
- `code` (auto-sequence, readonly)
- `jenis_laporan_id` → `petadigi.jenis_laporan`
- `nrp`, `nama_petugas` (required), `pangkat_petugas`
- `polres_id` (required) → `petadigi.polres`
- `polsek_id` (domain: `polres_id`-filtered) → `petadigi.polsek`
- `tanggal` (Datetime, default now, UTC di database)
- `kegiatan` (Text)
- `foto` (Binary, `attachment=True`) — diakses via `/web/image/petadigi.hasil_giat/{id}/foto`
- `foto_filename` (Char)
- `latitude`, `longitude` (Float, digits 10,6)

### Model Wizard

**`petadigi.tindak_lanjut.wizard`** *(baru)* — Wizard Tambah Tindak Lanjut
- `kasus_menonjol_id` (Many2one, required), `tanggal` (Datetime, required, default now)
- `tindakan` (Text, required), `attachment` (Binary), `attachment_filename` (Char)
- Method `action_confirm`: create `petadigi.tindak_lanjut` lalu return `act_window_close`
- Dipanggil dari tombol "Tambah Tindak Lanjut" di tab Tindak Lanjut pada form KAM
- Context otomatis: `{'default_kasus_menonjol_id': self.id}`

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

## 5. Cooling System — Arsitektur

### Public Form (`/giat/<token>`)
- Route: `GET /giat/<string:token>` — render template `petadigi.template_giat_form`
- Route: `POST /giat/api/polsek` (JSON-RPC) — return polsek list by polres_id
- Route: `POST /giat/api/submit` (JSON-RPC) — create `hasil_giat` record
- Template: `views/giat_form_template.xml` — standalone HTML (tidak pakai Odoo master layout)
- JS: `static/src/js/giat_form.js` — OWL Component standalone (pakai `owl.js` dari CDN-like path)
  - Fitur: form petugas (NRP, nama, pangkat), pilih polres/polsek (async load), GPS auto-request, map Leaflet draggable marker, upload foto (resize ke max 1280px, JPEG 82%), submit → success screen
  - Cache: `localStorage.petadigi_giat_petugas` untuk NRP/nama/pangkat
  - Validasi: nama_petugas, polres_id, kegiatan wajib

### Dashboard Monitoring Giat
- OWL component: `MonitoringGiatDashboard` di `dashboard_monitoring_giat.js`
- Register: `registry.category("actions").add("petadigi.MonitoringGiatDashboard", ...)`
- Action: `action_monitoring_giat` (ir.actions.client, tag: `petadigi.MonitoringGiatDashboard`)
- Services: `orm`, `action`
- State: `kpi{}`, `chartBar{}`, `chartLine{}`, `chartDonut{}`, `polsekAll[]`, `mapPoints[]`, `tblPolres{}`, `tblPolsek{}`

**KPI Cards**: total giat, total polres lapor, total polsek lapor, hari paling aktif (+ jumlah giat hari itu)

**Charts** (ECharts):
- Bar chart: giat per polres
- Line chart: tren harian
- Donut chart: distribusi per jenis laporan

**Data Tables** (sort + search + pagination):
- **Ringkasan per Polres**: No, Polres, Belum Lapor, Sudah Lapor, Total Giat (semua polres selalu muncul)
- **Polsek yang Mengirim**: No, Polsek, Polres, Total Giat (hanya yang sudah kirim)
- Badge merah = belum lapor, hijau = sudah lapor

**Map Card** (Leaflet + MarkerCluster):
- Cluster marker titik sebaran lokasi giat
- CSS class marker: `petadigi-giat-marker` (border biru `#1a6b9a`)
- Popup: foto lazy-load via `/web/image/petadigi.hasil_giat/{id}/foto`, info giat, tombol "Lihat Detail"
- Foto: elemen `<img>` dibuat via `document.createElement` (bukan dari template), `naturalWidth > 1` check untuk detect Odoo placeholder 1×1px

**Filter**: Polres, Polsek, Jenis Laporan, Date range (flatpickr)

---

## 6. Dashboard Peta — Arsitektur JS

### Komponen Utama (`dashboard_map.js`)
- Owl component, register ke `registry.category("actions")` dengan key `petadigi_dashboard_map`
- Services: `orm`, `action`
- State drill-down: `this.drillKabupatenId`, `this.drillKecamatanId` (null saat reset)
- Method utama: `_switchMode()`, `_updateKpiCards()`, `_updateCharts()`, `_clearAllLayers()`, `_updateFilterSummary()`
- Filter refs: `filterTahun`, `filterKabupaten`, `filterState`, `filterKategori`, `filterSubKategori`, `filterDateRange`
- Active date: `this.activeDateFrom`, `this.activeDateTo`
- **Bug fix**: `_suppressDateChange` flag di `onClearDate()` mencegah double-trigger `onFilterChange()` saat flatpickr `.clear()` dipanggil (flatpickr `onChange` + explicit call = race condition di `initLokasiOverlay` async)

### File Layer (dashboard_layer_*.js)
Setiap file layer menerima `ctx` (instance komponen). Pola umum:
1. `addXxxLegend(ctx)` / `removeXxxLegend(ctx)` — tambah/hapus legend Leaflet
2. `loadModeXxx(ctx)` — Level 1 kabupaten choropleth
3. `drillDownXxxKecamatan(ctx, kabProps, kabLayer, filters)` — Level 2
4. `drillDownXxxKelurahan(ctx, kecProps, kecLayer, filters, kabProps, kabLayer)` — Level 3
5. `_addXxxBackButton(ctx, targetLevel, backCtx)` — tombol kembali

**Drill-down sync**: Setelah drill ke kabupaten, set:
```js
ctx.drillKabupatenId = kabProps.id;
ctx.drillKecamatanId = null;
if (ctx.filterKabupaten?.el) ctx.filterKabupaten.el.value = String(kabProps.id);
ctx._updateFilterSummary(ctx.currentMode);
ctx._updateKpiCards(ctx.currentMode);
ctx._updateCharts(ctx.currentMode);
```

### Overlay Lokasi Penting (`dashboard_overlay_lokasi.js`)
Panel checkbox floating di `bottomleft` map — tampil di **semua mode** kecuali `umum`.
- `initLokasiOverlay(ctx)` — dipanggil di akhir setiap `loadModeXxx` (kriminal, kam, lalin, bencana, lokasi)
- `updateLokasiOverlayMarkers(ctx)` — reload marker berdasarkan kategori yang di-check
- `removeLokasiOverlay(ctx)` — dipanggil di `_clearAllLayers()` saat ganti mode
- `ctx.lokasiOverlaySelected` (Set) — **tidak direset** saat ganti mode, pilihan persisten
- `ctx.lokasiOverlayLayerGroup` — layer terpisah dari `markerLayerGroup` (tidak ikut cluster)
- **Penting**: `initLokasiOverlay` adalah async. Guard `if (ctx.lokasiOverlayControl)` di awal fungsi mencegah double render, tapi hanya efektif jika tidak ada concurrent call. Jaga agar tidak ada double-trigger di sisi pemanggil.

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
    ...(stateValue  ? [['state',                   '=',  stateValue]]   : []),  // atau status_perkara untuk kriminal
    ...(tahun       ? [['sumber_dokumen_id.tahun', '=',  tahun]]        : []),
    ...(dateFrom    ? [['tanggal_kejadian',         '>=', dateFrom + ' 00:00:00']] : []),
    ...(dateTo      ? [['tanggal_kejadian',         '<=', dateTo   + ' 23:59:59']] : []),
    ...(kategoriId  ? [['kategori_id',              '=',  kategoriId]]  : []),
];
```
> **Perhatian**: `petadigi.lokasi_penting` tidak punya `tanggal_kejadian` / `sumber_dokumen_id`, domainnya hanya `kabupaten_id` + `state` + `kategori_id`.

### State Field per Model
| Model | Field status | Nilai |
|---|---|---|
| kriminalitas | `status_perkara` | `PROSES` / `SELESAI` |
| kasus_menonjol | `state` | `PROSES` / `SELESAI` |
| bencana | `state` | `AKTIF` / `NON AKTIF` |
| lalu_lintas | `state` | `PROSES` / `SELESAI` |
| lokasi_penting | `state` | `AKTIF` / `NON AKTIF` |

### Filter Visibility per Mode
- Tahun + Date range: **tidak tampil** di mode `umum` dan `lokasi`
- Sub kategori: hanya tampil di mode `kriminal`
- Filter State: semua mode kecuali `umum`

---

## 7. Warna Skala Choropleth

| Mode | Skala | Warna |
|---|---|---|
| Kriminal | > 2000 / > 1000 / > 500 / >= 1 / 0 | `#922b21` / `#e74c3c` / `#e67e22` / `#f1c40f` / `#abebc6` |
| KAM | > 50 / 21-50 / 11-20 / 1-10 / 0 | `#922b21` / `#e74c3c` / `#e67e22` / `#f1c40f` / `#abebc6` |
| Bencana | > 50 / 21-50 / 11-20 / 1-10 / 0 | `#922b21` / `#e74c3c` / `#e67e22` / `#f1c40f` / `#abebc6` |
| Lalin | > 2000 / > 1000 / > 500 / >= 1 / 0 | `#922b21` / `#e74c3c` / `#e67e22` / `#f1c40f` / `#abebc6` |
| Lokasi | > 50 / 21-50 / 11-20 / 1-10 / 0 | `#4a235a` / `#7d3c98` / `#a569bd` / `#d2b4de` / `#f4ecf7` (**ungu**) |

---

## 8. Grafik (ECharts) per Mode

### Kriminal (5 chart rows)
- Row 1: Bar per kabupaten + Donut per kategori
- Row 2: Bar lokasi kejadian (TKP) + Bar sub kategori
- Row 3: Area line trend bulanan + Area line waktu kejadian
- Row 4: Area line waktu Curat + Curas + Curanmor
- Row 5: Area line perbandingan 2 tahun (Data Tahunan)

### KAM (3 chart rows)
- Row 1: Bar per kabupaten + Donut per kategori
- Row 2: Bar per modus operandi + Pie per jenis TKP
- Row 3: Area line perbandingan 2 tahun (Data Tahunan)

### Bencana (1 chart row)
- Row 1: Bar per kabupaten + Donut per kategori

### Lalin (2 chart rows)
- Row 1: Bar per kabupaten + Donut per kategori
- Row 2: Pie per jenis jalan + Area line rentang waktu kejadian (slot 3 jam)

### Lokasi Penting (1 chart row)
- Row 1: Bar per kabupaten + Donut per kategori

Semua chart memakai `drillDomain` + semua filter aktif. Instance ECharts disimpan di `ctx._echartsXxx` dan di-dispose saat mode berganti.

---

## 9. Marker & Cluster

- **Library**: Leaflet.markercluster v1.5.3 (lokal di `static/lib/leaflet-markercluster/`)
- **Inisialisasi**: `L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 60, showCoverageOnHover: false, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 16 })`
- **Layer cluster**: `ctx.markerLayerGroup` — dipakai semua mode peta
- **Layer overlay lokasi**: `ctx.lokasiOverlayLayerGroup` — terpisah, tidak ikut cluster

**CSS marker classes**:
- `petadigi-crime-marker` → kriminalitas (merah)
- `petadigi-kam-marker` → kasus menonjol (biru)
- `petadigi-bencana-marker` → bencana, lalin, lokasi (border warna sesuai state)
- `petadigi-giat-marker` → hasil giat Cooling System (border biru `#1a6b9a`, circle 28px)
- `petadigi-overlay-marker` → overlay lokasi penting (ungu `#6c3483`)

Setiap marker punya popup dengan tombol **"Lihat Detail"** yang memanggil:
```js
ctx.action.doAction({
    type: 'ir.actions.act_window',
    res_model: 'petadigi.MODEL_NAME',
    res_id: r.id,
    views: [[false, 'form']],
    target: 'current',
});
```

Handler tombol dipasang via `marker.on('popupopen', ...)`.

**Foto di popup (hasil_giat)**: Elemen `<img>` dibuat via `document.createElement('img')` — bukan dari template HTML — lalu `onload`/`onerror` dipasang sebelum set `src`. URL: `/web/image/petadigi.hasil_giat/{id}/foto`. Check `naturalWidth > 1` untuk deteksi Odoo placeholder 1×1px.

---

## 10. Format Tanggal

Semua tanggal dari database adalah **UTC**. Konversi ke local timezone wajib dilakukan.

**Fungsi di `dashboard_helpers.js`**:
```js
// Ekspor: fmtTanggal(s) → "30 Jun 2026"
// Menerima "YYYY-MM-DD" atau "YYYY-MM-DD HH:MM:SS"
const _BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

export function fmtTanggal(s) {
    if (!s) return '-';
    const iso = s.trim().length <= 10 ? `${s}T00:00:00Z` : `${s.replace(' ', 'T')}Z`;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return s;
    return `${d.getDate()} ${_BULAN[d.getMonth()]} ${d.getFullYear()}`;
}
```
Dipakai di: `dashboard_layer_kriminal.js`, `dashboard_layer_kam.js`, `dashboard_layer_lalin.js`, `dashboard_layer_bencana.js`.

**Format datetime di monitoring giat** (`_fmtDateTimeDisplay`):
- Output: `"30 Jun 2026 20:40"` (local timezone)
- Pola yang sama: append `Z` ke string dari DB, parse via `new Date(iso)`, gunakan `.getHours()/.getMinutes()` (local).

---

## 11. File JavaScript Lengkap

| File | Fungsi |
|---|---|
| `dashboard_map.js` | Owl component utama Maps, state, filter, KPI cards, chart dispatch |
| `dashboard_helpers.js` | `initFilters()`, `fmtTanggal()` (UTC→local), `loadModeComingSoon()` |
| `dashboard_layer_umum.js` | Layer GeoJSON batas wilayah + popup Polres/Polsek |
| `dashboard_layer_kriminal.js` | Choropleth kriminalitas + drill-down 3 level |
| `dashboard_layer_kam.js` | Choropleth kasus menonjol + drill-down 3 level |
| `dashboard_layer_bencana.js` | Choropleth bencana + drill-down 3 level |
| `dashboard_layer_lalin.js` | Choropleth lalu lintas + drill-down 3 level |
| `dashboard_layer_lokasi.js` | Choropleth lokasi penting (ungu) + drill-down 3 level |
| `dashboard_overlay_lokasi.js` | Panel checkbox overlay lokasi penting (multi-mode) |
| `dashboard_charts_kriminal.js` | 5 row grafik kriminalitas |
| `dashboard_charts_kam.js` | 3 row grafik kasus menonjol + badge warna tindak lanjut |
| `dashboard_charts_bencana.js` | 1 row grafik bencana |
| `dashboard_charts_lalin.js` | 2 row grafik lalu lintas |
| `dashboard_charts_lokasi.js` | 1 row grafik lokasi penting |
| `dashboard_monitoring_giat.js` | Dashboard Cooling System: KPI, charts, tables, map cluster giat |
| `latlon_leaflet_widget.js` | Odoo field widget lat/lon picker |
| `kabupaten_map_widget.js` | Odoo field widget polygon GeoJSON editor |
| `giat_form.js` | Standalone OWL app form publik petugas lapangan |

---

## 12. Urutan Asset di `__manifest__.py`

```python
'web.assets_frontend': [
    'petadigi/static/src/css/login.css',   # Sembunyikan elemen halaman login
],
'web.assets_backend': [
    # Libs
    'petadigi/static/lib/leaflet/leaflet.css',
    'petadigi/static/lib/leaflet/leaflet.js',
    'petadigi/static/lib/leaflet-markercluster/MarkerCluster.css',
    'petadigi/static/lib/leaflet-markercluster/MarkerCluster.Default.css',
    'petadigi/static/lib/leaflet-markercluster/leaflet.markercluster.js',
    'petadigi/static/lib/flatpickr/flatpickr.min.css',
    'petadigi/static/lib/flatpickr/flatpickr.min.js',
    'petadigi/static/lib/echart/echarts.min.js',
    # Dashboard Maps
    'petadigi/static/src/css/dashboard_map.css',
    'petadigi/static/src/xml/dashboard_map.xml',
    'petadigi/static/lib/leaflet/leaflet.editable.js',
    # Widgets
    'petadigi/static/src/js/kabupaten_map_widget.js',
    'petadigi/static/src/xml/geojson_map_widget.xml',
    'petadigi/static/src/css/backend.css',      # User menu customization
    'petadigi/static/src/css/kabupaten_map_widget.css',
    'petadigi/static/src/js/latlon_leaflet_widget.js',
    'petadigi/static/src/xml/latlon_leaflet_widget.xml',
    'petadigi/static/src/css/latlon_leaflet_widget.css',
    # Dashboard modular (urutan penting — helpers dulu, map.js TERAKHIR)
    'petadigi/static/src/js/dashboard_helpers.js',
    'petadigi/static/src/js/dashboard_layer_umum.js',
    'petadigi/static/src/js/dashboard_layer_kriminal.js',
    'petadigi/static/src/js/dashboard_layer_kam.js',
    'petadigi/static/src/js/dashboard_layer_lalin.js',
    'petadigi/static/src/js/dashboard_layer_bencana.js',
    'petadigi/static/src/js/dashboard_layer_lokasi.js',
    'petadigi/static/src/js/dashboard_overlay_lokasi.js',
    'petadigi/static/src/js/dashboard_charts_kriminal.js',
    'petadigi/static/src/js/dashboard_charts_kam.js',
    'petadigi/static/src/js/dashboard_charts_bencana.js',
    'petadigi/static/src/js/dashboard_charts_lalin.js',
    'petadigi/static/src/js/dashboard_charts_lokasi.js',
    'petadigi/static/src/js/dashboard_map.js',          # HARUS TERAKHIR dari Maps
    # Monitoring Giat (Cooling System)
    'petadigi/static/src/css/dashboard_monitoring_giat.css',
    'petadigi/static/src/xml/dashboard_monitoring_giat.xml',
    'petadigi/static/src/js/dashboard_monitoring_giat.js',
]
```
> **Penting**: File JS baru didaftarkan **sebelum** file utama masing-masing komponen. File tidak terdaftar di manifest → `KeyNotFoundError` saat upgrade.

---

## 13. Pola Implementasi Penting

### ORM Call
```js
// read_group — hitung per field
const groups = await ctx.orm.call('petadigi.bencana', 'read_group',
    [domain, ['kabupaten_id'], ['kabupaten_id']], { lazy: false });

// searchRead — ambil record lengkap
const records = await ctx.orm.searchRead('petadigi.kabupaten',
    [['id', '=', kabId]], ['id', 'name', 'geometry']);

// searchCount — hitung total
const total = await ctx.orm.searchCount('petadigi.bencana', domain);
```

### Membuka Form View dari Map/Dashboard
```js
ctx.action.doAction({
    type: 'ir.actions.act_window',
    res_model: 'petadigi.bencana',
    res_id: r.id,
    views: [[false, 'form']],
    target: 'current',
});
```

### Back Button Pattern
```js
const BackControl = L.Control.extend({
    onAdd: () => {
        const btn = L.DomUtil.create('button', 'petadigi-btn-back');
        L.DomEvent.on(btn, 'click', async (ev) => {
            L.DomEvent.stopPropagation(ev);
            // reset drill state, reload map, update KPI+charts
        });
        return btn;
    },
    onRemove: () => {}
});
ctx.backButton = new BackControl({ position: 'topleft' }).addTo(ctx.map);
```

### Mencegah Double-Trigger Filter (penting untuk async overlay)
```js
// Di _initFlatpickr:
this._suppressDateChange = false;
onChange: (selectedDates) => {
    if (this._suppressDateChange) return;
    // ...
}

// Di onClearDate:
onClearDate() {
    this._suppressDateChange = true;
    if (this._fp) this._fp.clear();
    this._suppressDateChange = false;
    this.activeDateFrom = '';
    this.activeDateTo = '';
    this.onFilterChange();
}
```

### Chatter Log dengan Markup (Odoo 16+)
```python
from markupsafe import Markup
from odoo.tools import format_datetime

# BENAR — gunakan Markup untuk interpolasi aman
body = Markup('<b>Label:</b> %s<br/><b>Tindakan:</b> %s') % (nilai1, nilai2)
record.message_post(body=body, message_type='comment', subtype_xmlid='mail.mt_note')

# SALAH — string biasa akan di-escape oleh Odoo, tag HTML tampil sebagai teks
body = f'<b>Label:</b> {nilai}'  # JANGAN PAKAI INI
```

### One2many dengan Delete tapi tanpa Edit-on-Click
```xml
<!-- no_open="1" → klik baris tidak membuka dialog edit -->
<!-- Tombol delete tetap muncul karena field tidak readonly -->
<field name="tindak_lanjut_ids" nolabel="1">
    <list default_order="tanggal desc" no_open="1">
        <field name="tanggal"/>
        <field name="tindakan"/>
        <field name="attachment" widget="binary" filename="attachment_filename"
            string="Lampiran" readonly="1"/>
        <field name="attachment_filename" column_invisible="1"/>
    </list>
</field>
```
> `readonly="1"` pada `<field name="tindak_lanjut_ids">` akan **memblokir** semua operasi termasuk delete. Jangan pasang readonly di level One2many field jika delete masih diperlukan.

### CSS Classes Penting
- `.petadigi-popup` / `.petadigi-popup-header` / `.petadigi-popup-body` / `.petadigi-popup-footer`
- `.petadigi-btn-detail` — tombol aksi di dalam popup
- `.petadigi-btn-back` — tombol back di peta
- `.petadigi-legend` — container legend Leaflet
- `.petadigi-crime-marker` / `.petadigi-kam-marker` / `.petadigi-bencana-marker` / `.petadigi-giat-marker`
- `.petadigi-kpi-card` / `.petadigi-kpi-icon` / `.petadigi-kpi-value`
- `.petadigi-chart-row` / `.petadigi-chart-card` / `.petadigi-chart-body`
- `.petadigi-lokasi-overlay` — panel checkbox overlay lokasi penting
- `.petadigi-badge--blue` → `background: #d6eaf8; color: #1a5276` — badge biru di tabel dashboard

### Badge Warna di Dashboard KAM (dashboard_charts_kam.js)
```js
// Field yang di-fetch: tambahkan has_tindak_lanjut
const records = await ctx.orm.searchRead('petadigi.kasus_menonjol', domain,
    ['id', 'code', 'state', 'has_tindak_lanjut', ...]);

// Logic badge:
const cls = r.state === 'SELESAI'
    ? '--green'
    : (r.has_tindak_lanjut ? '--blue' : '--red');
```

### Badge Dekorasi di List View (decoration-info)
```xml
<!-- has_tindak_lanjut harus di-fetch meski tidak tampil -->
<field name="has_tindak_lanjut" column_invisible="1"/>
<field name="state" widget="badge"
    decoration-info="has_tindak_lanjut"
    decoration-success="state == 'SELESAI' and not has_tindak_lanjut"
    decoration-warning="state == 'PROSES' and not has_tindak_lanjut"/>
```

---

## 14. Import LP Wizard — Detail Implementasi

### Model: `petadigi.import.lp.wizard` (`wizard/import_lp_wizard.py`)

**Import penting**: `from markupsafe import Markup` (wajib — dipakai di `action_simpan` untuk `message_post`)

**Flow 2-step**:
1. **Upload** (`stage='upload'`): pilih jenis LP, upload file `.docx`
2. **Preview** (`stage='preview'`): lihat hasil parsing, koreksi/lengkapi data, klik Simpan

**`default_get` override** — pre-fill field berdasarkan user login:
```python
@api.model
def default_get(self, fields_list):
    defaults = super().default_get(fields_list)
    user = self.env.user
    if user.polres_id and 'polres_id' in fields_list:
        defaults.setdefault('polres_id', user.polres_id.id)
    if user.polsek_id and 'polsek_id' in fields_list:
        defaults.setdefault('polsek_id', user.polsek_id.id)
    ...
    return defaults
```

**`_onchange_polres_id`** — reset polsek hanya jika tidak cocok (conditional, bukan selalu reset):
```python
@api.onchange('polres_id')
def _onchange_polres_id(self):
    if self.polsek_id and self.polsek_id.polres_id != self.polres_id:
        self.polsek_id = False
```

### View Wizard (`wizard/import_lp_wizard_views.xml`) — Step 2

**KESATUAN group** — field berbeda per group:
```xml
<!-- Admin/Subdit: bebas pilih -->
<field name="polres_id" groups="petadigi.group_admin,petadigi.group_subdit"/>
<field name="polsek_id" groups="petadigi.group_admin,petadigi.group_subdit"
       domain="[('polres_id', '=', polres_id)]"/>
<!-- Polres: polres readonly, polsek bisa pilih dari polresnya -->
<field name="polres_id" groups="petadigi.group_polres" readonly="1"/>
<field name="polsek_id" groups="petadigi.group_polres"
       domain="[('polres_id', '=', polres_id)]"/>
<!-- Polsek: keduanya readonly -->
<field name="polres_id" groups="petadigi.group_polsek" readonly="1"/>
<field name="polsek_id" groups="petadigi.group_polsek" readonly="1"/>
```

**Map Koordinat** — widget `latlong_map_picker` di Step 2:
```xml
<group string="KOORDINAT KEJADIAN">
    <field name="latitude" string="Latitude"/>
    <field name="longitude" string="Longitude"/>
</group>
<div>
    <field name="latitude" widget="latlong_map_picker"
           class="latlong-mappicker-wrapper" nolabel="1"/>
</div>
```
> Widget `latlong_map_picker` membaca `record.data.latitude/longitude`, update keduanya on click/drag. Harus di dalam `div` terpisah dengan class `latlong-mappicker-wrapper`.

### Akses (`security/ir.model.access.csv`)
```csv
access_import_lp_wizard_admin,...,petadigi.group_admin,1,1,1,1
access_import_lp_wizard_polres,...,petadigi.group_polres,1,1,1,1
access_import_lp_wizard_polsek,...,petadigi.group_polsek,1,1,1,1
```
> Wizard perlu full CRUD (bukan hanya read) karena `action_parse_dokumen` memanggil `self.write(vals)`.

---

## 15. Kustomisasi UI

### Halaman Login (`static/src/css/login.css` — asset: `web.assets_frontend`)
```css
/* Sembunyikan "Don't have an account?" */
.oe_login_buttons a.btn-link[href*="signup"] { display: none !important; }

/* Sembunyikan "Use a Passkey" dan separator */
.o_login_auth { display: none !important; }

/* Sembunyikan footer: "Manage Databases" dan "Powered by Odoo" */
.o_database_list .text-center.small { display: none !important; }
```

### User Menu Backend (`static/src/css/backend.css` — asset: `web.assets_backend`)
Item user menu di pojok kanan atas memakai atribut `data-menu="[id]"` pada `DropdownItem`.
```css
/* Sembunyikan Help, Shortcuts, My Odoo.com Account, Install App */
[data-menu="support"],
[data-menu="shortcuts"],
[data-menu="account"],
[data-menu="install_pwa"] {
    display: none !important;
}
```
ID dari `web/static/src/webclient/user_menu/user_menu_items.js`:
- `support` → Help
- `shortcuts` → Shortcuts (CTRL+K)
- `account` → My Odoo.com Account
- `install_pwa` → Install App

### Pembatasan Menu "Apps" (`views/menu_restrictions.xml`)
```xml
<odoo>
    <data noupdate="0">
        <!-- noupdate="0" agar jalan setiap upgrade, name="Apps" wajib ada -->
        <menuitem id="base.menu_management" name="Apps" groups="base.group_system"/>
    </data>
</odoo>
```
> **Catatan penting**: `<menuitem>` tanpa atribut `name` akan mereset nama menu menjadi XML ID (`"base.menu_management"`). Selalu sertakan `name="Apps"`. `<function name="write">` dan `<record>` tidak bisa digunakan untuk memodifikasi menu dari modul `base` di Odoo 19.

---

## 16. Manajemen User

### Group Akses
Didefinisikan di `security/security.xml`:
- `petadigi.group_admin` — Admin PetaDigi
- `petadigi.group_subdit` — Subdit (baca+tulis KAM & kriminalitas)
- `petadigi.group_polres` — Polres (data wilayahnya sendiri)
- `petadigi.group_polsek` — Polsek (data wilayahnya sendiri)

### Format Username
- **Polres**: `madmin_[nama_polres_slug]` — contoh: `madmin_banyuasin`, `madmin_empat_lawang`
- **Polsek**: `[6-7-char-nama-slug][id]` — contoh: `ilibar283`, `madsuk365`
  - Pakai ID polsek sebagai suffix untuk menjamin uniqueness (nama duplikat seperti Madang Suku I/II/III)

### Password Default
`*#PetaDigi2026`

### Import User via CSV + SQL Fix Group
Import CSV via Odoo UI hanya membuat user tanpa group. Setelah import, jalankan SQL:
```sql
INSERT INTO res_groups_users_rel (gid, uid)
SELECT
    (SELECT res_id FROM ir_model_data WHERE module='petadigi' AND name='group_polres') AS gid,
    id AS uid
FROM res_users
WHERE login LIKE 'madmin_%'
  AND id NOT IN (
      SELECT uid FROM res_groups_users_rel
      WHERE gid = (SELECT res_id FROM ir_model_data WHERE module='petadigi' AND name='group_polres')
  );
```
> Gunakan subquery `ir_model_data` — jangan hardcode `gid` karena ID berbeda antara lokal dan server.

---

## 17. VPS & Kompatibilitas Odoo

### Versi
- **Lokal**: Odoo 19.0.20251203 — manifest `version: '19.0.2.0.0'`
- **VPS target**: Odoo 19.0 (harus sama dengan lokal)

### Aturan Versi Manifest
Prefix versi manifest harus cocok dengan seri Odoo yang dijalankan:
- Odoo 19.0 → `'19.0.x.x.x'`

Jika prefix tidak cocok → module tampil "Status: Uninstallable" tanpa tombol Install.

### Odoo 19.4 ALPHA — Tidak Direkomendasikan
`version_info = (19, 4, 0, ALPHA, 1, '')` — pre-release, OWL API berubah:
- `useRef` + `t-ref` rusak untuk client action component tanpa `static props`
- `this.el` undefined di OWL 19.4 untuk client action component

**Keputusan**: tetap di Odoo 19.0, tidak migrasi JS code.

### `static props = ["*"]` di `dashboard_map.js`
```js
export class DashboardMap extends Component {
    static template = "petadigi.DashboardMap";
    static props = ["*"];
    setup() { ... }
}
```

### Migrasi Data ke Server
1. **Master data** (kabupaten/kecamatan/desa): `pg_dump --data-only --column-inserts` lalu jalankan dengan `psql --single-transaction -v ON_ERROR_STOP=1`
   - Hapus baris `session_replication_role` dari dump (butuh superuser — tidak tersedia di hosting)
   - Urutan dump: polres → kabupaten/polsek → kecamatan → desa (sesuai FK dependency)
2. **User**: Import CSV via Odoo UI → jalankan SQL fix group via psql

---

## 18. Status Fitur

### Selesai ✅
- Model data dan views semua entitas (kriminalitas, KAM, bencana, lalin, lokasi penting)
- Import wizard LP A dan B dengan pre-fill polres/polsek/kabupaten berdasarkan login user
- Dashboard Maps 5 mode peta dengan choropleth + drill-down 3 level penuh
- Drill-down sync KPI + grafik + dropdown filter
- Marker clustering, popup "Lihat Detail"
- Grafik ECharts per mode (bar + donut + tambahan per mode)
- Overlay lokasi penting (panel checkbox) di semua mode peta non-umum
- Widget lat/lon picker + GeoJSON polygon editor
- **Cooling System** lengkap (form publik + dashboard monitoring giat)
- **Tindak Lanjut KAM**:
  - Model `petadigi.tindak_lanjut` dengan attachment
  - Wizard tambah tindak lanjut (bukan inline editable)
  - Tab "Tindak Lanjut" di form KAM dengan tombol delete + no_open
  - Auto-log chatter saat create (detail lengkap) dan delete (sebelum data dihapus)
  - Filter "Ada Tindak Lanjut" di search view list KAM
  - Badge biru di list view KAM untuk record yang ada tindak lanjutnya
  - Badge biru di tabel dashboard KAM untuk kasus PROSES+has_tindak_lanjut
- **Kustomisasi UI**:
  - Login page: sembunyikan signup, passkey, manage DB, powered by Odoo
  - Backend user menu: sembunyikan Help, Shortcuts, My Odoo.com Account, Install App
  - Menu "Apps": hanya tampil untuk Administrator (base.group_system)
- **Manajemen User**:
  - Generate CSV polres (18 user) dan polsek (188 user) dengan format username konsisten
  - SQL fix group akses setelah import CSV

### Potensial Pengembangan Berikutnya
- Export/report Monitoring Giat ke PDF atau Excel
- Notifikasi real-time kasus baru
- Grafik tambahan untuk mode bencana (trend tahunan)
- Filter tanggal di dashboard Monitoring Giat

---

## 19. Development Environment

- **OS**: Windows 11
- **Odoo path**: `C:\Program Files\Odoo 19.0.20251203\server\`
- **Module path**: `...\server\odoo\addons\petadigi\`
- **Database lokal**: `selstudio` (PostgreSQL, user: `openpg`, password: `openpgpwd`, port: 5432)
- **pg_path**: `c:\program files\odoo 19.0.20251203\postgresql\bin`
- **Git branch**: `main`
- **Shell**: PowerShell (Windows)

---

*Dokumen diperbarui: 2026-06-13*
