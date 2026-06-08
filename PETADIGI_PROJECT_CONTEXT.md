# PetaDigi — Project Context Brief

> **Tujuan dokumen ini**: Briefing lengkap untuk sesi baru Claude agar dapat melanjutkan development tanpa kehilangan konteks. Module ini dibuat khusus kompatibel dengan **Odoo 19**.

---

## 1. Identitas Proyek

| Field | Value |
|---|---|
| Nama Module | PetaDigi |
| Versi | 1.0.0 |
| Platform | Odoo 19 (bukan Odoo 16/17) |
| Author | Cv Sel Studio |
| Path | `c:\Program Files\Odoo 19.0.20251203\server\odoo\addons\petadigi\` |
| Dependencies | `base`, `web`, `mail` |
| Tujuan | Sistem manajemen kasus kriminalitas berbasis peta interaktif untuk kepolisian Indonesia |

---

## 2. Gambaran Sistem

PetaDigi adalah modul Odoo yang menggabungkan:
- **Manajemen kasus kriminalitas** (CRUD, tracking, chatter)
- **Peta interaktif berbasis Leaflet.js** dengan GeoJSON wilayah Indonesia
- **Import otomatis dokumen LP** (Laporan Polisi tipe A dan B dari file `.docx`)
- **Dashboard choropleth** untuk visualisasi persebaran kriminalitas per wilayah

Pengguna utama: **Kepolisian Resort (Polres)** dan **Kepolisian Sektor (Polsek)** di Indonesia.

---

## 3. Struktur Folder

```
petadigi/
├── __manifest__.py
├── __init__.py
├── README.md
├── models/                    # 18 model data
├── views/                     # 18+ file XML views
├── controllers/__init__.py
├── wizard/
│   ├── import_lp_wizard.py
│   └── import_lp_wizard_views.xml
├── utils/
│   ├── parser_lp_a.py        # Parser dokumen LP-A (.docx)
│   └── parser_lp_b.py        # Parser dokumen LP-B (.docx)
├── security/
│   └── ir.model.access.csv   # Full CRUD untuk semua user
└── static/
    ├── lib/leaflet/           # Leaflet.js + Editable plugin
    └── src/
        ├── js/                # 10 file JavaScript modular
        ├── css/               # 4 file CSS
        └── xml/               # QWeb templates
