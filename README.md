# PetaDigi — Sistem Informasi Peta Digital Kepolisian

> Modul Odoo 19 untuk manajemen data dan visualisasi peta interaktif kepolisian, dilengkapi sistem monitoring kegiatan lapangan berbasis QR code.

---

## Fitur Utama

### 1. Dashboard Peta Interaktif
- **5 mode peta**: Umum, Kriminalitas, Kasus Menonjol (KAM), Bencana, Lalu Lintas, Lokasi Penting
- **Choropleth wilayah** berbasis GeoJSON dengan gradasi warna berdasarkan jumlah kasus
- **Drill-down 3 level**: Kabupaten → Kecamatan → Desa/Kelurahan
- **KPI cards & grafik ECharts** otomatis terupdate saat drill-down atau filter berubah
- **Filter lengkap**: tahun, kabupaten, status, kategori, sub kategori, rentang tanggal
- **Overlay lokasi penting**: panel checkbox floating tampil di semua mode peta
- **Marker clustering** menggunakan Leaflet.markercluster

### 2. Manajemen Data Kepolisian
| Entitas | Field Kunci |
|---|---|
| Kriminalitas | No LP, jenis LP (A/B), tanggal, koordinat, kategori, sub kategori, modus, status perkara |
| Kasus Menonjol | Kategori, modus operandi, jenis TKP, state aktif/non aktif |
| Bencana | Kategori, penyebab, tindak lanjut |
| Lalu Lintas | Jenis jalan, kategori, rentang waktu kejadian |
| Lokasi Penting | Koordinat, kontak, kategori, alamat lengkap |

Semua entitas terintegrasi dengan hierarki wilayah: **Polres → Polsek → Kabupaten → Kecamatan → Desa** (masing-masing menyimpan GeoJSON geometry untuk tampilan peta).

### 3. Import Otomatis Dokumen LP
- Parse file `.docx` LP A dan LP B secara otomatis menggunakan `python-docx`
- **Wizard 2 langkah**: Upload → Preview & Koreksi → Simpan
- Pre-fill otomatis polres/polsek/kabupaten berdasarkan akun yang login
- **Peta Leaflet interaktif** di step preview untuk menentukan koordinat kejadian
- Dokumen asli tersimpan sebagai attachment dan tercatat di chatter

### 4. Cooling System — Monitoring Kegiatan Lapangan
- **Jenis Laporan** dengan QR code + URL publik unik per jenis laporan
- **Form publik mobile-friendly** di `/giat/<token>` — petugas mengisi tanpa perlu login Odoo
- Fitur form publik: pilih polres/polsek, isi kegiatan, upload foto (auto-resize), koordinat GPS otomatis, preview peta
- **Dashboard Monitoring Giat**: KPI, grafik tren harian, tabel ringkasan polres/polsek, peta cluster titik sebaran giat

---

## Akses Berbasis Peran

| Peran | Kriminalitas & KAM | Bencana / Lalin / Lokasi | Import LP | Dashboard Peta |
|---|---|---|---|---|
| Admin | Full CRUD | Full CRUD | ✅ | ✅ |
| Subdit | Baca + Tulis | Baca saja | — | ✅ |
| Polres | CRUD (wilayahnya) | CRUD (wilayahnya) | ✅ pre-fill | ✅ |
| Polsek | CRUD (wilayahnya) | CRUD (wilayahnya) | ✅ pre-fill + terkunci | ✅ |

> Polres: field polres terkunci, polsek bisa dipilih dari lingkup polresnya.  
> Polsek: field polres dan polsek keduanya terkunci sesuai login.

---

## Informasi Modul

| Field | Detail |
|---|---|
| **Nama** | PetaDigi |
| **Versi** | 19.0.2.0.0 |
| **Kategori** | Tools |
| **Author** | Cv Sel Studio |
| **Website** | [selstudio.id](https://selstudio.id) |
| **Odoo** | 19.0 |
| **Lisensi** | LGPL-3 |
| **Dependensi** | `base`, `web`, `mail` |

---

## Teknologi

- **Frontend**: OWL (Odoo Web Library), Leaflet.js, ECharts, Flatpickr
- **Marker cluster**: Leaflet.markercluster v1.5.3
- **Parser dokumen**: python-docx
- **GeoJSON**: geometri wilayah Indonesia (kabupaten/kecamatan/desa)

---

## Instalasi

1. Copy folder `petadigi` ke direktori addons Odoo:
   ```
   /path/to/odoo/addons/petadigi
   ```
2. Install dependensi Python:
   ```bash
   pip install python-docx
   ```
3. Restart server Odoo:
   ```bash
   python odoo-bin -c odoo.conf
   ```
4. Aktifkan **Developer Mode** di Odoo.
5. Buka menu **Apps** → **Update Apps List** → cari **PetaDigi** → **Install**.

---

## Struktur Modul

```
petadigi/
├── __manifest__.py
├── __init__.py
├── models/                     # 24 model data
│   ├── kriminalitas.py
│   ├── kasus_menonjol.py
│   ├── bencana.py
│   ├── lalu_lintas.py
│   ├── lokasi_penting.py
│   ├── jenis_laporan.py        # Cooling System
│   ├── hasil_giat.py           # Cooling System
│   ├── polres.py / polsek.py
│   ├── kabupaten.py / kecamatan.py / desa.py
│   ├── res_users.py            # Extend user: polres_id, polsek_id, subdit_id
│   └── ...                     # Lookup tables (kategori, modus, jenis TKP, dll)
├── wizard/
│   ├── import_lp_wizard.py     # Wizard import dokumen LP
│   └── import_lp_wizard_views.xml
├── utils/
│   ├── parser_lp_a.py          # Parser dokumen LP A (.docx)
│   └── parser_lp_b.py          # Parser dokumen LP B (.docx)
├── controllers/
│   └── giat_public.py          # Route publik form giat (/giat/<token>)
├── security/
│   ├── security.xml            # Group definitions
│   └── ir.model.access.csv
├── views/                      # 29 file XML views
└── static/
    ├── lib/
    │   ├── leaflet/            # Leaflet.js + Editable plugin
    │   ├── leaflet-markercluster/
    │   ├── flatpickr/
    │   └── echart/
    └── src/
        ├── js/                 # 18 file JavaScript modular
        ├── css/                # 5 file CSS
        └── xml/                # QWeb templates
```

---

## Grafik per Mode Peta

| Mode | Chart |
|---|---|
| Kriminal | Bar kabupaten, Donut kategori, Bar TKP, Bar sub kategori, Line tren bulanan, Line waktu, Line data tahunan, Line waktu Curat/Curas/Curanmor |
| KAM | Bar kabupaten, Donut kategori, Bar modus operandi, Pie jenis TKP, Line data tahunan |
| Bencana | Bar kabupaten, Donut kategori |
| Lalin | Bar kabupaten, Donut kategori, Pie jenis jalan, Line rentang waktu |
| Lokasi Penting | Bar kabupaten, Donut kategori |

---

## Lisensi

© 2025 [Cv Sel Studio](https://selstudio.id). Licensed under [LGPL-3](https://www.gnu.org/licenses/lgpl-3.0.html).
