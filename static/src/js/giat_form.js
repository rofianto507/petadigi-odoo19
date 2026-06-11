(function () {
    'use strict';

    const { Component, useState, mount, xml, onMounted } = owl;

    class GiatFormApp extends Component {
        static template = xml/* xml */`
            <div class="gf-root">

                <!-- ===== SUCCESS SCREEN ===== -->
                <div t-att-class="'gf-success' + (state.submitted ? '' : ' gf-hidden')">
                    <div class="gf-success-card">
                        <div class="gf-success-icon">✓</div>
                        <h2 class="gf-success-title">Laporan Terkirim</h2>
                        <div class="gf-success-code" t-out="state.submitCode"/>
                        <p class="gf-success-msg">
                            Terima kasih, <strong t-out="state.nama_petugas"/>.<br/>
                            Laporan kegiatan Anda telah berhasil dikirim.
                        </p>
                        <div class="gf-success-actions">
                            <button class="gf-btn gf-btn-tonal gf-btn-block" t-on-click="resetForm">
                                Kirim Laporan Baru
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ===== FORM ===== -->
                <div t-att-class="state.submitted ? 'gf-hidden' : ''">

                    <!-- Top App Bar -->
                    <div class="gf-appbar">
                        <div class="gf-appbar-icon">⚔</div>
                        <div class="gf-appbar-content">
                            <div class="gf-appbar-title" t-out="initData.jenis_laporan.nama"/>
                            <div class="gf-appbar-sub">Input Laporan Kegiatan</div>
                        </div>
                    </div>

                    <div class="gf-body">

                        <!-- Identitas Petugas -->
                        <div class="gf-section">
                            <div class="gf-section-label">Identitas Petugas</div>
                            <div class="gf-card">
                                <div class="gf-card-body">

                                    <div class="gf-field">
                                        <label class="gf-label">NRP</label>
                                        <input class="gf-input" type="text" inputmode="numeric"
                                               t-att-value="state.nrp"
                                               t-on-input="onNrpInput"
                                               placeholder="Nomor Registrasi Pokok"/>
                                    </div>

                                    <div t-att-class="'gf-field' + (state.errors.nama_petugas ? ' has-error' : '')">
                                        <label class="gf-label">
                                            Nama Petugas
                                            <span class="gf-req">*</span>
                                        </label>
                                        <input class="gf-input" type="text"
                                               t-att-value="state.nama_petugas"
                                               t-on-input="onNamaPetugasInput"
                                               placeholder="Nama lengkap petugas"/>
                                        <div t-if="state.errors.nama_petugas" class="gf-errmsg"
                                             t-out="state.errors.nama_petugas"/>
                                    </div>

                                    <div class="gf-field">
                                        <label class="gf-label">Pangkat</label>
                                        <input class="gf-input" type="text"
                                               t-att-value="state.pangkat_petugas"
                                               t-on-input="onPangkatInput"
                                               placeholder="Pangkat petugas"/>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <!-- Satuan Wilayah -->
                        <div class="gf-section">
                            <div class="gf-section-label">Satuan Wilayah</div>
                            <div class="gf-card">
                                <div class="gf-card-body">

                                    <div t-att-class="'gf-field' + (state.errors.polres_id ? ' has-error' : '')">
                                        <label class="gf-label">
                                            Polres
                                            <span class="gf-req">*</span>
                                        </label>
                                        <select class="gf-input gf-select" t-on-change="onPolresChange">
                                            <option value="">Pilih Polres</option>
                                            <t t-foreach="initData.polres_list" t-as="pr" t-key="pr.id">
                                                <option t-att-value="pr.id"
                                                        t-att-selected="state.polres_id === pr.id"
                                                        t-out="pr.name"/>
                                            </t>
                                        </select>
                                        <div t-if="state.errors.polres_id" class="gf-errmsg"
                                             t-out="state.errors.polres_id"/>
                                    </div>

                                    <div class="gf-field">
                                        <label class="gf-label">
                                            Polsek
                                            <span class="gf-opt">Opsional</span>
                                        </label>
                                        <select class="gf-input gf-select"
                                                t-att-disabled="!state.polres_id || state.loadingPolsek"
                                                t-on-change="onPolsekChange">
                                            <option value="">
                                                <t t-if="state.loadingPolsek">Memuat...</t>
                                                <t t-else="">Pilih Polsek</t>
                                            </option>
                                            <t t-foreach="state.polsek_list" t-as="ps" t-key="ps.id">
                                                <option t-att-value="ps.id"
                                                        t-att-selected="state.polsek_id === ps.id"
                                                        t-out="ps.name"/>
                                            </t>
                                        </select>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <!-- Uraian Kegiatan -->
                        <div class="gf-section">
                            <div class="gf-section-label">Uraian Kegiatan</div>
                            <div class="gf-card">
                                <div class="gf-card-body">

                                    <div t-att-class="'gf-field' + (state.errors.tanggal ? ' has-error' : '')">
                                        <label class="gf-label">
                                            Tanggal Kegiatan
                                            <span class="gf-req">*</span>
                                        </label>
                                        <input class="gf-input gf-input-datetime" type="datetime-local"
                                               t-att-value="state.tanggal"
                                               t-on-input="onTanggalInput"/>
                                        <div t-if="state.errors.tanggal" class="gf-errmsg"
                                             t-out="state.errors.tanggal"/>
                                    </div>

                                    <div t-att-class="'gf-field' + (state.errors.kegiatan ? ' has-error' : '')">
                                        <label class="gf-label">
                                            Deskripsi Kegiatan
                                            <span class="gf-req">*</span>
                                        </label>
                                        <textarea class="gf-input gf-textarea" rows="5"
                                                  t-att-value="state.kegiatan"
                                                  t-on-input="onKegiatanInput"
                                                  placeholder="Tuliskan uraian kegiatan yang dilakukan..."/>
                                        <div t-if="state.errors.kegiatan" class="gf-errmsg"
                                             t-out="state.errors.kegiatan"/>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <!-- Lokasi GPS + Map -->
                        <div class="gf-section">
                            <div class="gf-section-label">Lokasi Kegiatan</div>
                            <div class="gf-card">
                                <div class="gf-card-body">

                                    <button class="gf-btn gf-btn-tonal gf-btn-block"
                                            t-on-click="getGPS"
                                            t-att-disabled="state.gpsLoading">
                                        <t t-if="state.gpsLoading">Mengambil lokasi GPS...</t>
                                        <t t-else="">Perbarui Lokasi GPS</t>
                                    </button>

                                    <!-- Status GPS -->
                                    <div t-if="state.gpsError"
                                         class="gf-location-status gf-location-status--err">
                                        <div class="gf-location-dot"/>
                                        <span t-out="state.gpsError"/>
                                    </div>
                                    <div t-elif="state.latitude"
                                         class="gf-location-status gf-location-status--ok">
                                        <div class="gf-location-dot"/>
                                        <span t-out="state.latitude"/>, <span t-out="state.longitude"/>
                                    </div>
                                    <div t-elif="state.gpsLoading"
                                         class="gf-location-status gf-location-status--idle">
                                        <div class="gf-location-dot"/>
                                        <span>Mengambil koordinat GPS...</span>
                                    </div>
                                    <div t-else=""
                                         class="gf-location-status gf-location-status--idle">
                                        <div class="gf-location-dot"/>
                                        <span>Menunggu izin akses GPS</span>
                                    </div>

                                    <!-- Map always stays in DOM to avoid Leaflet reinit -->
                                    <div id="gf-map" class="gf-map"/>

                                </div>
                            </div>
                        </div>

                        <!-- Foto Dokumentasi -->
                        <div class="gf-section">
                            <div class="gf-section-label">Foto Dokumentasi</div>
                            <div class="gf-card">
                                <div class="gf-card-body">
                                    <div class="gf-foto-btns">
                                        <label class="gf-btn gf-btn-outlined">
                                            Kamera
                                            <input type="file" accept="image/*" capture="environment"
                                                   class="gf-file-hidden" t-on-change="handleFoto"/>
                                        </label>
                                        <label class="gf-btn gf-btn-outlined">
                                            Galeri
                                            <input type="file" accept="image/*"
                                                   class="gf-file-hidden" t-on-change="handleFoto"/>
                                        </label>
                                    </div>
                                    <div t-if="state.fotoPreview" class="gf-foto-preview">
                                        <img t-att-src="state.fotoPreview" class="gf-preview-img"
                                             alt="Foto dokumentasi"/>
                                        <div class="gf-foto-remove-row">
                                            <button class="gf-btn gf-btn-text" t-on-click="removeFoto">
                                                Hapus Foto
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Submit area -->
                        <div class="gf-submit-area">
                            <div t-if="state.submitError" class="gf-error-banner">
                                <div class="gf-error-banner-icon"/>
                                <span t-out="state.submitError"/>
                            </div>
                            <button class="gf-btn gf-btn-filled gf-btn-submit"
                                    t-on-click="submit"
                                    t-att-disabled="state.submitting">
                                <t t-if="state.submitting">Mengirim laporan...</t>
                                <t t-else="">Kirim Laporan</t>
                            </button>
                            <div class="gf-footer">PetaDigi · Cooling System</div>
                        </div>

                    </div>
                </div>

            </div>
        `;

        _loadCache() {
            try {
                return JSON.parse(localStorage.getItem('petadigi_giat_petugas') || '{}');
            } catch (_) { return {}; }
        }

        _saveCache() {
            try {
                localStorage.setItem('petadigi_giat_petugas', JSON.stringify({
                    nrp: this.state.nrp,
                    nama_petugas: this.state.nama_petugas,
                    pangkat_petugas: this.state.pangkat_petugas,
                }));
            } catch (_) {}
        }

        _nowLocal() {
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        }

        setup() {
            this.initData = window.GIAT_INIT_DATA;
            const cache = this._loadCache();
            this.state = useState({
                nrp: cache.nrp || '',
                nama_petugas: cache.nama_petugas || '',
                pangkat_petugas: cache.pangkat_petugas || '',
                polres_id: null,
                polsek_id: null,
                polsek_list: [],
                loadingPolsek: false,
                tanggal: this._nowLocal(),
                kegiatan: '',
                latitude: null,
                longitude: null,
                gpsLoading: false,
                gpsError: null,
                foto: null,
                fotoPreview: null,
                submitting: false,
                submitted: false,
                submitCode: null,
                submitError: null,
                errors: {},
            });

            // Leaflet instances — not reactive state
            this._map = null;
            this._marker = null;

            onMounted(() => {
                this._initMap();
                // Auto-request GPS on load so browser shows permission dialog immediately
                this.getGPS();
            });
        }

        /* ------ Leaflet map ------ */
        _initMap() {
            if (this._map || !window.L) return;
            const el = document.getElementById('gf-map');
            if (!el) return;

            this._map = L.map('gf-map', {
                center: [-2.5, 118.0],  // Indonesia default
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
                    title: 'Lokasi Kegiatan',
                    draggable: true,
                }).addTo(this._map);

                this._marker.on('dragend', (e) => {
                    const pos = e.target.getLatLng();
                    this.state.latitude = pos.lat.toFixed(6);
                    this.state.longitude = pos.lng.toFixed(6);
                    this._marker.bindPopup(
                        '<b>Lokasi Kegiatan</b><br>' +
                        this.state.latitude + ', ' + this.state.longitude
                    ).openPopup();
                });
            }

            this._marker.bindPopup(
                '<b>Lokasi Kegiatan</b><br>' +
                parseFloat(lat).toFixed(6) + ', ' + parseFloat(lng).toFixed(6) +
                '<br><small style="color:#888">Geser marker untuk menyesuaikan</small>'
            );
            this._map.setView(latlng, 16, { animate: true });
            this._marker.openPopup();
        }

        /* ------ Field handlers ------ */
        onNrpInput(ev) { this.state.nrp = ev.target.value; }
        onNamaPetugasInput(ev) { this.state.nama_petugas = ev.target.value; }
        onPangkatInput(ev) { this.state.pangkat_petugas = ev.target.value; }
        onTanggalInput(ev) { this.state.tanggal = ev.target.value; }
        onKegiatanInput(ev) { this.state.kegiatan = ev.target.value; }

        async onPolresChange(ev) {
            const polresId = parseInt(ev.target.value) || null;
            this.state.polres_id = polresId;
            this.state.polsek_id = null;
            this.state.polsek_list = [];

            if (!polresId) return;

            this.state.loadingPolsek = true;
            try {
                const resp = await this._jsonRpc('/giat/api/polsek', { polres_id: polresId });
                this.state.polsek_list = resp.result || [];
            } catch (_) { /* polsek optional */ } finally {
                this.state.loadingPolsek = false;
            }
        }

        onPolsekChange(ev) {
            this.state.polsek_id = parseInt(ev.target.value) || null;
        }

        /* ------ GPS ------ */
        getGPS() {
            if (!navigator.geolocation) {
                this.state.gpsError = 'GPS tidak tersedia di perangkat ini';
                return;
            }
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
                },
                (err) => {
                    this.state.gpsError = 'Gagal mendapat lokasi: ' + (err.message || 'Periksa izin GPS browser');
                    this.state.gpsLoading = false;
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        }

        /* ------ Foto ------ */
        async handleFoto(ev) {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            this.state.fotoPreview = URL.createObjectURL(file);
            try {
                this.state.foto = await this._resizeImage(file);
            } catch (_) {
                const reader = new FileReader();
                reader.onload = (e) => { this.state.foto = e.target.result.split(',')[1]; };
                reader.readAsDataURL(file);
            }
        }

        _resizeImage(file, maxWidth = 1280) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.82).split(',')[1]);
                };
                img.onerror = reject;
                img.src = url;
            });
        }

        removeFoto() {
            if (this.state.fotoPreview) URL.revokeObjectURL(this.state.fotoPreview);
            this.state.foto = null;
            this.state.fotoPreview = null;
        }

        /* ------ Validation ------ */
        _validate() {
            const errors = {};
            if (!this.state.nama_petugas.trim()) errors.nama_petugas = 'Nama petugas wajib diisi';
            if (!this.state.polres_id) errors.polres_id = 'Pilih Polres terlebih dahulu';
            if (!this.state.tanggal) errors.tanggal = 'Tanggal kegiatan wajib diisi';
            if (!this.state.kegiatan.trim()) errors.kegiatan = 'Uraian kegiatan wajib diisi';
            this.state.errors = errors;
            return Object.keys(errors).length === 0;
        }

        /* ------ Submit ------ */
        async submit() {
            if (!this._validate()) {
                const el = document.querySelector('.has-error');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            this.state.submitting = true;
            this.state.submitError = null;

            try {
                const resp = await this._jsonRpc('/giat/api/submit', {
                    token: this.initData.token,
                    data: {
                        nrp: this.state.nrp,
                        nama_petugas: this.state.nama_petugas,
                        pangkat_petugas: this.state.pangkat_petugas,
                        polres_id: this.state.polres_id,
                        polsek_id: this.state.polsek_id,
                        tanggal: this.state.tanggal,
                        kegiatan: this.state.kegiatan,
                        latitude: this.state.latitude,
                        longitude: this.state.longitude,
                        foto: this.state.foto,
                    },
                });

                const result = resp.result || {};
                if (result.success) {
                    this._saveCache();
                    this.state.submitted = true;
                    this.state.submitCode = result.code;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    this.state.submitError = result.message || 'Gagal mengirim laporan';
                }
            } catch (_) {
                this.state.submitError = 'Koneksi gagal. Periksa internet dan coba lagi.';
            } finally {
                this.state.submitting = false;
            }
        }

        /* ------ Reset ------ */
        resetForm() {
            if (this.state.fotoPreview) URL.revokeObjectURL(this.state.fotoPreview);
            const cache = this._loadCache();
            Object.assign(this.state, {
                nrp: cache.nrp || '', nama_petugas: cache.nama_petugas || '', pangkat_petugas: cache.pangkat_petugas || '',
                polres_id: null, polsek_id: null, polsek_list: [],
                tanggal: this._nowLocal(),
                kegiatan: '', latitude: null, longitude: null,
                gpsError: null, foto: null, fotoPreview: null,
                submitted: false, submitCode: null, submitError: null, errors: {},
            });

            // Remove previous marker, reset map to Indonesia view
            if (this._marker) {
                this._marker.remove();
                this._marker = null;
            }
            if (this._map) {
                this._map.setView([-2.5, 118.0], 5);
                // Re-render Leaflet after element becomes visible again
                setTimeout(() => this._map.invalidateSize(), 50);
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
            // Auto request GPS again for new report
            setTimeout(() => this.getGPS(), 200);
        }

        /* ------ JSON-RPC helper ------ */
        async _jsonRpc(url, params) {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Date.now(), params }),
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        }
    }

    function init() {
        const root = document.getElementById('giat-app');
        if (root) mount(GiatFormApp, root);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