```

---

## 4. Model Data (18 Model)

### Model Hierarki Geografis
```
petadigi.polres          → Kepolisian Resort (top level organisasi)
petadigi.polsek          → Kepolisian Sektor (di bawah Polres)
petadigi.kabupaten       → Kabupaten/Kota (menyimpan GeoJSON geometry)
petadigi.kecamatan       → Kecamatan (menyimpan GeoJSON geometry)
petadigi.desa            → Desa/Kelurahan (menyimpan GeoJSON geometry)
```

### Model Utama Aplikasi
```
petadigi.kriminalitas    → Kasus kriminalitas (model inti)
```

**Field penting `petadigi.kriminalitas`:**
- `no_lp` — Nomor Laporan Polisi (unique)
- `jenis_lp` — Tipe LP: `A` atau `B`
- `tanggal_kejadian`, `tanggal_laporan`, `tanggal_selesai`
- `latitude`, `longitude` — koordinat TKP (menggunakan widget peta custom)
- `tempat_kejadian` — deskripsi lokasi TKP
- `pelapor`, `terlapor`, `korban`, `saksi`, `penanggung_jawab`
- `apa_yang_terjadi`, `tindak_pidana`, `barang_bukti`, `uraian_singkat`
- `polres_id`, `polsek_id`, `subdit_id`
- `kabupaten_id`, `kecamatan_id`, `desa_id` — dengan cascading `onchange`
- `kategori_id`, `sub_kategori_id`, `jenis_tkp_id`, `modus_operandi_id`
- `status_perkara` — `PROSES` atau `SELESAI`
- `sub_status_perkara_id`
- `is_perkara_selesai` — computed field dari status
- Inherits: `mail.thread`, `mail.activity.mixin` (chatter + activities)
- Field tracking aktif di semua field penting

### Model Konfigurasi/Lookup
```
petadigi.kategori_kriminal        petadigi.kategori_bencana
petadigi.sub_kategori_kriminal    petadigi.kategori_kamtibmas
petadigi.kategori_lalu_lintas     petadigi.kategori_lokasi
petadigi.jenis_jalan              petadigi.jenis_tkp
petadigi.modus_operandi           petadigi.sumber_dokumen
petadigi.subdit                   petadigi.sub_status_perkara
```

### Model Transient (Wizard)
```
petadigi.import.lp.wizard   → Wizard import dokumen LP (.docx)
```

---

## 5. Fitur yang Sudah Diimplementasi

### A. Manajemen Kasus Kriminalitas
- CRUD lengkap dengan field tracking untuk audit trail
- Cascading dropdown: Polres→Polsek, Kabupaten→Kecamatan→Desa, Kategori→SubKategori, Status→SubStatus
- Graph view: bar chart kasus per tanggal, kategori, status, jenis LP
- Chatter + aktivitas untuk kolaborasi

### B. Import Wizard LP (Laporan Polisi)
- 2-stage wizard: Upload → Preview → Simpan
- Auto-detect tipe LP A/B dari keyword "YANG MELAPORKAN" di dokumen
- Parse field: No. LP, tanggal/waktu (konversi WIB→UTC), lokasi, orang-orang, kronologi
- Handle nama bulan Bahasa Indonesia
- Dokumen asli dilampirkan ke record hasil import

### C. Dashboard Peta Interaktif
**Framework**: Owl web component + Leaflet.js

**Sidebar navigation (5 mode)**:
- **Peta Umum** — `dashboard_layer_umum.js` — batas wilayah Kabupaten ✅ Selesai
- **Peta Kriminal** — `dashboard_layer_kriminal.js` — choropleth kriminalitas ✅ Selesai
- **Peta Lalu Lintas** — `dashboard_layer_lalin.js` — 🚧 Coming soon
- **Peta Bencana** — `dashboard_layer_bencana.js` — 🚧 Coming soon
- **Lokasi Penting** — `dashboard_layer_lokasi.js` — 🚧 Coming soon

**Toolbar filter**: Tahun (2020–sekarang) + Kabupaten

**Navigasi multi-level**:
- Level 1: Semua Kabupaten dengan polygon GeoJSON
- Klik Kabupaten → Level 2: Kecamatan (drilldown)
- Tombol Back untuk kembali

**Fitur Peta Kriminal (Choropleth)**:
```
> 2000 kasus  → #922b21 (merah tua)
1001–2000    → #e74c3c (merah)
501–1000     → #e67e22 (oranye)
1–500        → #f1c40f (kuning)
0 kasus      → #abebc6 (hijau)
```
- Legend interaktif
- Popup per kabupaten menampilkan jumlah kasus
- Domain filter berdasarkan tahun dan kabupaten

### D. Widget Peta Custom (Form Views)
1. **`latlon_leaflet_widget.js`** — Picker lat/lon di form field, marker draggable
2. **`kabupaten_map_widget.js`** — Editor polygon GeoJSON dengan Leaflet.Editable
3. **`leaflet_map_widget.js`** — Widget peta standalone untuk field data

---

## 6. File JavaScript Utama

| File | Fungsi |
|---|---|
| `dashboard_map.js` | Komponen Owl utama, manajemen state sidebar, mode, filter |
| `dashboard_helpers.js` | `initFilters()`, `addBackButton()`, `loadModeComingSoon()` |
| `dashboard_layer_umum.js` | Layer GeoJSON + labels + hover + popup Kabupaten |
| `dashboard_layer_kriminal.js` | Layer choropleth kriminalitas + legend + drilldown |
| `dashboard_layer_lalin.js` | Placeholder (coming soon) |
| `dashboard_layer_bencana.js` | Placeholder (coming soon) |
| `dashboard_layer_lokasi.js` | Placeholder (coming soon) |
| `latlon_leaflet_widget.js` | Odoo field widget untuk koordinat lat/lon |
| `kabupaten_map_widget.js` | Odoo field widget untuk edit polygon GeoJSON |
| `leaflet_map_widget.js` | Odoo field widget peta marker standalone |

---

## 7. QWeb Templates (XML)

| File | Konten |
|---|---|
| `dashboard_map.xml` | Template utama dashboard, sidebar, toolbar, map container |
| `geojson_map_widget.xml` | Template widget polygon GeoJSON |
| `latlon_leaflet_widget.xml` | Template widget lat/lon picker |
| `leaflet_templates.xml` | Template marker dan kontrol Leaflet umum |

---

## 8. Pola Implementasi Penting

### Cascading Onchange
```python
@api.onchange('polres_id')
def _onchange_polres_id(self):
    self.polsek_id = False

