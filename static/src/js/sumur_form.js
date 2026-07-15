(function () {
    'use strict';

    const { Component, useState, mount, xml, onMounted } = owl;

    class SumurFormApp extends Component {
        static template = xml/* xml */`
            <div class="sf-root">

                <!-- ===== SUCCESS SCREEN ===== -->
                <div t-att-class="'sf-success' + (state.submitted ? '' : ' sf-hidden')">
                    <div class="sf-success-card">
                        <div class="sf-success-icon">✓</div>
                        <h2 class="sf-success-title">Data Terkirim</h2>
                        <div class="sf-success-code" t-out="state.submitCode"/>
                        <p class="sf-success-msg">
                            Data sumur minyak berhasil dikirim dan tersimpan di sistem.
                        </p>
                        <div class="sf-success-actions">
                            <button class="sf-btn sf-btn-tonal sf-btn-block" t-on-click="resetForm">
                                Input Data Baru
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ===== FORM ===== -->
                <div t-att-class="state.submitted ? 'sf-hidden' : ''">

                    <!-- Top App Bar -->
                    <div class="sf-appbar">
                        <div class="sf-appbar-icon">🛢</div>
                        <div class="sf-appbar-content">
                            <div class="sf-appbar-title" t-out="initData.kategori.name"/>
                            <div class="sf-appbar-sub">Input Data Sumur Minyak</div>
                        </div>
                    </div>

                    <div class="sf-body">

                        <!-- Identitas Surveyor -->
                        <div class="sf-section">
                            <div class="sf-section-label">Identitas Surveyor</div>
                            <div class="sf-card">
                                <div class="sf-card-body">

                                    <div t-att-class="'sf-field' + (state.errors.nama_surveyor ? ' has-error' : '')">
                                        <label class="sf-label">
                                            Nama Surveyor
                                            <span class="sf-req">*</span>
                                        </label>
                                        <input class="sf-input" type="text"
                                               t-att-value="state.nama_surveyor"
                                               t-on-input="onNamaSurveyorInput"
                                               placeholder="Nama lengkap surveyor"/>
                                        <div t-if="state.errors.nama_surveyor" class="sf-errmsg"
                                             t-out="state.errors.nama_surveyor"/>
                                    </div>

                                    <div class="sf-field">
                                        <label class="sf-label">
                                            No. HP
                                            <span class="sf-opt">Opsional</span>
                                        </label>
                                        <input class="sf-input" type="tel" inputmode="numeric"
                                               t-att-value="state.hp_surveyor"
                                               t-on-input="onHpSurveyorInput"
                                               placeholder="Nomor HP surveyor"/>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <!-- Informasi Sumur -->
                        <div class="sf-section">
                            <div class="sf-section-label">Informasi Sumur</div>
                            <div class="sf-card">
                                <div class="sf-card-body">

                                    <div t-att-class="'sf-field' + (state.errors.nama_sumur ? ' has-error' : '')">
                                        <label class="sf-label">
                                            Nama Sumur
                                            <span class="sf-req">*</span>
                                        </label>
                                        <input class="sf-input" type="text"
                                               t-att-value="state.nama_sumur"
                                               t-on-input="onNamaSumurInput"
                                               placeholder="Nama atau identifikasi sumur"/>
                                        <div t-if="state.errors.nama_sumur" class="sf-errmsg"
                                             t-out="state.errors.nama_sumur"/>
                                    </div>

                                    <!-- Sumur Masyarakat -->
                                    <t t-if="initData.kategori.kode === 'sumur_masyarakat'">
                                        <div class="sf-field">
                                            <label class="sf-label">Minyak Produksi <span class="sf-opt">Opsional</span></label>
                                            <input class="sf-input" type="number" inputmode="decimal" step="any" min="0"
                                                   t-att-value="state.minyak_produksi"
                                                   t-on-input="ev => state.minyak_produksi = ev.target.value"
                                                   placeholder="Jumlah minyak produksi (liter)"/>
                                        </div>
                                        <div class="sf-field">
                                            <label class="sf-label">Minyak Keluar <span class="sf-opt">Opsional</span></label>
                                            <input class="sf-input" type="number" inputmode="decimal" step="any" min="0"
                                                   t-att-value="state.minyak_keluar"
                                                   t-on-input="ev => state.minyak_keluar = ev.target.value"
                                                   placeholder="Jumlah minyak keluar (liter)"/>
                                        </div>
                                    </t>
                                    <!-- BKU -->
                                    <t t-elif="initData.kategori.kode === 'bku'">
                                        <div class="sf-field">
                                            <label class="sf-label">Minyak Masuk <span class="sf-opt">Opsional</span></label>
                                            <input class="sf-input" type="number" inputmode="decimal" step="any" min="0"
                                                   t-att-value="state.minyak_masuk"
                                                   t-on-input="ev => state.minyak_masuk = ev.target.value"
                                                   placeholder="Jumlah minyak masuk (liter)"/>
                                        </div>
                                        <div class="sf-field">
                                            <label class="sf-label">Minyak Tersedia <span class="sf-opt">Opsional</span></label>
                                            <input class="sf-input" type="number" inputmode="decimal" step="any" min="0"
                                                   t-att-value="state.minyak_tersedia"
                                                   t-on-input="ev => state.minyak_tersedia = ev.target.value"
                                                   placeholder="Jumlah minyak tersedia (liter)"/>
                                        </div>
                                        <div class="sf-field">
                                            <label class="sf-label">Minyak Keluar <span class="sf-opt">Opsional</span></label>
                                            <input class="sf-input" type="number" inputmode="decimal" step="any" min="0"
                                                   t-att-value="state.minyak_keluar"
                                                   t-on-input="ev => state.minyak_keluar = ev.target.value"
                                                   placeholder="Jumlah minyak keluar (liter)"/>
                                        </div>
                                    </t>
                                    <!-- K3S -->
                                    <t t-elif="initData.kategori.kode === 'k3s'">
                                        <div class="sf-field">
                                            <label class="sf-label">Minyak Masuk <span class="sf-opt">Opsional</span></label>
                                            <input class="sf-input" type="number" inputmode="decimal" step="any" min="0"
                                                   t-att-value="state.minyak_masuk"
                                                   t-on-input="ev => state.minyak_masuk = ev.target.value"
                                                   placeholder="Jumlah minyak masuk (liter)"/>
                                        </div>
                                        <div class="sf-field">
                                            <label class="sf-label">Minyak Ditolak <span class="sf-opt">Opsional</span></label>
                                            <input class="sf-input" type="number" inputmode="decimal" step="any" min="0"
                                                   t-att-value="state.minyak_ditolak"
                                                   t-on-input="ev => state.minyak_ditolak = ev.target.value"
                                                   placeholder="Jumlah minyak ditolak (liter)"/>
                                        </div>
                                    </t>

                                </div>
                            </div>
                        </div>

                        <!-- Lokasi Wilayah -->
                        <div class="sf-section">
                            <div class="sf-section-label">Lokasi Wilayah</div>
                            <div class="sf-card">
                                <div class="sf-card-body">

                                    <div t-att-class="'sf-field' + (state.errors.kabupaten_id ? ' has-error' : '')">
                                        <label class="sf-label">
                                            Kabupaten/Kota
                                            <span class="sf-req">*</span>
                                        </label>
                                        <select class="sf-input sf-select" t-on-change="onKabupatenChange">
                                            <option value="">Pilih Kabupaten/Kota</option>
                                            <t t-foreach="initData.kabupaten_list" t-as="kab" t-key="kab.id">
                                                <option t-att-value="kab.id"
                                                        t-att-selected="state.kabupaten_id === kab.id"
                                                        t-out="kab.name"/>
                                            </t>
                                        </select>
                                        <div t-if="state.errors.kabupaten_id" class="sf-errmsg"
                                             t-out="state.errors.kabupaten_id"/>
                                    </div>

                                    <div class="sf-field">
                                        <label class="sf-label">
                                            Kecamatan
                                            <span class="sf-opt">Opsional</span>
                                        </label>
                                        <select class="sf-input sf-select"
                                                t-att-disabled="!state.kabupaten_id || state.loadingKecamatan"
                                                t-on-change="onKecamatanChange">
                                            <option value="">
                                                <t t-if="state.loadingKecamatan">Memuat...</t>
                                                <t t-else="">Pilih Kecamatan</t>
                                            </option>
                                            <t t-foreach="state.kecamatan_list" t-as="kec" t-key="kec.id">
                                                <option t-att-value="kec.id"
                                                        t-att-selected="state.kecamatan_id === kec.id"
                                                        t-out="kec.name"/>
                                            </t>
                                        </select>
                                    </div>

                                    <div class="sf-field">
                                        <label class="sf-label">
                                            Desa/Kelurahan
                                            <span class="sf-opt">Opsional</span>
                                        </label>
                                        <select class="sf-input sf-select"
                                                t-att-disabled="!state.kecamatan_id || state.loadingDesa"
                                                t-on-change="onDesaChange">
                                            <option value="">
                                                <t t-if="state.loadingDesa">Memuat...</t>
                                                <t t-else="">Pilih Desa/Kelurahan</t>
                                            </option>
                                            <t t-foreach="state.desa_list" t-as="desa" t-key="desa.id">
                                                <option t-att-value="desa.id"
                                                        t-att-selected="state.desa_id === desa.id"
                                                        t-out="desa.name"/>
                                            </t>
                                        </select>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <!-- Lokasi GPS + Map -->
                        <div class="sf-section">
                            <div class="sf-section-label">Lokasi GPS</div>
                            <div class="sf-card">
                                <div class="sf-card-body">

                                    <button class="sf-btn sf-btn-tonal sf-btn-block"
                                            t-on-click="getGPS"
                                            t-att-disabled="state.gpsLoading">
                                        <t t-if="state.gpsLoading">Mengambil lokasi GPS...</t>
                                        <t t-else="">Perbarui Lokasi GPS</t>
                                    </button>

                                    <div t-if="state.gpsError"
                                         class="sf-location-status sf-location-status--err">
                                        <div class="sf-location-dot"/>
                                        <span t-out="state.gpsError"/>
                                    </div>
                                    <div t-elif="state.latitude"
                                         class="sf-location-status sf-location-status--ok">
                                        <div class="sf-location-dot"/>
                                        <span t-out="state.latitude"/>, <span t-out="state.longitude"/>
                                    </div>
                                    <div t-elif="state.gpsLoading"
                                         class="sf-location-status sf-location-status--idle">
                                        <div class="sf-location-dot"/>
                                        <span>Mengambil koordinat GPS...</span>
                                    </div>
                                    <div t-else=""
                                         class="sf-location-status sf-location-status--idle">
                                        <div class="sf-location-dot"/>
                                        <span>Menunggu izin akses GPS</span>
                                    </div>

                                    <!-- Map stays in DOM to avoid Leaflet reinit -->
                                    <div id="sf-map" class="sf-map"/>

                                </div>
                            </div>
                        </div>

                        <!-- Foto Dokumentasi -->
                        <div class="sf-section">
                            <div class="sf-section-label">Foto Dokumentasi</div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <div class="sf-foto-btns">
                                        <label class="sf-btn sf-btn-outlined">
                                            Kamera
                                            <input type="file" accept="image/*" capture="environment"
                                                   class="sf-file-hidden" t-on-change="handleFoto"/>
                                        </label>
                                        <label class="sf-btn sf-btn-outlined">
                                            Galeri
                                            <input type="file" accept="image/*"
                                                   class="sf-file-hidden" t-on-change="handleFoto"/>
                                        </label>
                                    </div>
                                    <div t-if="state.fotoPreview" class="sf-foto-preview">
                                        <img t-att-src="state.fotoPreview" class="sf-preview-img"
                                             alt="Foto sumur"/>
                                        <div class="sf-foto-meta">
                                            <t t-if="state.fotoLoading">
                                                <span class="sf-foto-size sf-foto-size--loading">
                                                    ⏳ Mengompresi...
                                                </span>
                                            </t>
                                            <t t-elif="state.fotoSizeLabel">
                                                <span t-att-class="'sf-foto-size ' + (state.fotoCompressed ? 'sf-foto-size--ok' : 'sf-foto-size--info')"
                                                      t-out="state.fotoSizeLabel"/>
                                            </t>
                                            <button class="sf-btn sf-btn-text" t-on-click="removeFoto">
                                                Hapus Foto
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Submit area -->
                        <div class="sf-submit-area">
                            <div t-if="state.submitError" class="sf-error-banner">
                                <div class="sf-error-banner-icon"/>
                                <span t-out="state.submitError"/>
                            </div>
                            <button class="sf-btn sf-btn-filled sf-btn-submit"
                                    t-on-click="submit"
                                    t-att-disabled="state.submitting || state.gpsLoading">
                                <t t-if="state.submitting">Mengirim data...</t>
                                <t t-elif="state.gpsLoading">Menunggu lokasi GPS...</t>
                                <t t-else="">Kirim Data Sumur</t>
                            </button>
                            <div class="sf-footer">PetaDigi · Sumur Minyak</div>
                        </div>

                    </div>
                </div>

            </div>
        `;

        _loadCache() {
            try {
                return JSON.parse(localStorage.getItem('petadigi_sumur_surveyor') || '{}');
            } catch (_) { return {}; }
        }

        _saveCache() {
            try {
                localStorage.setItem('petadigi_sumur_surveyor', JSON.stringify({
                    nama_surveyor: this.state.nama_surveyor,
                    hp_surveyor: this.state.hp_surveyor,
                }));
            } catch (_) {}
        }

        async _getRecaptchaToken() {
            const siteKey = this.initData.recaptcha_site_key;
            if (!siteKey) return '';
            const loaded = await new Promise((resolve) => {
                if (window.grecaptcha) { resolve(true); return; }
                const t0 = Date.now();
                const poll = () => {
                    if (window.grecaptcha) { resolve(true); return; }
                    if (Date.now() - t0 > 5000) { resolve(false); return; }
                    setTimeout(poll, 100);
                };
                poll();
            });
            if (!loaded) return '';
            try {
                return await Promise.race([
                    new Promise((resolve) => {
                        grecaptcha.ready(async () => {
                            try {
                                const token = await grecaptcha.execute(siteKey, { action: 'submit_sumur' });
                                resolve(token);
                            } catch (_) { resolve(''); }
                        });
                    }),
                    new Promise((resolve) => setTimeout(() => resolve(''), 8000)),
                ]);
            } catch (_) { return ''; }
        }

        setup() {
            this.initData = JSON.parse(document.getElementById('sumur-app').dataset.init);
            const cache = this._loadCache();
            this.state = useState({
                nama_surveyor: cache.nama_surveyor || '',
                hp_surveyor: cache.hp_surveyor || '',
                nama_sumur: '',
                minyak_produksi: '', minyak_masuk: '', minyak_tersedia: '',
                minyak_keluar: '', minyak_ditolak: '',
                kabupaten_id: null,
                kecamatan_id: null,
                desa_id: null,
                kecamatan_list: [],
                desa_list: [],
                loadingKecamatan: false,
                loadingDesa: false,
                latitude: null,
                longitude: null,
                gpsLoading: false,
                gpsError: null,
                foto: null,
                fotoPreview: null,
                fotoSizeLabel: null,
                fotoCompressed: false,
                fotoLoading: false,
                submitting: false,
                submitted: false,
                submitCode: null,
                submitError: null,
                errors: {},
            });

            this._map = null;
            this._marker = null;

            onMounted(() => {
                this._initMap();
                this.getGPS();
            });
        }

        /* ------ Leaflet map ------ */
        _initMap() {
            if (this._map || !window.L) return;
            const el = document.getElementById('sf-map');
            if (!el) return;

            this._markerIcon = L.icon({
                iconUrl: '/petadigi/static/lib/leaflet/images/marker-icon.png',
                shadowUrl: '/petadigi/static/lib/leaflet/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
            });

            this._map = L.map('sf-map', {
                center: [-2.5, 118.0],
                zoom: 5,
                zoomControl: true,
                attributionControl: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(this._map);
        }

        _updateMapMarker(lat, lng) {
            if (!this._map) return;
            const latlng = [parseFloat(lat), parseFloat(lng)];

            if (this._marker) {
                this._marker.setLatLng(latlng);
            } else {
                this._marker = L.marker(latlng, {
                    icon: this._markerIcon,
                    title: 'Lokasi Sumur',
                    draggable: true,
                }).addTo(this._map);

                this._marker.on('dragend', (e) => {
                    const pos = e.target.getLatLng();
                    this.state.latitude = pos.lat.toFixed(6);
                    this.state.longitude = pos.lng.toFixed(6);
                    this._marker.bindPopup(
                        '<b>Lokasi Sumur</b><br>' +
                        this.state.latitude + ', ' + this.state.longitude
                    ).openPopup();
                });
            }

            this._marker.bindPopup(
                '<b>Lokasi Sumur</b><br>' +
                parseFloat(lat).toFixed(6) + ', ' + parseFloat(lng).toFixed(6) +
                '<br><small style="color:#888">Geser marker untuk menyesuaikan</small>'
            );
            this._map.setView(latlng, 16, { animate: true });
            this._marker.openPopup();
        }

        /* ------ Field handlers ------ */
        onNamaSurveyorInput(ev) { this.state.nama_surveyor = ev.target.value; }
        onHpSurveyorInput(ev) { this.state.hp_surveyor = ev.target.value; }
        onNamaSumurInput(ev) { this.state.nama_sumur = ev.target.value; }
        onJumlahMinyakInput(ev) { this.state.jumlah_minyak = ev.target.value; }

        async onKabupatenChange(ev) {
            const kabupatenId = parseInt(ev.target.value) || null;
            this.state.kabupaten_id = kabupatenId;
            this.state.kecamatan_id = null;
            this.state.kecamatan_list = [];
            this.state.desa_id = null;
            this.state.desa_list = [];

            if (!kabupatenId) return;

            this.state.loadingKecamatan = true;
            try {
                const resp = await this._jsonRpc('/sumur/api/kecamatan', {
                    kabupaten_id: kabupatenId,
                    token: this.initData.token,
                });
                this.state.kecamatan_list = resp.result || [];
            } catch (_) {} finally {
                this.state.loadingKecamatan = false;
            }
        }

        async onKecamatanChange(ev) {
            const kecamatanId = parseInt(ev.target.value) || null;
            this.state.kecamatan_id = kecamatanId;
            this.state.desa_id = null;
            this.state.desa_list = [];

            if (!kecamatanId) return;

            this.state.loadingDesa = true;
            try {
                const resp = await this._jsonRpc('/sumur/api/desa', {
                    kecamatan_id: kecamatanId,
                    token: this.initData.token,
                });
                this.state.desa_list = resp.result || [];
            } catch (_) {} finally {
                this.state.loadingDesa = false;
            }
        }

        onDesaChange(ev) {
            this.state.desa_id = parseInt(ev.target.value) || null;
        }

        /* ------ GPS ------ */
        getGPS() {
            this._requestGPSAndWait();
        }

        _requestGPSAndWait() {
            return new Promise((resolve) => {
                if (!navigator.geolocation) {
                    this.state.gpsError = 'GPS tidak tersedia di perangkat ini';
                    resolve(false);
                    return;
                }
                if (this.state.gpsLoading) { resolve(false); return; }

                this.state.gpsLoading = true;
                this.state.gpsError = null;

                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const lat = pos.coords.latitude.toFixed(6);
                        const lng = pos.coords.longitude.toFixed(6);
                        this.state.latitude = lat;
                        this.state.longitude = lng;
                        this.state.gpsLoading = false;
                        this._updateMapMarker(lat, lng);
                        resolve(true);
                    },
                    (err) => {
                        this.state.gpsError = 'Gagal mendapat lokasi: ' + (err.message || 'Periksa izin GPS browser');
                        this.state.gpsLoading = false;
                        resolve(false);
                    },
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                );
            });
        }

        /* ------ Foto ------ */
        _formatSize(bytes) {
            if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
            return Math.round(bytes / 1024) + ' KB';
        }

        async handleFoto(ev) {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            if (file.size > 20 * 1024 * 1024) {
                this.state.submitError = 'File foto terlalu besar (maks 20 MB). Pilih foto lain.';
                ev.target.value = '';
                return;
            }
            this.state.fotoPreview = URL.createObjectURL(file);
            this.state.fotoSizeLabel = this._formatSize(file.size);
            this.state.fotoCompressed = false;
            this.state.fotoLoading = true;
            this.state.submitError = null;
            this.state.foto = null;
            try {
                const b64 = await this._resizeImage(file);
                if (!b64) throw new Error('canvas kosong');
                this.state.foto = b64;
                const compressedBytes = Math.round(b64.length * 0.75);
                const wasCompressed = compressedBytes < file.size * 0.95;
                this.state.fotoCompressed = wasCompressed;
                this.state.fotoSizeLabel = wasCompressed
                    ? `${this._formatSize(file.size)} → ${this._formatSize(compressedBytes)}`
                    : this._formatSize(compressedBytes);
            } catch (err) {
                console.error('[PetaDigi] resize gagal:', err);
                this.state.foto = null;
                this.state.fotoPreview = null;
                this.state.fotoSizeLabel = null;
                this.state.submitError = 'Gagal memproses foto. Coba pilih foto lain.';
                ev.target.value = '';
            } finally {
                this.state.fotoLoading = false;
            }
        }

        _resizeImage(file) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    const MAX_W = 960;
                    if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);

                    for (const q of [0.75, 0.60, 0.45]) {
                        const b64 = canvas.toDataURL('image/jpeg', q).split(',')[1];
                        if (b64 && b64.length < 500_000) { resolve(b64); return; }
                    }
                    resolve(canvas.toDataURL('image/jpeg', 0.45).split(',')[1]);
                };
                img.onerror = reject;
                img.src = url;
            });
        }

        removeFoto() {
            if (this.state.fotoPreview) URL.revokeObjectURL(this.state.fotoPreview);
            this.state.foto = null;
            this.state.fotoPreview = null;
            this.state.fotoSizeLabel = null;
            this.state.fotoCompressed = false;
            this.state.fotoLoading = false;
        }

        /* ------ Validation ------ */
        _validate() {
            const errors = {};
            if (!this.state.nama_surveyor.trim()) errors.nama_surveyor = 'Nama surveyor wajib diisi';
            if (!this.state.nama_sumur.trim()) errors.nama_sumur = 'Nama sumur wajib diisi';
            if (!this.state.kabupaten_id) errors.kabupaten_id = 'Pilih Kabupaten/Kota terlebih dahulu';
            this.state.errors = errors;
            return Object.keys(errors).length === 0;
        }

        /* ------ Submit ------ */
        async submit() {
            if (!this.state.latitude) {
                this.state.submitError = null;
                const ok = await this._requestGPSAndWait();
                if (!ok || !this.state.latitude) {
                    this.state.submitError = 'Lokasi GPS diperlukan. Izinkan akses lokasi di browser lalu coba lagi.';
                    document.getElementById('sf-map')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }

            if (!this._validate()) {
                const el = document.querySelector('.has-error');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            if (this.state.foto && this.state.foto.length > 600_000) {
                this.state.submitError = 'Foto masih terlalu besar setelah dikompresi. Coba hapus foto atau pilih foto yang lebih sederhana.';
                return;
            }

            this.state.submitting = true;
            this.state.submitError = null;

            const recaptchaToken = await this._getRecaptchaToken();

            try {
                const resp = await this._jsonRpc('/sumur/api/submit', {
                    token: this.initData.token,
                    data: {
                        nama_surveyor: this.state.nama_surveyor,
                        hp_surveyor: this.state.hp_surveyor,
                        nama_sumur: this.state.nama_sumur,
                        minyak_produksi: parseFloat(this.state.minyak_produksi) || 0,
                        minyak_masuk: parseFloat(this.state.minyak_masuk) || 0,
                        minyak_tersedia: parseFloat(this.state.minyak_tersedia) || 0,
                        minyak_keluar: parseFloat(this.state.minyak_keluar) || 0,
                        minyak_ditolak: parseFloat(this.state.minyak_ditolak) || 0,
                        kabupaten_id: this.state.kabupaten_id,
                        kecamatan_id: this.state.kecamatan_id,
                        desa_id: this.state.desa_id,
                        latitude: this.state.latitude,
                        longitude: this.state.longitude,
                        foto: this.state.foto,
                        recaptcha_token: recaptchaToken,
                    },
                }, 90000);

                const result = resp.result || {};
                if (result.success) {
                    this._saveCache();
                    this.state.submitted = true;
                    this.state.submitCode = result.code;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    this.state.submitError = result.message || 'Gagal mengirim data';
                }
            } catch (err) {
                console.error('[PetaDigi] submit error:', err);
                if (err && err.name === 'AbortError') {
                    this.state.submitError = 'Pengiriman terlalu lama (timeout). Coba hapus foto lalu kirim ulang, atau periksa koneksi internet.';
                } else if (err && err.message && err.message.startsWith('HTTP ')) {
                    const code = err.message.replace('HTTP ', '');
                    if (code === '413') {
                        this.state.submitError = 'Foto terlalu besar. Coba hapus foto atau pilih foto yang lebih kecil.';
                    } else {
                        this.state.submitError = `Server error (${code}). Silakan coba beberapa saat lagi.`;
                    }
                } else {
                    this.state.submitError = 'Koneksi gagal. Periksa sinyal internet lalu coba lagi.';
                }
            } finally {
                this.state.submitting = false;
            }
        }

        /* ------ Reset ------ */
        resetForm() {
            if (this.state.fotoPreview) URL.revokeObjectURL(this.state.fotoPreview);
            const cache = this._loadCache();
            Object.assign(this.state, {
                nama_surveyor: cache.nama_surveyor || '',
                hp_surveyor: cache.hp_surveyor || '',
                nama_sumur: '',
                minyak_produksi: '', minyak_masuk: '', minyak_tersedia: '',
                minyak_keluar: '', minyak_ditolak: '',
                kabupaten_id: null, kecamatan_id: null, desa_id: null,
                kecamatan_list: [], desa_list: [],
                latitude: null, longitude: null,
                gpsError: null, foto: null, fotoPreview: null,
                fotoSizeLabel: null, fotoCompressed: false, fotoLoading: false,
                submitted: false, submitCode: null, submitError: null, errors: {},
            });

            if (this._marker) {
                this._marker.remove();
                this._marker = null;
            }
            if (this._map) {
                this._map.setView([-2.5, 118.0], 5);
                setTimeout(() => this._map.invalidateSize(), 50);
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => this.getGPS(), 200);
        }

        /* ------ JSON-RPC helper ------ */
        async _jsonRpc(url, params, timeoutMs = 30000) {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeoutMs);
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Date.now(), params }),
                    signal: ctrl.signal,
                });
                if (!response.ok) {
                    const body = await response.text().catch(() => '');
                    console.error(`[PetaDigi] server ${response.status}:`, body.slice(0, 500));
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            } finally {
                clearTimeout(timer);
            }
        }
    }

    function init() {
        const root = document.getElementById('sumur-app');
        if (root) mount(SumurFormApp, root);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
