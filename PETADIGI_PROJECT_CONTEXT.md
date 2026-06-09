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
| Tujuan | Sistem manajemen data kepolisian berbasis peta interaktif (kriminalitas, bencana, lalu lintas, kasus menonjol, lokasi penting) |

---

## 2. Gambaran Sistem

PetaDigi adalah modul Odoo yang menggabungkan:
- **Manajemen data kepolisian** (CRUD, tracking, chatter) untuk 4 entitas utama
- **Peta interaktif berbasis Leaflet.js** dengan choropleth GeoJSON wilayah Indonesia
- **Import otomatis dokumen LP** (Laporan Polisi tipe A dan B dari file `.docx`)
- **Dashboard modular** dengan 5 mode peta + KPI cards + grafik ECharts per mode
- **Drill-down interaktif**: Kabupaten → Kecamatan → Desa/Kelurahan

Pengguna utama: **Kepolisian Resort (Polres)** dan **Kepolisian Sektor (Polsek)** di Indonesia.

---

## 3. Struktur Folder

```
petadigi/
├── __manifest__.py
├── __init__.py
├── models/                    # 22 model data
├── views/                     # 20+ file XML views
├── controllers/__init__.py
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
        ├── js/                         # 14 file JavaScript modular
        ├── css/                        # 4 file CSS
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

### Model Utama Aplikasi (4 entitas)

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

## 5. Dashboard Peta — Arsitektur JS

### Komponen Utama (`dashboard_map.js`)
- Owl component, register ke `registry.category("actions")` dengan key `petadigi_dashboard_map`
- Services: `orm`, `action`
- State drill-down: `this.drillKabupatenId`, `this.drillKecamatanId` (null saat reset)
- Method utama: `_switchMode()`, `_updateKpiCards()`, `_updateCharts()`, `_clearAllLayers()`, `_updateFilterSummary()`
- Filter refs: `filterTahun`, `filterKabupaten`, `filterState`, `filterKategori`, `filterSubKategori`, `filterDateRange`
- Active date: `this.activeDateFrom`, `this.activeDateTo`

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

## 6. Warna Skala Choropleth

| Mode | Skala | Warna |
|---|---|---|
| Kriminal | > 2000 / > 1000 / > 500 / >= 1 / 0 | `#922b21` / `#e74c3c` / `#e67e22` / `#f1c40f` / `#abebc6` |
| KAM | > 50 / 21-50 / 11-20 / 1-10 / 0 | `#922b21` / `#e74c3c` / `#e67e22` / `#f1c40f` / `#abebc6` |
| Bencana | > 50 / 21-50 / 11-20 / 1-10 / 0 | `#922b21` / `#e74c3c` / `#e67e22` / `#f1c40f` / `#abebc6` |
| Lalin | > 2000 / > 1000 / > 500 / >= 1 / 0 | `#922b21` / `#e74c3c` / `#e67e22` / `#f1c40f` / `#abebc6` |
| Lokasi | > 50 / 21-50 / 11-20 / 1-10 / 0 | `#4a235a` / `#7d3c98` / `#a569bd` / `#d2b4de` / `#f4ecf7` (**ungu**) |

---

## 7. Grafik (ECharts) per Mode

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

## 8. Marker & Cluster

- **Library**: Leaflet.markercluster v1.5.3 (lokal di `static/lib/leaflet-markercluster/`)
- **Inisialisasi**: `L.markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 60, showCoverageOnHover: false, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 16 })`
- **Layer**: `ctx.markerLayerGroup` — satu instance dipakai semua mode

**CSS marker classes**:
- `petadigi-crime-marker` → kriminalitas (merah)
- `petadigi-kam-marker` → kasus menonjol (biru)
- `petadigi-bencana-marker` → bencana, lalin, lokasi (generic, border warna sesuai state)

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

---

## 9. File JavaScript Lengkap

| File | Fungsi |
|---|---|
| `dashboard_map.js` | Owl component utama, state, filter, KPI cards, chart dispatch |
| `dashboard_helpers.js` | `initFilters()`, `loadModeComingSoon()`, breadcrumb helpers |
| `dashboard_layer_umum.js` | Layer GeoJSON batas wilayah + popup Polres/Polsek |
| `dashboard_layer_kriminal.js` | Choropleth kriminalitas + drill-down 3 level |
| `dashboard_layer_kam.js` | Choropleth kasus menonjol + drill-down 3 level |
| `dashboard_layer_bencana.js` | Choropleth bencana + drill-down 3 level |
| `dashboard_layer_lalin.js` | Choropleth lalu lintas + drill-down 3 level |
| `dashboard_layer_lokasi.js` | Choropleth lokasi penting (ungu) + drill-down 3 level |
| `dashboard_charts_kriminal.js` | 5 row grafik kriminalitas |
| `dashboard_charts_kam.js` | 3 row grafik kasus menonjol |
| `dashboard_charts_bencana.js` | 1 row grafik bencana |
| `dashboard_charts_lalin.js` | 2 row grafik lalu lintas |
| `dashboard_charts_lokasi.js` | 1 row grafik lokasi penting |
| `latlon_leaflet_widget.js` | Odoo field widget lat/lon picker |
| `kabupaten_map_widget.js` | Odoo field widget polygon GeoJSON editor |

