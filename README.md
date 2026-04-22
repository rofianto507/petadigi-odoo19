# PetaDigi - Digital Map Module for Odoo 19

![PetaDigi](static/description/icon.png)

## Deskripsi

**PetaDigi** adalah modul peta digital untuk Odoo yang menyediakan fitur pemetaan interaktif dan layanan geolokasi. Modul ini dirancang untuk memudahkan visualisasi data geografis secara langsung di dalam platform Odoo.

## Informasi Modul

| Field        | Detail                                      |
|--------------|---------------------------------------------|
| **Nama**     | PetaDigi                                    |
| **Versi**    | 1.0.0                                       |
| **Kategori** | Tools                                       |
| **Author**   | Cv Sel Studio                               |
| **Website**  | [selstudio.id](https://selstudio.id)        |
| **Odoo**     | 19.0                                        |

## Fitur

- 🗺️ Peta interaktif berbasis **Leaflet.js**
- 📍 Widget peta untuk data Kabupaten, Kecamatan, dan Desa
- 🚔 Manajemen data wilayah Polres & Polsek
- 🔴 Kategori data: Kriminal, Bencana, Kamtibmas, Lalu Lintas, Lokasi
- 📄 Manajemen sumber dokumen & modus operandi
- 🖊️ Dukungan gambar/edit geometri peta (GeoJSON)

## Dependensi

- `base`
- `web`

## Instalasi

1. Copy folder `petadigi` ke dalam direktori addons Odoo Anda:
   ```
   /path/to/odoo/addons/petadigi
   ```
2. Restart server Odoo:
   ```bash
   python odoo-bin -c odoo.conf
   ```
3. Aktifkan **Developer Mode** di Odoo.
4. Buka menu **Apps**, klik **Update Apps List**.
5. Cari **PetaDigi** dan klik **Install**.

## Struktur Modul

```
petadigi/
├── controllers/        # HTTP controllers
├── models/             # Model data (Polres, Kabupaten, Kecamatan, dll)
├── security/           # Hak akses (ir.model.access.csv)
├── static/
│   ├── lib/leaflet/    # Library Leaflet.js
│   └── src/
│       ├── js/         # Widget JavaScript
│       ├── css/        # Stylesheet
│       └── xml/        # Template QWeb
├── views/              # Tampilan XML Odoo
├── __manifest__.py
└── __init__.py
```

## Lisensi

© 2024 [Cv Sel Studio](https://selstudio.id). All rights reserved.
