(function () {
    'use strict';

    const { Component, useState, mount, xml, onMounted } = owl;

    class StrongPublicFormApp extends Component {
        static template = xml/* xml */`
            <div class="sf-root">

                <!-- ═══════════════════════════════════════
                     FASE: DONE (selesai final)
                ═══════════════════════════════════════ -->
                <t t-if="state.phase === 'done'">
                    <div class="sf-success">
                        <div class="sf-success-card">
                            <div class="sf-success-icon">✓</div>
                            <h2 class="sf-success-title">Strong Point Selesai</h2>
                            <div class="sf-success-code" t-out="state.submitCode"/>
                            <p class="sf-success-msg">
                                Data tersimpan beserta
                                <strong t-out="state.personel.length"/> personel.
                            </p>
                            <div class="sf-success-actions">
                                <button class="sf-btn sf-btn-tonal sf-btn-block" t-on-click="resetForm">
                                    Input Data Baru
                                </button>
                            </div>
                        </div>
                    </div>
                </t>

                <!-- ═══════════════════════════════════════
                     FASE: SET SELESAI + TANGGAL
                ═══════════════════════════════════════ -->
                <t t-elif="state.phase === 'selesai'">

                    <!-- App Bar -->
                    <div class="sf-appbar">
                        <div class="sf-appbar-icon"><i class="fa fa-flag-checkered"/></div>
                        <div class="sf-appbar-content">
                            <div class="sf-appbar-title">Set Selesai</div>
                            <div class="sf-appbar-sub" t-out="state.submitCode"/>
                        </div>
                    </div>

                    <div class="sf-body">

                        <!-- Ringkasan personel -->
                        <div class="sf-phase-banner">
                            <i class="fa fa-users sf-phase-banner-icon"/>
                            <span>
                                <strong t-out="state.personel.length"/> personel tercatat
                            </span>
                        </div>

                        <!-- Tanggal Selesai -->
                        <div class="sf-section">
                            <div class="sf-section-label">Waktu Selesai</div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <div t-att-class="'sf-field' + (state.selesaiError ? ' has-error' : '')">
                                        <label class="sf-label">
                                            Tanggal &amp; Jam Selesai
                                            <span class="sf-req">*</span>
                                        </label>
                                        <input class="sf-input" type="datetime-local"
                                               t-att-value="state.tanggalSelesai"
                                               t-on-input="ev => state.tanggalSelesai = ev.target.value"/>
                                        <div t-if="state.selesaiError" class="sf-errmsg"
                                             t-out="state.selesaiError"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Submit -->
                        <div class="sf-submit-area">
                            <button class="sf-btn sf-btn-filled sf-btn-submit"
                                    t-on-click="submitSelesai"
                                    t-att-disabled="state.settingSelesai">
                                <t t-if="state.settingSelesai">Menyimpan...</t>
                                <t t-else=""><i class="fa fa-flag-checkered"/> Selesai</t>
                            </button>
                            <div class="sf-footer">PetaDigi · Strong Point</div>
                        </div>

                    </div>
                </t>

                <!-- ═══════════════════════════════════════
                     FASE: INPUT DATA (form)
                ═══════════════════════════════════════ -->
                <t t-else="">

                    <!-- App Bar -->
                    <div class="sf-appbar">
                        <div class="sf-appbar-icon"><i class="fa fa-map-pin"/></div>
                        <div class="sf-appbar-content">
                            <div class="sf-appbar-title" t-out="initData.config_name"/>
                            <div class="sf-appbar-sub">Form Publik Strong Point</div>
                        </div>
                    </div>

                    <div class="sf-body">

                        <!-- Keterangan Lokasi -->
                        <div class="sf-section">
                            <div class="sf-section-label">Keterangan Lokasi</div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <div t-att-class="'sf-field' + (state.errors.keterangan_lokasi ? ' has-error' : '')">
                                        <label class="sf-label">
                                            Keterangan Lokasi
                                            <span class="sf-req">*</span>
                                        </label>
                                        <textarea class="sf-input sf-textarea" rows="3"
                                                  t-att-value="state.keterangan_lokasi"
                                                  t-on-input="ev => state.keterangan_lokasi = ev.target.value"
                                                  placeholder="Deskripsikan lokasi strong point (contoh: Depan Masjid Agung Lahat, Jl. Mayor Ruslan)"/>
                                        <div t-if="state.errors.keterangan_lokasi" class="sf-errmsg"
                                             t-out="state.errors.keterangan_lokasi"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Satuan (hidden for subdit form — polres auto-assigned) -->
                        <t t-if="!initData.is_subdit_form">
                        <div class="sf-section">
                            <div class="sf-section-label">Satuan</div>
                            <div class="sf-card">
                                <div class="sf-card-body">

                                    <div t-att-class="'sf-field' + (state.errors.polres_id ? ' has-error' : '')">
                                        <label class="sf-label">
                                            Polres
                                            <span class="sf-req">*</span>
                                        </label>
                                        <select class="sf-input sf-select" t-on-change="onPolresChange">
                                            <option value="">Pilih Polres</option>
                                            <t t-foreach="initData.polres_list" t-as="polres" t-key="polres.id">
                                                <option t-att-value="polres.id"
                                                        t-att-selected="state.polres_id === polres.id"
                                                        t-out="polres.name"/>
                                            </t>
                                        </select>
                                        <div t-if="state.errors.polres_id" class="sf-errmsg"
                                             t-out="state.errors.polres_id"/>
                                    </div>

                                    <div class="sf-field">
                                        <label class="sf-label">
                                            Polsek
                                            <span class="sf-opt">Opsional</span>
                                        </label>
                                        <select class="sf-input sf-select"
                                                t-att-disabled="!state.polres_id || state.loadingPolsek"
                                                t-model="state.polsek_id">
                                            <option value="">
                                                <t t-if="state.loadingPolsek">Memuat...</t>
                                                <t t-else="">Pilih Polsek</t>
                                            </option>
                                            <t t-foreach="state.polsek_list" t-as="polsek" t-key="polsek.id">
                                                <option t-att-value="polsek.id" t-out="polsek.name"/>
                                            </t>
                                        </select>
                                    </div>

                                </div>
                            </div>
                        </div>
                        </t>

                        <!-- Wilayah -->
                        <div class="sf-section">
                            <div class="sf-section-label">Wilayah</div>
                            <div class="sf-card">
                                <div class="sf-card-body">

                                    <div t-att-class="'sf-field' + (state.errors.kabupaten_id ? ' has-error' : '')">
                                        <label class="sf-label">
                                            Kabupaten/Kota
                                            <span class="sf-req">*</span>
                                        </label>
                                        <select class="sf-input sf-select"
                                                t-att-disabled="!state.polres_id || state.loadingKabupaten"
                                                t-on-change="onKabupatenChange">
                                            <option value="">
                                                <t t-if="state.loadingKabupaten">Memuat...</t>
                                                <t t-elif="!state.polres_id">Pilih Polres dahulu</t>
                                                <t t-else="">Pilih Kabupaten/Kota</t>
                                            </option>
                                            <t t-foreach="state.kabupaten_list" t-as="kab" t-key="kab.id">
                                                <option t-att-value="kab.id"
                                                        t-att-selected="state.kabupaten_id === kab.id"
                                                        t-out="kab.name"/>
                                            </t>
                                        </select>
                                        <div t-if="state.errors.kabupaten_id" class="sf-errmsg"
                                             t-out="state.errors.kabupaten_id"/>
                                    </div>

                                    <div t-att-class="'sf-field' + (state.errors.kecamatan_id ? ' has-error' : '')">
                                        <label class="sf-label">
                                            Kecamatan
                                            <span class="sf-req">*</span>
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
                                        <div t-if="state.errors.kecamatan_id" class="sf-errmsg"
                                             t-out="state.errors.kecamatan_id"/>
                                    </div>

                                    <div t-att-class="'sf-field' + (state.errors.desa_id ? ' has-error' : '')">
                                        <label class="sf-label">
                                            Desa/Kelurahan
                                            <span class="sf-req">*</span>
                                        </label>
                                        <select class="sf-input sf-select"
                                                t-att-disabled="!state.kecamatan_id || state.loadingDesa"
                                                t-on-change="ev => { state.desa_id = +ev.target.value || null; }">
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
                                        <div t-if="state.errors.desa_id" class="sf-errmsg"
                                             t-out="state.errors.desa_id"/>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <!-- Lokasi GPS -->
                        <div class="sf-section">
                            <div class="sf-section-label">Lokasi GPS</div>
                            <div t-att-class="'sf-card' + (state.errors.latitude ? ' has-error' : '')">
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

                                    <div t-if="state.errors.latitude" class="sf-errmsg" style="margin-top:8px"
                                         t-out="state.errors.latitude"/>

                                    <div id="spf-map" class="sf-map"/>
                                </div>
                            </div>
                        </div>

                        <!-- Foto Dokumentasi -->
                        <div class="sf-section">
                            <div class="sf-section-label">
                                Foto Dokumentasi <span class="sf-req">*</span>
                            </div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <div class="sf-foto-btns">
                                        <label class="sf-btn sf-btn-outlined">
                                            <i class="fa fa-camera"/> Kamera
                                            <input type="file" accept="image/*" capture="environment"
                                                   class="sf-file-hidden" t-on-change="handleFoto"/>
                                        </label>
                                        <label class="sf-btn sf-btn-outlined">
                                            <i class="fa fa-image"/> Galeri
                                            <input type="file" accept="image/*"
                                                   class="sf-file-hidden" t-on-change="handleFoto"/>
                                        </label>
                                    </div>
                                    <div t-if="state.fotoPreview" class="sf-foto-preview">
                                        <img t-att-src="state.fotoPreview" class="sf-preview-img" alt="Foto Strong Point"/>
                                        <div class="sf-foto-meta">
                                            <t t-if="state.fotoLoading">
                                                <span class="sf-foto-size sf-foto-size--loading">⏳ Mengompresi...</span>
                                            </t>
                                            <t t-elif="state.fotoSizeLabel">
                                                <span t-att-class="'sf-foto-size ' + (state.fotoCompressed ? 'sf-foto-size--ok' : 'sf-foto-size--info')"
                                                      t-out="state.fotoSizeLabel"/>
                                            </t>
                                            <button class="sf-btn sf-btn-text" t-on-click="removeFoto">Hapus Foto</button>
                                        </div>
                                    </div>
                                    <div t-if="state.errors.foto" class="sf-errmsg" style="margin-top:8px"
                                         t-out="state.errors.foto"/>
                                </div>
                            </div>
                        </div>

                        <!-- Data Personel -->
                        <div class="sf-section">
                            <div class="sf-section-label">
                                <i class="fa fa-users" style="margin-right:6px"/>
                                Personel
                                <span class="sf-personel-count-badge" t-out="state.personel.length"/>
                                <span class="sf-req" style="margin-left:4px">*</span>
                            </div>
                            <div class="sf-card">
                                <div class="sf-card-body">

                                    <!-- Daftar personel lokal -->
                                    <div class="sf-personel-list">
                                        <t t-if="state.personel.length === 0">
                                            <div class="sf-personel-empty">
                                                Belum ada personel yang ditambahkan
                                            </div>
                                        </t>
                                        <t t-foreach="state.personel" t-as="p" t-key="p.tempId">
                                            <div class="sf-personel-row">
                                                <div class="sf-personel-avatar">
                                                    <i class="fa fa-user"/>
                                                </div>
                                                <div class="sf-personel-name" t-out="p.nama_lengkap"/>
                                                <button class="sf-personel-del"
                                                        t-att-data-tid="p.tempId"
                                                        t-on-click="removePersonelLocal">
                                                    <i class="fa fa-times"/>
                                                </button>
                                            </div>
                                        </t>
                                    </div>

                                    <!-- Form tambah personel -->
                                    <div class="sf-personel-add-form">
                                        <input class="sf-input" type="text"
                                               placeholder="Nama personel *"
                                               t-att-value="state.personelNama"
                                               t-on-input="ev => { state.personelNama = ev.target.value.toUpperCase(); ev.target.value = state.personelNama; }"/>
                                        <div class="sf-personel-add-row">
                                            <input class="sf-input" type="text"
                                                   placeholder="Pangkat / Jabatan (opsional)"
                                                   t-att-value="state.personelPangkat"
                                                   t-on-input="ev => { state.personelPangkat = ev.target.value.toUpperCase(); ev.target.value = state.personelPangkat; }"
                                                   style="flex:1"/>
                                            <button class="sf-btn-add-personel"
                                                    t-on-click="addPersonelLocal">
                                                <i class="fa fa-plus"/>
                                            </button>
                                        </div>
                                        <div t-if="state.personelError"
                                             class="sf-personel-err"
                                             t-out="state.personelError"/>
                                    </div>

                                    <div t-if="state.errors.personel" class="sf-errmsg" style="margin-top:8px"
                                         t-out="state.errors.personel"/>
                                </div>
                            </div>
                        </div>

                        <!-- Keterangan Tambahan -->
                        <div class="sf-section">
                            <div class="sf-section-label">Keterangan Tambahan</div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <div class="sf-field">
                                        <label class="sf-label">
                                            Tanggal &amp; Jam Mulai
                                            <span class="sf-req">*</span>
                                        </label>
                                        <input class="sf-input" type="datetime-local"
                                               t-att-value="state.tanggalMulai"
                                               t-on-input="ev => state.tanggalMulai = ev.target.value"/>
                                    </div>
                                    <div class="sf-field">
                                        <label class="sf-label">
                                            Keterangan
                                            <span class="sf-opt">Opsional</span>
                                        </label>
                                        <textarea class="sf-input sf-textarea" rows="3"
                                                  t-att-value="state.keterangan"
                                                  t-on-input="ev => state.keterangan = ev.target.value"
                                                  placeholder="Catatan tambahan (jumlah personel, kendaraan, dll)"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Submit -->
                        <div class="sf-submit-area">
                            <div t-if="state.submitError" class="sf-error-banner">
                                <div class="sf-error-banner-icon"/>
                                <span t-out="state.submitError"/>
                            </div>
                            <button class="sf-btn sf-btn-filled sf-btn-submit"
                                    t-on-click="submit"
                                    t-att-disabled="state.submitting || state.gpsLoading || state.fotoLoading">
                                <t t-if="state.submitting">Mengirim data...</t>
                                <t t-elif="state.gpsLoading">Menunggu lokasi GPS...</t>
                                <t t-elif="state.fotoLoading">Memproses foto...</t>
                                <t t-else=""><i class="fa fa-paper-plane"/> Simpan &amp; Lanjut Set Selesai</t>
                            </button>
                            <div class="sf-footer">PetaDigi · Strong Point</div>
                        </div>

                    </div>
                </t>

            </div>
        `;

        setup() {
            this.initData = JSON.parse(document.getElementById('spf-app').dataset.init);
            this.state = useState({
                /* ── fase ── */
                phase: 'form',       // 'form' | 'selesai' | 'done'
                /* ── data form ── */
                keterangan_lokasi: '',
                keterangan: '',
                tanggalMulai: '',
                polres_id: null,
                polsek_id: '',
                polsek_list: [],
                kabupaten_id: null,
                kabupaten_list: [],
                kecamatan_id: null,
                kecamatan_list: [],
                desa_id: null,
                desa_list: [],
                loadingPolsek: false,
                loadingKabupaten: false,
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
                submitCode: null,
                submitError: null,
                errors: {},
                /* ── personel (lokal, dikumpulkan sebelum submit) ── */
                recordId: null,
                personel: [],
                personelNama: '',
                personelPangkat: '',
                personelError: null,
                /* ── selesai ── */
                tanggalSelesai: '',
                settingSelesai: false,
                selesaiError: null,
            });
            this._map = null;
            this._marker = null;
            this.state.tanggalMulai = this._nowLocalDt();

            if (this.initData.is_subdit_form && this.initData.auto_polres_id) {
                this.state.polres_id = this.initData.auto_polres_id;
            }

            onMounted(() => {
                this._initMap();
                this.getGPS();
                if (this.initData.is_subdit_form && this.initData.auto_polres_id) {
                    this._loadKabupaten(this.initData.auto_polres_id);
                }
            });

        }

        /* ── Map ─────────────────────────────────────────── */
        _initMap() {
            if (this._map || !window.L) return;
            const el = document.getElementById('spf-map');
            if (!el) return;
            this._markerIcon = L.icon({
                iconUrl: '/petadigi/static/lib/leaflet/images/marker-icon.png',
                shadowUrl: '/petadigi/static/lib/leaflet/images/marker-shadow.png',
                iconSize: [25, 41], iconAnchor: [12, 41],
                popupAnchor: [1, -34], shadowSize: [41, 41],
            });
            this._map = L.map('spf-map', { center: [-2.5, 104.5], zoom: 8 });
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
                this._marker = L.marker(latlng, { icon: this._markerIcon, draggable: true }).addTo(this._map);
                this._marker.on('dragend', (e) => {
                    const pos = e.target.getLatLng();
                    this.state.latitude  = pos.lat.toFixed(6);
                    this.state.longitude = pos.lng.toFixed(6);
                });
            }
            this._marker.bindPopup(
                '<b>Lokasi Strong Point</b><br>' +
                parseFloat(lat).toFixed(6) + ', ' + parseFloat(lng).toFixed(6) +
                '<br><small style="color:#888">Geser marker untuk menyesuaikan</small>'
            );
            this._map.setView(latlng, 16, { animate: true });
            this._marker.openPopup();
        }

        /* ── Satuan / Wilayah cascading ──────────────────── */
        async onPolresChange(ev) {
            const id = parseInt(ev.target.value) || null;
            Object.assign(this.state, {
                polres_id: id,
                polsek_id: '', polsek_list: [],
                kabupaten_id: null, kabupaten_list: [],
                kecamatan_id: null, kecamatan_list: [],
                desa_id: null, desa_list: [],
            });
            if (!id) return;
            this.state.loadingPolsek    = true;
            this.state.loadingKabupaten = true;
            const [polsekResp, kabResp] = await Promise.all([
                this._jsonRpc('/strong/api/polsek', { polres_id: id, token: this.initData.token }).catch(() => null),
                this._jsonRpc('/strong/api/kabupaten', { polres_id: id, token: this.initData.token }).catch(() => null),
            ]);
            this.state.polsek_list      = (polsekResp && polsekResp.result) || [];
            this.state.kabupaten_list   = (kabResp && kabResp.result) || [];
            this.state.loadingPolsek    = false;
            this.state.loadingKabupaten = false;
        }

        async onKabupatenChange(ev) {
            const id = parseInt(ev.target.value) || null;
            this.state.kabupaten_id   = id;
            this.state.kecamatan_id   = null;
            this.state.kecamatan_list = [];
            this.state.desa_id        = null;
            this.state.desa_list      = [];
            if (!id) return;
            this.state.loadingKecamatan = true;
            try {
                const resp = await this._jsonRpc('/strong/api/kecamatan',
                    { kabupaten_id: id, token: this.initData.token });
                this.state.kecamatan_list = (resp && resp.result) || [];
            } catch (_) {} finally {
                this.state.loadingKecamatan = false;
            }
        }

        async onKecamatanChange(ev) {
            const id = parseInt(ev.target.value) || null;
            this.state.kecamatan_id = id;
            this.state.desa_id      = null;
            this.state.desa_list    = [];
            if (!id) return;
            this.state.loadingDesa = true;
            try {
                const resp = await this._jsonRpc('/strong/api/desa',
                    { kecamatan_id: id, token: this.initData.token });
                this.state.desa_list = (resp && resp.result) || [];
            } catch (_) {} finally {
                this.state.loadingDesa = false;
            }
        }

        async _loadKabupaten(polresId) {
            this.state.loadingKabupaten = true;
            try {
                const resp = await this._jsonRpc('/strong/api/kabupaten',
                    { polres_id: polresId, token: this.initData.token });
                this.state.kabupaten_list = (resp && resp.result) || [];
            } catch (_) {} finally {
                this.state.loadingKabupaten = false;
            }
        }

        /* ── GPS ─────────────────────────────────────────── */
        getGPS() { this._requestGPS(); }

        _requestGPS() {
            if (!navigator.geolocation) {
                this.state.gpsError = 'GPS tidak tersedia di perangkat ini';
                return;
            }
            if (this.state.gpsLoading) return;
            this.state.gpsLoading = true;
            this.state.gpsError   = null;
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude.toFixed(6);
                    const lng = pos.coords.longitude.toFixed(6);
                    this.state.latitude   = lat;
                    this.state.longitude  = lng;
                    this.state.gpsLoading = false;
                    this._updateMapMarker(lat, lng);
                },
                (err) => {
                    this.state.gpsError   = 'Gagal mendapat lokasi: ' + (err.message || 'Periksa izin GPS browser');
                    this.state.gpsLoading = false;
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        }

        /* ── Foto ────────────────────────────────────────── */
        _formatSize(bytes) {
            return bytes >= 1024 * 1024
                ? (bytes / (1024 * 1024)).toFixed(1) + ' MB'
                : Math.round(bytes / 1024) + ' KB';
        }

        async handleFoto(ev) {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            if (file.size > 20 * 1024 * 1024) {
                this.state.submitError = 'File foto terlalu besar (maks 20 MB). Pilih foto lain.';
                ev.target.value = '';
                return;
            }
            this.state.fotoPreview    = URL.createObjectURL(file);
            this.state.fotoSizeLabel  = this._formatSize(file.size);
            this.state.fotoCompressed = false;
            this.state.fotoLoading    = true;
            this.state.submitError    = null;
            this.state.foto           = null;
            try {
                const b64 = await this._resizeImage(file);
                if (!b64) throw new Error('canvas kosong');
                this.state.foto = b64;
                const compressedBytes = Math.round(b64.length * 0.75);
                const wasCompressed   = compressedBytes < file.size * 0.95;
                this.state.fotoCompressed = wasCompressed;
                this.state.fotoSizeLabel  = wasCompressed
                    ? `${this._formatSize(file.size)} → ${this._formatSize(compressedBytes)}`
                    : this._formatSize(compressedBytes);
            } catch (_) {
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
            Object.assign(this.state, {
                foto: null, fotoPreview: null, fotoSizeLabel: null,
                fotoCompressed: false, fotoLoading: false,
            });
        }

        /* ── Personel lokal ──────────────────────────────── */
        addPersonelLocal() {
            const nama = (this.state.personelNama || '').trim();
            if (!nama) {
                this.state.personelError = 'Nama personel wajib diisi';
                return;
            }
            this.state.personelError = null;
            const pangkat     = (this.state.personelPangkat || '').trim();
            const nama_lengkap = pangkat ? `${pangkat} ${nama}` : nama;
            this.state.personel = [...this.state.personel, {
                tempId: Date.now() + Math.random(),
                nama,
                pangkat,
                nama_lengkap,
            }];
            this.state.personelNama    = '';
            this.state.personelPangkat = '';
            // Hapus error personel jika sudah ada isian
            if (this.state.errors.personel) {
                const { personel: _p, ...rest } = this.state.errors;
                this.state.errors = rest;
            }
        }

        removePersonelLocal(ev) {
            const tid = parseFloat(ev.currentTarget.dataset.tid);
            this.state.personel = this.state.personel.filter(p => p.tempId !== tid);
        }

        /* ── Validasi ────────────────────────────────────── */
        _validate() {
            const errors = {};
            if (!(this.state.keterangan_lokasi || '').trim())
                errors.keterangan_lokasi = 'Keterangan lokasi wajib diisi';
            if (!this.initData.is_subdit_form && !this.state.polres_id)
                errors.polres_id = 'Polres wajib dipilih';
            if (!this.state.kabupaten_id)
                errors.kabupaten_id = 'Kabupaten/Kota wajib dipilih';
            if (!this.state.kecamatan_id)
                errors.kecamatan_id = 'Kecamatan wajib dipilih';
            if (!this.state.desa_id)
                errors.desa_id = 'Desa/Kelurahan wajib dipilih';
            if (!this.state.latitude)
                errors.latitude = 'Lokasi GPS wajib diambil terlebih dahulu';
            if (!this.state.foto)
                errors.foto = 'Foto dokumentasi wajib diisi';
            if (this.state.personel.length === 0)
                errors.personel = 'Minimal 1 personel wajib ditambahkan sebelum menyimpan';
            this.state.errors = errors;
            return Object.keys(errors).length === 0;
        }

        /* ── Submit ──────────────────────────────────────── */
        async submit() {
            // Coba ambil GPS jika belum ada
            if (!this.state.latitude) {
                this.state.submitError = null;
                await new Promise((resolve) => {
                    if (!navigator.geolocation) { resolve(); return; }
                    this.state.gpsLoading = true;
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            this.state.latitude  = pos.coords.latitude.toFixed(6);
                            this.state.longitude = pos.coords.longitude.toFixed(6);
                            this.state.gpsLoading = false;
                            this._updateMapMarker(this.state.latitude, this.state.longitude);
                            resolve();
                        },
                        () => { this.state.gpsLoading = false; resolve(); },
                        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                    );
                });
            }

            if (!this._validate()) {
                const el = document.querySelector('.has-error');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            if (this.state.foto && this.state.foto.length > 600_000) {
                this.state.submitError = 'Foto masih terlalu besar. Coba hapus foto atau pilih foto yang lebih sederhana.';
                return;
            }

            this.state.submitting  = true;
            this.state.submitError = null;

            try {
                const resp = await this._jsonRpc('/strong/api/submit_public', {
                    token: this.initData.token,
                    data: {
                        tanggal_mulai:     this.state.tanggalMulai,
                        keterangan_lokasi: this.state.keterangan_lokasi,
                        keterangan:        this.state.keterangan,
                        polres_id:         this.state.polres_id,
                        polsek_id:         parseInt(this.state.polsek_id) || null,
                        kabupaten_id:      this.state.kabupaten_id,
                        kecamatan_id:      this.state.kecamatan_id,
                        desa_id:           this.state.desa_id,
                        latitude:          this.state.latitude,
                        longitude:         this.state.longitude,
                        foto:              this.state.foto,
                    },
                }, 90000);

                const result = (resp && resp.result) || {};
                if (result.success) {
                    this.state.submitCode = result.code;
                    this.state.recordId   = result.record_id;

                    // Simpan personel ke server (batch, satu per satu)
                    for (const p of this.state.personel) {
                        try {
                            await this._jsonRpc('/strong/api/personel_add', {
                                token:     this.initData.token,
                                record_id: result.record_id,
                                nama:      p.nama,
                                pangkat:   p.pangkat,
                            });
                        } catch (_) {}
                    }

                    // Lanjut ke fase selesai
                    if (!this.state.tanggalSelesai) {
                        const now = new Date();
                        const pad = n => String(n).padStart(2, '0');
                        this.state.tanggalSelesai =
                            `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
                            `T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                    }
                    this.state.selesaiError = null;
                    this.state.phase = 'selesai';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    this.state.submitError = result.message || 'Gagal mengirim data';
                }
            } catch (err) {
                if (err && err.name === 'AbortError') {
                    this.state.submitError = 'Pengiriman terlalu lama (timeout). Coba hapus foto lalu kirim ulang.';
                } else if (err && err.message && err.message.startsWith('HTTP ')) {
                    const code = err.message.replace('HTTP ', '');
                    this.state.submitError = code === '413'
                        ? 'Foto terlalu besar. Hapus foto atau pilih foto yang lebih kecil.'
                        : `Server error (${code}). Silakan coba beberapa saat lagi.`;
                } else {
                    this.state.submitError = 'Koneksi gagal. Periksa sinyal internet lalu coba lagi.';
                }
            } finally {
                this.state.submitting = false;
            }
        }

        /* ── Set Selesai ─────────────────────────────────── */
        async submitSelesai() {
            if (!this.state.tanggalSelesai) {
                this.state.selesaiError = 'Tanggal selesai wajib diisi';
                return;
            }
            this.state.settingSelesai = true;
            this.state.selesaiError   = null;
            try {
                const resp = await this._jsonRpc('/strong/api/set_selesai', {
                    token:           this.initData.token,
                    record_id:       this.state.recordId,
                    tanggal_selesai: this.state.tanggalSelesai,
                });
                const result = (resp && resp.result) || {};
                if (result.success) {
                    this.state.phase = 'done';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    this.state.selesaiError = result.error || 'Gagal menyimpan';
                }
            } catch (_) {
                this.state.selesaiError = 'Koneksi gagal. Coba lagi.';
            } finally {
                this.state.settingSelesai = false;
            }
        }

        /* ── Reset ───────────────────────────────────────── */
        resetForm() {
            if (this.state.fotoPreview) URL.revokeObjectURL(this.state.fotoPreview);
            const autoPolres = this.initData.is_subdit_form ? this.initData.auto_polres_id : null;
            Object.assign(this.state, {
                phase: 'form',
                keterangan_lokasi: '', keterangan: '',
                tanggalMulai: this._nowLocalDt(),
                polres_id: autoPolres, polsek_id: '', polsek_list: [],
                kabupaten_id: null, kabupaten_list: [],
                kecamatan_id: null, kecamatan_list: [],
                desa_id: null, desa_list: [],
                latitude: null, longitude: null,
                gpsError: null, foto: null, fotoPreview: null,
                fotoSizeLabel: null, fotoCompressed: false, fotoLoading: false,
                submitting: false, submitCode: null, submitError: null, errors: {},
                recordId: null, personel: [],
                personelNama: '', personelPangkat: '', personelError: null,
                tanggalSelesai: '', settingSelesai: false, selesaiError: null,
            });
            if (this._marker) { this._marker.remove(); this._marker = null; }
            if (this._map) {
                this._map.setView([-2.5, 104.5], 8);
                setTimeout(() => this._map.invalidateSize(), 50);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => this.getGPS(), 200);
            if (autoPolres) this._loadKabupaten(autoPolres);
        }

        /* ── Helpers ─────────────────────────────────────── */
        _nowLocalDt() {
            const pad = n => String(n).padStart(2, '0');
            const now = new Date();
            return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
                   `T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        }

        /* ── JSON-RPC ────────────────────────────────────── */
        async _jsonRpc(url, params, timeoutMs = 30000) {
            const ctrl  = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeoutMs);
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: Date.now(), params }),
                    signal: ctrl.signal,
                });
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            } finally {
                clearTimeout(timer);
            }
        }
    }

    function init() {
        const root = document.getElementById('spf-app');
        if (root) mount(StrongPublicFormApp, root);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
