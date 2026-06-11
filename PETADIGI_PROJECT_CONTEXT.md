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
├── models/                    # 24 model data
├── views/                     # 29 file XML views
├── controllers/
│   ├── __init__.py
│   └── giat_public.py         # Public form controller untuk Cooling System
├── wizard/
│   ├── import_lp_wizard.py
│   └── import_lp_wizard_views.xml
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
        ├── css/                        # 5 file CSS
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
- `no_lp`, `tanggal_kejadian`, `latitude`, `longitude`
- `kabupaten_id`, `kecamatan_id`, `desa_id`
- `kategori_id`, `modus_operandi_id`, `jenis_tkp_id`
- `state`: `AKTIF` / `NON AKTIF`
- `sumber_dokumen_id`

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
| kasus_menonjol | `state` | `AKTIF` / `NON AKTIF` |
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
| `dashboard_charts_kam.js` | 3 row grafik kasus menonjol |
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
    'petadigi/static/src/css/backend.css',
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

### CSS Classes Penting
- `.petadigi-popup` / `.petadigi-popup-header` / `.petadigi-popup-body` / `.petadigi-popup-footer`
- `.petadigi-btn-detail` — tombol aksi di dalam popup
- `.petadigi-btn-back` — tombol back di peta
- `.petadigi-legend` — container legend Leaflet
- `.petadigi-crime-marker` / `.petadigi-kam-marker` / `.petadigi-bencana-marker` / `.petadigi-giat-marker`
- `.petadigi-kpi-card` / `.petadigi-kpi-icon` / `.petadigi-kpi-value`
- `.petadigi-chart-row` / `.petadigi-chart-card` / `.petadigi-chart-body`
- `.petadigi-lokasi-overlay` — panel checkbox overlay lokasi penting

---

## 14. Status Fitur

### Selesai ✅
- Model data dan views semua entitas (kriminalitas, KAM, bencana, lalin, lokasi penting)
- Import wizard LP A dan B
- Dashboard Maps 5 mode peta dengan choropleth penuh
- Drill-down 3 level (kabupaten → kecamatan → desa) di semua mode
- Drill-down sync: KPI cards + grafik ikut terfilter saat drill
- Dropdown kabupaten sync dengan drill-down navigasi
- Marker clustering (Leaflet.markercluster)
- Tombol "Lihat Detail" di popup marker → buka form view
- Grafik ECharts per mode (bar + donut + tambahan per mode)
- Overlay lokasi penting (panel checkbox) di semua mode peta non-umum
- Widget lat/lon picker
- Widget GeoJSON polygon editor
- Format tanggal konsisten `DD Mon YYYY` / `DD Mon YYYY HH:MM` dengan UTC→local conversion
- **Cooling System**:
  - Model `jenis_laporan` dengan QR code, public token, public URL
  - Model `hasil_giat` dengan foto, GPS, auto-sequence
  - Public form di `/giat/<token>` (mobile-friendly, standalone OWL)
  - Controller JSON-RPC submit + polsek lookup
  - Dashboard Monitoring Giat (KPI, 3 charts, 2 data tables, map cluster)
  - Rich popup foto lazy-load di map monitoring
  - Stat button "Total Giat" di form Jenis Laporan + link ke data terkait
  - Konfirmasi dialog di tombol "Buat Ulang URL"

### Potensial Pengembangan Berikutnya
- Export/report Monitoring Giat ke PDF atau Excel
- Role-based access control
- Notifikasi real-time kasus baru
- Grafik tambahan untuk mode bencana (trend tahunan)
- Filter tanggal di dashboard Monitoring Giat (saat ini hanya filter polres/polsek/jenis)

---

## 15. Development Environment

- **OS**: Windows 11
- **Odoo path**: `C:\Program Files\Odoo 19.0.20251203\server\`
- **Module path**: `...\server\odoo\addons\petadigi\`
- **Git branch**: `main`
- **Shell**: PowerShell (Windows)

---

*Dokumen diperbarui: 2026-06-10*