---

## 10. Urutan Asset di `__manifest__.py`

```python
'web.assets_backend': [
    'petadigi/static/lib/leaflet/leaflet.css',
    'petadigi/static/lib/leaflet/leaflet.js',
    'petadigi/static/lib/leaflet-markercluster/MarkerCluster.css',
    'petadigi/static/lib/leaflet-markercluster/MarkerCluster.Default.css',
    'petadigi/static/lib/leaflet-markercluster/leaflet.markercluster.js',
    'petadigi/static/lib/flatpickr/flatpickr.min.css',
    'petadigi/static/lib/flatpickr/flatpickr.min.js',
    'petadigi/static/lib/echart/echarts.min.js',
    'petadigi/static/src/css/dashboard_map.css',
    'petadigi/static/src/xml/dashboard_map.xml',
    'petadigi/static/lib/leaflet/leaflet.editable.js',
    # ... widget files ...
    # Dashboard modular (urutan penting):
    'petadigi/static/src/js/dashboard_helpers.js',
    'petadigi/static/src/js/dashboard_layer_umum.js',
    'petadigi/static/src/js/dashboard_layer_kriminal.js',
    'petadigi/static/src/js/dashboard_layer_kam.js',
    'petadigi/static/src/js/dashboard_layer_lalin.js',
    'petadigi/static/src/js/dashboard_layer_bencana.js',
    'petadigi/static/src/js/dashboard_layer_lokasi.js',
    'petadigi/static/src/js/dashboard_charts_kriminal.js',
    'petadigi/static/src/js/dashboard_charts_kam.js',
    'petadigi/static/src/js/dashboard_charts_bencana.js',
    'petadigi/static/src/js/dashboard_charts_lalin.js',
    'petadigi/static/src/js/dashboard_charts_lokasi.js',
    'petadigi/static/src/js/dashboard_map.js',   # HARUS TERAKHIR
]
```
> **Penting**: Jika menambah file JS baru, daftarkan **sebelum** `dashboard_map.js`. File baru yang tidak terdaftar di manifest akan menyebabkan `KeyNotFoundError: petadigi_dashboard_map` saat modul diupgrade.

---

## 11. Pola Implementasi Penting

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

### Membuka Form View dari Map
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

### CSS Classes Penting
- `.petadigi-popup` / `.petadigi-popup-header` / `.petadigi-popup-body` / `.petadigi-popup-footer`
- `.petadigi-btn-detail` — tombol aksi di dalam popup
- `.petadigi-btn-back` — tombol back di peta
- `.petadigi-legend` — container legend Leaflet
- `.petadigi-crime-marker` / `.petadigi-kam-marker` / `.petadigi-bencana-marker`
- `.petadigi-kpi-card` / `.petadigi-kpi-icon` / `.petadigi-kpi-value`
- `.petadigi-chart-row` / `.petadigi-chart-card` / `.petadigi-chart-body`

---

## 12. Status Fitur

### Selesai ✅
- Model data dan views semua entitas (kriminalitas, KAM, bencana, lalin, lokasi penting)
- Import wizard LP A dan B
- Dashboard 5 mode peta dengan choropleth penuh
- Drill-down 3 level (kabupaten → kecamatan → desa) di semua mode
- Drill-down sync: KPI cards + grafik ikut terfilter saat drill
- Dropdown kabupaten sync dengan drill-down navigasi
- Marker clustering (Leaflet.markercluster)
- Tombol "Lihat Detail" di popup marker → buka form view
- Grafik ECharts per mode (bar + donut + tambahan per mode)
- Widget lat/lon picker
- Widget GeoJSON polygon editor

### Potensial Pengembangan Berikutnya
- Grafik tambahan untuk mode bencana (trend tahunan)
- Role-based access control
- Export/report ke PDF atau Excel
- Notifikasi real-time kasus baru

---

## 13. Development Environment

- **OS**: Windows 11
- **Odoo path**: `C:\Program Files\Odoo 19.0.20251203\server\`
- **Module path**: `...\server\odoo\addons\petadigi\`
- **Git branch**: `main`
- **Shell**: PowerShell (Windows)

---

*Dokumen diperbarui: 2026-06-09*