@api.onchange('kabupaten_id')
def _onchange_kabupaten_id(self):
    self.kecamatan_id = False
    self.desa_id = False
# dst.
```

### ORM Call dari Dashboard JS
Dashboard menggunakan `this.env.services.orm.call()` atau `searchRead()` untuk fetch data ke Odoo backend. Contoh di `dashboard_layer_kriminal.js` untuk fetch jumlah kasus per kabupaten dengan domain filter tahun dan kabupaten.

### Asset Loading Order (`__manifest__.py`)
Urutan load asset penting — `dashboard_map.js` didaftarkan **dua kali** (sekali di awal, sekali di akhir setelah layer modules). Perlu diperhatikan jika ada konflik.

---

## 9. Status Fitur dan Roadmap

### Selesai ✅
- Model data dan view semua entitas
- Import wizard LP A dan B
- Dashboard peta + mode Umum
- Mode Kriminal dengan choropleth + legend + drilldown Kecamatan
- Widget lat/lon picker
- Widget GeoJSON polygon editor

### Belum Selesai / Coming Soon 🚧
- **Peta Lalu Lintas** — perlu model `petadigi.lalu_lintas` atau mapping ke kategori
- **Peta Bencana** — perlu model `petadigi.bencana`
- **Lokasi Penting** — perlu model `petadigi.lokasi_penting`
- **Role-based access** — saat ini semua user dapat full CRUD
- **Export/Report** — belum ada fitur export ke PDF atau Excel

---

## 10. Konvensi Kode

- **Bahasa UI**: Indonesia (label, menu, field names)
- **Bahasa kode**: Inggris (variable names, method names)
- **Komentar**: Indonesia/Inggris campuran
- **Model prefix**: selalu `petadigi.`
- **File naming JS**: `dashboard_layer_<nama>.js` untuk tiap mode peta
- **GeoJSON storage**: disimpan sebagai Text di field `geometry` pada model geografis

---

## 11. Catatan Kompatibilitas Odoo 19

- Menggunakan **Owl framework** (bukan legacy Widget) untuk semua komponen JS
- Menggunakan `this.env.services.orm` (bukan `rpc.query`) untuk ORM calls
- QWeb templates dalam format Owl (`t-component`, `t-on-*`, `useState`)
- Asset bundling melalui `web.assets_backend` di `__manifest__.py`
- `application: True` → modul muncul sebagai app utama di menu Odoo

---

## 12. Development Environment

- **OS**: Windows 11
- **Odoo path**: `C:\Program Files\Odoo 19.0.20251203\server\`
- **Module path**: `...\server\odoo\addons\petadigi\`
- **Git branch**: `main`
- **Shell**: PowerShell (Windows)

---

*Dokumen ini dibuat pada 2026-06-06 sebagai briefing konteks untuk sesi Claude baru.*
