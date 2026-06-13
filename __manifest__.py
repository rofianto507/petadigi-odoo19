{
    'name': 'PetaDigi',
    'version': '19.0.2.0.0',
    'summary': 'Sistem Informasi Peta Digital Kepolisian — Dashboard Peta, Import LP, dan Monitoring Kegiatan Lapangan.',
    'description': """
PetaDigi adalah modul Odoo untuk manajemen data dan visualisasi peta interaktif kepolisian.

FITUR UTAMA:

1. Dashboard Peta Interaktif (Leaflet.js + GeoJSON)
   - 5 mode peta: Umum, Kriminalitas, Kasus Menonjol (KAM), Bencana, Lalu Lintas, dan Lokasi Penting
   - Choropleth wilayah (kabupaten → kecamatan → desa) dengan drill-down 3 level
   - KPI cards dan grafik ECharts otomatis update mengikuti drill-down dan filter aktif
   - Filter: tahun, kabupaten, status, kategori, sub kategori, rentang tanggal (flatpickr)
   - Overlay lokasi penting (panel checkbox floating) tampil di semua mode peta
   - Marker clustering (Leaflet.markercluster) untuk titik kejadian

2. Manajemen Data Kepolisian
   - Kriminalitas (LP A / LP B): no LP, tanggal, koordinat, kategori, sub kategori, status perkara
   - Kasus Menonjol (KAM): kategori, modus operandi, jenis TKP
   - Bencana: kategori, penyebab, tindak lanjut
   - Lalu Lintas: jenis jalan, kategori, rentang waktu
   - Lokasi Penting: koordinat, kontak, kategori
   - Hierarki wilayah: Polres → Polsek → Kabupaten → Kecamatan → Desa (dengan GeoJSON geometry)

3. Import Otomatis Dokumen LP
   - Parse file .docx LP A dan LP B secara otomatis
   - Wizard 2 langkah: upload → preview + koreksi → simpan
   - Pre-fill otomatis polres/polsek/kabupaten berdasarkan akun login
   - Peta interaktif di step preview untuk menentukan koordinat kejadian
   - Akses bertingkat: admin bebas pilih, polres terkunci ke polresnya, polsek terkunci penuh
   - Dokumen asli tersimpan sebagai attachment di chatter record kriminalitas

4. Cooling System — Monitoring Kegiatan Lapangan
   - Jenis Laporan dengan QR code + public URL unik per jenis laporan
   - Form publik mobile-friendly di /giat/<token> (tanpa login Odoo)
   - Petugas isi form: NRP, nama, polres/polsek, kegiatan, foto, koordinat GPS
   - Upload foto dengan resize otomatis (max 1280px, JPEG 82%)
   - Dashboard Monitoring Giat: KPI, grafik tren, tabel ringkasan polres/polsek, peta cluster

AKSES BERBASIS PERAN:
   - Admin: akses penuh semua data
   - Subdit: baca + tulis kriminalitas dan KAM, baca data lainnya
   - Polres: data wilayah polresnya, dapat akses wizard import LP
   - Polsek: data wilayah polseknya, dapat akses wizard import LP

TEKNOLOGI:
   - Frontend: OWL (Odoo Web Library), Leaflet.js, ECharts, Flatpickr
   - Marker cluster: Leaflet.markercluster v1.5.3
   - Parser dokumen: python-docx
   - Platform: Odoo 19.0
""",
    'category': 'Tools',
    'author': 'Cv Sel Studio',
    'website': 'https://selstudio.id',
    'depends': ['base', 'web','mail'],
    'data': [
        'security/security.xml',
        'security/ir.model.access.csv',
        'data/sequence_data.xml',
        'views/polres_views.xml',
        'views/polsek_views.xml',
        'views/kabupaten_views.xml',
        'views/kecamatan_views.xml',
        'views/desa_views.xml',
        'views/sumber_dokumen_views.xml',
        'views/kategori_kriminal_views.xml',
        'views/sub_kategori_kriminal_views.xml',
        'views/kategori_bencana_views.xml',
        'views/kategori_kamtibmas_views.xml',
        'views/kategori_lalu_lintas_views.xml',
        'views/kategori_lokasi_views.xml',
        'views/jenis_jalan_views.xml',
        'views/modus_operandi_views.xml',
        'views/jenis_tkp_views.xml',
        'views/dashboard_views.xml',
        'views/subdit_views.xml',
        'wizard/import_lp_wizard_views.xml',
        'wizard/tindak_lanjut_wizard_views.xml',
        'views/kriminalitas_views.xml',
        'views/kasus_menonjol_views.xml',
        'views/bencana_views.xml',
        'views/lalu_lintas_views.xml',
        'views/lokasi_penting_views.xml',
        'views/sub_status_perkara_views.xml',
        'views/jenis_laporan_views.xml',
        'views/hasil_giat_views.xml',
        'views/giat_form_template.xml',
        'views/monitoring_giat_views.xml',
        'views/res_users_views.xml',
        'views/menu.xml',
        'views/menu_restrictions.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'petadigi/static/src/css/login.css',
        ],
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
            'petadigi/static/src/js/kabupaten_map_widget.js',
            'petadigi/static/src/xml/geojson_map_widget.xml',
            'petadigi/static/src/css/backend.css',
            'petadigi/static/src/css/kabupaten_map_widget.css',
            'petadigi/static/src/js/latlon_leaflet_widget.js',
            'petadigi/static/src/xml/latlon_leaflet_widget.xml',
            'petadigi/static/src/css/latlon_leaflet_widget.css',
            # Dashboard modular
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
            'petadigi/static/src/js/dashboard_map.js',
            # Monitoring Giat dashboard
            'petadigi/static/src/css/dashboard_monitoring_giat.css',
            'petadigi/static/src/xml/dashboard_monitoring_giat.xml',
            'petadigi/static/src/js/dashboard_monitoring_giat.js',
        ],
    },
    'installable': True,
    'application': True,
    'sequence': 1,
}