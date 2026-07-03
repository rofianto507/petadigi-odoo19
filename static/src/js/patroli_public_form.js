(function () {
    'use strict';

    const { Component, useState, mount, xml, onMounted } = owl;

    class PatroliPublicFormApp extends Component {
        static template = xml/* xml */`
            <div class="sf-root">

                <!-- ═══════════════════════════════════════
                     DONE
                ═══════════════════════════════════════ -->
                <t t-if="state.phase === 'done'">
                    <div class="sf-success">
                        <div class="sf-success-card">
                            <div class="sf-success-icon">✓</div>
                            <h2 class="sf-success-title">Patroli Selesai</h2>
                            <div class="sf-success-code" t-out="state.submitCode"/>
                            <p class="sf-success-msg">
                                Data tersimpan ·
                                <strong t-out="state.personel.length"/> personel ·
                                <strong t-out="state.lokasi.length"/> titik lokasi
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
                     SET SELESAI
                ═══════════════════════════════════════ -->
                <t t-elif="state.phase === 'selesai'">
                    <div class="sf-appbar">
                        <div class="sf-appbar-icon"><i class="fa fa-flag-checkered"/></div>
                        <div class="sf-appbar-content">
                            <div class="sf-appbar-title">Set Selesai</div>
                            <div class="sf-appbar-sub" t-out="state.submitCode"/>
                        </div>
                    </div>
                    <div class="sf-body">
                        <div class="sf-phase-banner">
                            <i class="fa fa-info-circle sf-phase-banner-icon"/>
                            <span>
                                <strong t-out="state.personel.length"/> personel ·
                                <strong t-out="state.lokasi.length"/> titik lokasi
                            </span>
                        </div>
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
                        <div class="sf-submit-area">
                            <button class="sf-btn sf-btn-filled sf-btn-submit"
                                    t-on-click="submitSelesai"
                                    t-att-disabled="state.settingSelesai">
                                <t t-if="state.settingSelesai">Menyimpan...</t>
                                <t t-else=""><i class="fa fa-flag-checkered"/> Selesai</t>
                            </button>
                            <button class="sf-btn sf-btn-text sf-btn-block"
                                    t-on-click="() => state.phase = 'operasional'"
                                    t-att-disabled="state.settingSelesai"
                                    style="margin-top:8px">
                                ← Kembali ke Operasional
                            </button>
                            <div class="sf-footer">PetaDigi · Patroli</div>
                        </div>
                    </div>
                </t>

                <!-- ═══════════════════════════════════════
                     OPERASIONAL (personel + lokasi)
                ═══════════════════════════════════════ -->
                <t t-elif="state.phase === 'operasional'">
                    <div class="sf-appbar">
                        <div class="sf-appbar-icon"><i class="fa fa-shield"/></div>
                        <div class="sf-appbar-content">
                            <div class="sf-appbar-title">Operasional Patroli</div>
                            <div class="sf-appbar-sub" t-out="state.submitCode"/>
                        </div>
                    </div>
                    <div class="sf-body">

                        <div class="sf-phase-banner">
                            <i class="fa fa-check-circle sf-phase-banner-icon"/>
                            <span>Data patroli tersimpan · Kode: <strong t-out="state.submitCode"/></span>
                        </div>

                        <!-- ─── PERSONEL ─── -->
                        <div class="sf-section">
                            <div class="sf-section-label">
                                <i class="fa fa-users" style="margin-right:6px"/>
                                Personel
                                <span class="sf-personel-count-badge" t-out="state.personel.length"/>
                            </div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <div class="sf-personel-list">
                                        <t t-if="state.personel.length === 0">
                                            <div class="sf-personel-empty">Belum ada personel</div>
                                        </t>
                                        <t t-foreach="state.personel" t-as="p" t-key="p.id">
                                            <div class="sf-personel-row">
                                                <div class="sf-personel-avatar"><i class="fa fa-user"/></div>
                                                <div class="sf-personel-name" t-out="p.nama_lengkap"/>
                                                <button class="sf-personel-del"
                                                        t-att-data-pid="p.id"
                                                        t-att-disabled="state.removingPersonelId === p.id"
                                                        t-on-click="onRemovePersonel">
                                                    <i t-att-class="state.removingPersonelId === p.id ? 'fa fa-spinner fa-spin' : 'fa fa-times'"/>
                                                </button>
                                            </div>
                                        </t>
                                    </div>
                                    <div class="sf-personel-add-form">
                                        <input class="sf-input" type="text"
                                               placeholder="Nama personel *"
                                               t-att-value="state.personelNama"
                                               t-on-input="ev => { state.personelNama = ev.target.value.toUpperCase(); ev.target.value = state.personelNama; }"
                                               t-att-disabled="state.addingPersonel"/>
                                        <div class="sf-personel-add-row">
                                            <input class="sf-input" type="text"
                                                   placeholder="Pangkat / Jabatan (opsional)"
                                                   t-att-value="state.personelPangkat"
                                                   t-on-input="ev => { state.personelPangkat = ev.target.value.toUpperCase(); ev.target.value = state.personelPangkat; }"
                                                   t-att-disabled="state.addingPersonel"
                                                   style="flex:1"/>
                                            <button class="sf-btn-add-personel"
                                                    t-on-click="addPersonel"
                                                    t-att-disabled="state.addingPersonel">
                                                <i t-att-class="state.addingPersonel ? 'fa fa-spinner fa-spin' : 'fa fa-plus'"/>
                                            </button>
                                        </div>
                                        <div t-if="state.personelError" class="sf-personel-err"
                                             t-out="state.personelError"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ─── TITIK LOKASI ─── -->
                        <div class="sf-section">
                            <div class="sf-section-label-row">
                                <span>
                                    <i class="fa fa-map-marker" style="margin-right:6px"/>
                                    Titik Lokasi
                                    <span class="sf-lokasi-count-badge" t-out="state.lokasi.length"/>
                                </span>
                                <button class="sf-btn-pill" t-on-click="goToTambahLokasi">
                                    <i class="fa fa-plus"/> Tambah
                                </button>
                            </div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <t t-if="state.lokasi.length === 0">
                                        <div class="sf-lokasi-empty">Belum ada titik lokasi</div>
                                    </t>
                                    <t t-foreach="state.lokasi" t-as="l" t-key="l.id">
                                        <div class="sf-lokasi-item">
                                            <div class="sf-lokasi-numbered" t-out="l_index + 1"/>
                                            <div style="flex:1;min-width:0">
                                                <div class="sf-lokasi-meta">
                                                    <span class="sf-lokasi-meta-time">
                                                        <i class="fa fa-clock-o"/> <t t-out="l.tanggal_str"/>
                                                    </span>
                                                    <t t-if="l.hasFoto">
                                                        <i class="fa fa-camera sf-lokasi-meta-ico"/>
                                                    </t>
                                                </div>
                                                <div class="sf-lokasi-gps-line">
                                                    <i class="fa fa-crosshairs"/> <t t-out="l.latitude"/>, <t t-out="l.longitude"/>
                                                </div>
                                                <div t-if="l.catatan" class="sf-lokasi-catatan" t-out="l.catatan"/>
                                            </div>
                                            <button class="sf-lokasi-del"
                                                    t-att-data-lid="l.id"
                                                    t-att-disabled="state.removingLokasiId === l.id"
                                                    t-on-click="onRemoveLokasi">
                                                <i t-att-class="state.removingLokasiId === l.id ? 'fa fa-spinner fa-spin' : 'fa fa-times'"/>
                                            </button>
                                        </div>
                                    </t>
                                </div>
                            </div>
                        </div>

                        <!-- Lanjut set selesai -->
                        <div class="sf-submit-area">
                            <button class="sf-btn sf-btn-filled sf-btn-submit"
                                    t-on-click="goToSelesai"
                                    t-att-disabled="state.addingPersonel">
                                <i class="fa fa-flag-checkered"/> Lanjut Set Selesai
                            </button>
                            <div class="sf-footer">PetaDigi · Patroli</div>
                        </div>

                    </div>
                </t>

                <!-- ═══════════════════════════════════════
                     TAMBAH TITIK LOKASI
                ═══════════════════════════════════════ -->
                <t t-elif="state.phase === 'tambah_lokasi'">
                    <div class="sf-appbar">
                        <button class="sf-appbar-back" t-on-click="backToOperasional">
                            <i class="fa fa-arrow-left"/>
                        </button>
                        <div class="sf-appbar-content">
                            <div class="sf-appbar-title">Tambah Titik Lokasi</div>
                        </div>
                    </div>
                    <div class="sf-body">

                        <!-- Koordinat GPS -->
                        <div class="sf-section">
                            <div class="sf-section-label">
                                <i class="fa fa-crosshairs" style="margin-right:6px"/>
                                Koordinat GPS
                            </div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <!-- Status posisi -->
                                    <div class="sf-gps-posisi">
                                        <div t-att-class="'sf-gps-posisi-text' + (state.lokasiLat ? ' ok' : (state.lokasiGpsError ? ' err' : ' loading'))">
                                            <t t-if="state.lokasiGpsLoading">
                                                <i class="fa fa-spinner fa-spin"/> Mengambil lokasi GPS...
                                            </t>
                                            <t t-elif="state.lokasiLat">
                                                <i class="fa fa-check-circle"/>
                                                <t t-out="state.lokasiLat"/>, <t t-out="state.lokasiLng"/>
                                                <t t-if="state.lokasiAccuracy">
                                                    <span class="sf-accuracy">(±<t t-out="Math.round(state.lokasiAccuracy)"/>m)</span>
                                                </t>
                                            </t>
                                            <t t-elif="state.lokasiGpsError">
                                                <i class="fa fa-exclamation-circle"/> <t t-out="state.lokasiGpsError"/>
                                            </t>
                                            <t t-else="">
                                                <i class="fa fa-crosshairs"/> Menunggu lokasi GPS...
                                            </t>
                                        </div>
                                        <button class="sf-btn-gps"
                                                t-on-click="captureLokasiGps"
                                                t-att-disabled="state.lokasiGpsLoading">
                                            <i t-att-class="state.lokasiGpsLoading ? 'fa fa-spinner fa-spin' : 'fa fa-crosshairs'"/>
                                            Perbarui
                                        </button>
                                    </div>
                                    <!-- Peta -->
                                    <div id="ppf-lokasi-map" class="sf-map"/>
                                    <!-- Lat / Lng readonly boxes -->
                                    <div class="sf-coords-grid">
                                        <div class="sf-coord-box">
                                            <label>LATITUDE</label>
                                            <input class="sf-coord-input" type="text" readonly="1"
                                                   t-att-value="state.lokasiLat || ''"/>
                                        </div>
                                        <div class="sf-coord-box">
                                            <label>LONGITUDE</label>
                                            <input class="sf-coord-input" type="text" readonly="1"
                                                   t-att-value="state.lokasiLng || ''"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Tanggal -->
                        <div class="sf-section">
                            <div class="sf-section-label">Tanggal &amp; Waktu</div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <div class="sf-field">
                                        <label class="sf-label">Tanggal &amp; Jam</label>
                                        <input class="sf-input" type="datetime-local"
                                               t-att-value="state.lokasiTanggal"
                                               t-on-input="ev => state.lokasiTanggal = ev.target.value"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Foto -->
                        <div class="sf-section">
                            <div class="sf-section-label">Foto Dokumentasi</div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <div class="sf-foto-btns">
                                        <label class="sf-btn sf-btn-outlined">
                                            <i class="fa fa-camera"/> Kamera
                                            <input type="file" accept="image/*" capture="environment"
                                                   class="sf-file-hidden" t-on-change="handleLokasiFoto"/>
                                        </label>
                                        <label class="sf-btn sf-btn-outlined">
                                            <i class="fa fa-image"/> Galeri
                                            <input type="file" accept="image/*"
                                                   class="sf-file-hidden" t-on-change="handleLokasiFoto"/>
                                        </label>
                                    </div>
                                    <t t-if="state.lokasiFotoPreview">
                                        <div class="sf-foto-preview">
                                            <img t-att-src="state.lokasiFotoPreview"
                                                 class="sf-preview-img" alt="Foto"/>
                                            <div class="sf-foto-meta">
                                                <t t-if="state.lokasiFotoLoading">
                                                    <span class="sf-foto-size sf-foto-size--loading">⏳ Mengompresi...</span>
                                                </t>
                                                <button class="sf-btn sf-btn-text" t-on-click="removeLokasiFoto">
                                                    Hapus Foto
                                                </button>
                                            </div>
                                        </div>
                                    </t>
                                </div>
                            </div>
                        </div>

                        <!-- Catatan -->
                        <div class="sf-section">
                            <div class="sf-section-label">Catatan</div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <div class="sf-field">
                                        <textarea class="sf-input sf-textarea" rows="3"
                                                  t-att-value="state.lokasiCatatan"
                                                  t-on-input="ev => state.lokasiCatatan = ev.target.value"
                                                  placeholder="Catatan lokasi (opsional)"/>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Submit -->
                        <div class="sf-submit-area">
                            <div t-if="state.lokasiError" class="sf-error-banner">
                                <div class="sf-error-banner-icon"/>
                                <span t-out="state.lokasiError"/>
                            </div>
                            <button class="sf-btn sf-btn-filled sf-btn-submit"
                                    t-on-click="addLokasi"
                                    t-att-disabled="state.addingLokasi || state.lokasiGpsLoading || state.lokasiFotoLoading">
                                <t t-if="state.addingLokasi">Menyimpan...</t>
                                <t t-elif="state.lokasiGpsLoading">Menunggu GPS...</t>
                                <t t-elif="state.lokasiFotoLoading">Memproses foto...</t>
                                <t t-else=""><i class="fa fa-paper-plane"/> Simpan Titik</t>
                            </button>
                            <div class="sf-footer">PetaDigi · Patroli</div>
                        </div>

                    </div>
                </t>

                <!-- ═══════════════════════════════════════
                     FORM (data awal)
                ═══════════════════════════════════════ -->
                <t t-else="">
                    <div class="sf-appbar">
                        <div class="sf-appbar-icon"><i class="fa fa-shield"/></div>
                        <div class="sf-appbar-content">
                            <div class="sf-appbar-title" t-out="initData.config_name"/>
                            <div class="sf-appbar-sub">Form Publik Patroli</div>
                        </div>
                    </div>
                    <div class="sf-body">

                        <!-- Satuan (hidden for subdit form — polres auto-assigned) -->
                        <t t-if="!initData.is_subdit_form">
                        <div class="sf-section">
                            <div class="sf-section-label">Satuan</div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <div t-att-class="'sf-field' + (state.errors.polres_id ? ' has-error' : '')">
                                        <label class="sf-label">Polres <span class="sf-req">*</span></label>
                                        <select class="sf-input sf-select" t-on-change="onPolresChange">
                                            <option value="">Pilih Polres</option>
                                            <t t-foreach="initData.polres_list" t-as="polres" t-key="polres.id">
                                                <option t-att-value="polres.id"
                                                        t-att-selected="state.polres_id === polres.id"
                                                        t-out="polres.name"/>
                                            </t>
                                        </select>
                                        <div t-if="state.errors.polres_id" class="sf-errmsg" t-out="state.errors.polres_id"/>
                                    </div>
                                    <div class="sf-field">
                                        <label class="sf-label">Polsek <span class="sf-opt">Opsional</span></label>
                                        <select class="sf-input sf-select"
                                                t-att-disabled="!state.polres_id || state.loadingPolsek"
                                                t-on-change="ev => state.polsek_id = parseInt(ev.target.value) || null">
                                            <option value="">
                                                <t t-if="state.loadingPolsek">Memuat...</t>
                                                <t t-else="">Pilih Polsek</t>
                                            </option>
                                            <t t-foreach="state.polsek_list" t-as="polsek" t-key="polsek.id">
                                                <option t-att-value="polsek.id"
                                                        t-att-selected="state.polsek_id === polsek.id"
                                                        t-out="polsek.name"/>
                                            </t>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </t>

                        <!-- Wilayah -->
                        <div class="sf-section">
                            <div class="sf-section-label">Wilayah Patroli</div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <div t-att-class="'sf-field' + (state.errors.kabupaten_id ? ' has-error' : '')">
                                        <label class="sf-label">Kabupaten/Kota <span class="sf-req">*</span></label>
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
                                        <div t-if="state.errors.kabupaten_id" class="sf-errmsg" t-out="state.errors.kabupaten_id"/>
                                    </div>
                                    <div class="sf-field">
                                        <label class="sf-label">Kecamatan <span class="sf-opt">Opsional</span></label>
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
                                        <label class="sf-label">Desa/Kelurahan <span class="sf-opt">Opsional</span></label>
                                        <select class="sf-input sf-select"
                                                t-att-disabled="!state.kecamatan_id || state.loadingDesa"
                                                t-on-change="ev => state.desa_id = parseInt(ev.target.value) || null">
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

                        <!-- Keterangan -->
                        <div class="sf-section">
                            <div class="sf-section-label">Keterangan</div>
                            <div class="sf-card">
                                <div class="sf-card-body">
                                    <div class="sf-field">
                                        <label class="sf-label">Keterangan <span class="sf-opt">Opsional</span></label>
                                        <textarea class="sf-input sf-textarea" rows="3"
                                                  t-att-value="state.keterangan"
                                                  t-on-input="ev => state.keterangan = ev.target.value"
                                                  placeholder="Catatan umum kegiatan patroli..."/>
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
                                    t-att-disabled="state.submitting">
                                <t t-if="state.submitting">Menyimpan...</t>
                                <t t-else=""><i class="fa fa-paper-plane"/> Mulai Patroli</t>
                            </button>
                            <div class="sf-footer">PetaDigi · Patroli</div>
                        </div>

                    </div>
                </t>

            </div>
        `;

        setup() {
            this.initData = JSON.parse(document.getElementById('ppf-app').dataset.init);
            this.state = useState({
                /* ── fase ── */
                phase: 'form',
                /* ── form data ── */
                polres_id: null, polsek_id: null, polsek_list: [],
                kabupaten_id: null, kabupaten_list: [],
                kecamatan_id: null, kecamatan_list: [],
                desa_id: null, desa_list: [],
                loadingPolsek: false, loadingKabupaten: false,
                loadingKecamatan: false, loadingDesa: false,
                keterangan: '',
                submitting: false, submitCode: null, submitError: null,
                errors: {},
                /* ── hasil submit ── */
                recordId: null,
                /* ── personel ── */
                personel: [],
                personelNama: '', personelPangkat: '',
                addingPersonel: false, removingPersonelId: null, personelError: null,
                /* ── lokasi titik ── */
                lokasi: [],
                lokasiLat: null, lokasiLng: null, lokasiAccuracy: null,
                lokasiGpsLoading: false, lokasiGpsError: null,
                lokasiTanggal: '',
                lokasiCatatan: '',
                lokasiFoto: null, lokasiFotoPreview: null, lokasiFotoLoading: false,
                addingLokasi: false, removingLokasiId: null, lokasiError: null,
                /* ── selesai ── */
                tanggalSelesai: '', settingSelesai: false, selesaiError: null,
            });

            if (this.initData.is_subdit_form && this.initData.auto_polres_id) {
                this.state.polres_id = this.initData.auto_polres_id;
            }

            onMounted(() => {
                if (this.initData.is_subdit_form && this.initData.auto_polres_id) {
                    this._loadKabupaten(this.initData.auto_polres_id);
                }
            });
        }

        /* ── Cascading dropdowns ─────────────────────────── */
        async onPolresChange(ev) {
            const id = parseInt(ev.target.value) || null;
            Object.assign(this.state, {
                polres_id: id,
                polsek_id: null, polsek_list: [],
                kabupaten_id: null, kabupaten_list: [],
                kecamatan_id: null, kecamatan_list: [],
                desa_id: null, desa_list: [],
            });
            if (!id) return;
            this.state.loadingPolsek    = true;
            this.state.loadingKabupaten = true;
            const [polsekResp, kabResp] = await Promise.all([
                this._jsonRpc('/patroli/api/polsek',    { polres_id: id, token: this.initData.token }).catch(() => null),
                this._jsonRpc('/patroli/api/kabupaten', { polres_id: id, token: this.initData.token }).catch(() => null),
            ]);
            this.state.polsek_list      = (polsekResp && polsekResp.result) || [];
            this.state.kabupaten_list   = (kabResp    && kabResp.result)    || [];
            this.state.loadingPolsek    = false;
            this.state.loadingKabupaten = false;
        }

        async onKabupatenChange(ev) {
            const id = parseInt(ev.target.value) || null;
            this.state.kabupaten_id   = id;
            this.state.kecamatan_id   = null; this.state.kecamatan_list = [];
            this.state.desa_id        = null; this.state.desa_list      = [];
            if (!id) return;
            this.state.loadingKecamatan = true;
            try {
                const resp = await this._jsonRpc('/patroli/api/kecamatan',
                    { kabupaten_id: id, token: this.initData.token });
                this.state.kecamatan_list = (resp && resp.result) || [];
            } catch (_) {} finally { this.state.loadingKecamatan = false; }
        }

        async onKecamatanChange(ev) {
            const id = parseInt(ev.target.value) || null;
            this.state.kecamatan_id = id;
            this.state.desa_id      = null; this.state.desa_list = [];
            if (!id) return;
            this.state.loadingDesa = true;
            try {
                const resp = await this._jsonRpc('/patroli/api/desa',
                    { kecamatan_id: id, token: this.initData.token });
                this.state.desa_list = (resp && resp.result) || [];
            } catch (_) {} finally { this.state.loadingDesa = false; }
        }

        async _loadKabupaten(polresId) {
            this.state.loadingKabupaten = true;
            try {
                const resp = await this._jsonRpc('/patroli/api/kabupaten',
                    { polres_id: polresId, token: this.initData.token });
                this.state.kabupaten_list = (resp && resp.result) || [];
            } catch (_) {} finally {
                this.state.loadingKabupaten = false;
            }
        }

        /* ── Validasi + Submit form awal ─────────────────── */
        _validate() {
            const errors = {};
            if (!this.initData.is_subdit_form && !this.state.polres_id)
                errors.polres_id = 'Polres wajib dipilih';
            if (!this.state.kabupaten_id) errors.kabupaten_id = 'Kabupaten/Kota wajib dipilih';
            this.state.errors = errors;
            return Object.keys(errors).length === 0;
        }

        async submit() {
            if (!this._validate()) {
                document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            this.state.submitting  = true;
            this.state.submitError = null;
            try {
                const resp = await this._jsonRpc('/patroli/api/submit', {
                    token: this.initData.token,
                    data: {
                        polres_id:    this.state.polres_id,
                        polsek_id:    this.state.polsek_id,
                        kabupaten_id: this.state.kabupaten_id,
                        kecamatan_id: this.state.kecamatan_id,
                        desa_id:      this.state.desa_id,
                        keterangan:   this.state.keterangan,
                    },
                });
                const result = (resp && resp.result) || {};
                if (result.success) {
                    this.state.recordId     = result.record_id;
                    this.state.submitCode   = result.code;
                    this.state.lokasiTanggal = this._nowLocalDt();
                    this.state.phase        = 'operasional';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    this.state.submitError = result.error || 'Gagal menyimpan data';
                }
            } catch (_) {
                this.state.submitError = 'Koneksi gagal. Periksa sinyal internet lalu coba lagi.';
            } finally {
                this.state.submitting = false;
            }
        }

        /* ── Personel ────────────────────────────────────── */
        async addPersonel() {
            const nama = (this.state.personelNama || '').trim();
            if (!nama) { this.state.personelError = 'Nama personel wajib diisi'; return; }
            this.state.addingPersonel = true;
            this.state.personelError  = null;
            try {
                const resp = await this._jsonRpc('/patroli/api/personel_add', {
                    token:     this.initData.token,
                    record_id: this.state.recordId,
                    nama,
                    pangkat:   (this.state.personelPangkat || '').trim(),
                });
                const result = (resp && resp.result) || {};
                if (result.success) {
                    this.state.personel        = [...this.state.personel, { id: result.id, nama_lengkap: result.nama_lengkap }];
                    this.state.personelNama    = '';
                    this.state.personelPangkat = '';
                } else {
                    this.state.personelError = result.error || 'Gagal menambah personel';
                }
            } catch (_) {
                this.state.personelError = 'Koneksi gagal. Coba lagi.';
            } finally {
                this.state.addingPersonel = false;
            }
        }

        onRemovePersonel(ev) {
            const id = parseInt(ev.currentTarget.dataset.pid);
            if (!id || !confirm('Hapus personel ini?')) return;
            this._removePersonel(id);
        }

        async _removePersonel(id) {
            this.state.removingPersonelId = id;
            try {
                const resp = await this._jsonRpc('/patroli/api/personel_remove',
                    { token: this.initData.token, personel_id: id });
                if ((resp && resp.result && resp.result.success)) {
                    this.state.personel = this.state.personel.filter(p => p.id !== id);
                }
            } catch (_) {} finally { this.state.removingPersonelId = null; }
        }

        /* ── Navigasi tambah lokasi ──────────────────────── */
        goToTambahLokasi() {
            this.state.lokasiLat         = null;
            this.state.lokasiLng         = null;
            this.state.lokasiAccuracy    = null;
            this.state.lokasiGpsError    = null;
            this.state.lokasiTanggal     = this._nowLocalDt();
            this.state.lokasiCatatan     = '';
            this.state.lokasiFoto        = null;
            this.state.lokasiFotoPreview = null;
            this.state.lokasiError       = null;
            this.state.phase             = 'tambah_lokasi';
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
                this._initLokasiMap();
                this.captureLokasiGps();
            }, 120);
        }

        backToOperasional() {
            if (this._lokasiMap) {
                this._lokasiMap.remove();
                this._lokasiMap   = null;
                this._lokasiMarker = null;
            }
            this.state.phase = 'operasional';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        /* ── Leaflet map untuk tambah lokasi ─────────────── */
        _initLokasiMap() {
            if (!window.L) return;
            const el = document.getElementById('ppf-lokasi-map');
            if (!el) return;
            if (this._lokasiMap) { this._lokasiMap.remove(); this._lokasiMap = null; this._lokasiMarker = null; }
            this._lokasiMap = L.map('ppf-lokasi-map', { center: [-2.5, 104.5], zoom: 8 });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19,
            }).addTo(this._lokasiMap);
        }

        _updateLokasiMapMarker(lat, lng) {
            if (!this._lokasiMap) return;
            if (!this._lokasiMarkerIcon) {
                this._lokasiMarkerIcon = L.icon({
                    iconUrl:    '/petadigi/static/lib/leaflet/images/marker-icon.png',
                    shadowUrl:  '/petadigi/static/lib/leaflet/images/marker-shadow.png',
                    iconSize:   [25, 41], iconAnchor:  [12, 41],
                    popupAnchor:[1, -34], shadowSize:  [41, 41],
                });
            }
            const latlng = [parseFloat(lat), parseFloat(lng)];
            if (this._lokasiMarker) {
                this._lokasiMarker.setLatLng(latlng);
            } else {
                this._lokasiMarker = L.marker(latlng, { icon: this._lokasiMarkerIcon, draggable: true })
                    .addTo(this._lokasiMap);
                this._lokasiMarker.on('dragend', (e) => {
                    const pos = e.target.getLatLng();
                    this.state.lokasiLat = pos.lat.toFixed(6);
                    this.state.lokasiLng = pos.lng.toFixed(6);
                });
            }
            this._lokasiMarker.bindPopup('Geser marker untuk menyesuaikan titik').openPopup();
            this._lokasiMap.setView(latlng, 16, { animate: true });
        }

        /* ── GPS untuk titik lokasi ──────────────────────── */
        captureLokasiGps() {
            if (!navigator.geolocation) {
                this.state.lokasiGpsError = 'GPS tidak tersedia di perangkat ini';
                return;
            }
            if (this.state.lokasiGpsLoading) return;
            this.state.lokasiGpsLoading = true;
            this.state.lokasiGpsError   = null;
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.state.lokasiLat        = pos.coords.latitude.toFixed(6);
                    this.state.lokasiLng        = pos.coords.longitude.toFixed(6);
                    this.state.lokasiAccuracy   = pos.coords.accuracy;
                    this.state.lokasiGpsLoading = false;
                    this._updateLokasiMapMarker(this.state.lokasiLat, this.state.lokasiLng);
                },
                (err) => {
                    this.state.lokasiGpsError   = 'GPS gagal: ' + (err.message || 'Periksa izin GPS');
                    this.state.lokasiGpsLoading = false;
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        }

        /* ── Foto untuk titik lokasi ─────────────────────── */
        async handleLokasiFoto(ev) {
            const file = ev.target.files && ev.target.files[0];
            if (!file) return;
            this.state.lokasiFotoLoading = true;
            this.state.lokasiFotoPreview = URL.createObjectURL(file);
            this.state.lokasiFoto        = null;
            try {
                const b64 = await this._resizeImage(file);
                this.state.lokasiFoto = b64;
            } catch (_) {
                this.state.lokasiFoto        = null;
                this.state.lokasiFotoPreview = null;
                this.state.lokasiError       = 'Gagal memproses foto. Coba pilih foto lain.';
                ev.target.value = '';
            } finally {
                this.state.lokasiFotoLoading = false;
            }
        }

        removeLokasiFoto() {
            if (this.state.lokasiFotoPreview) URL.revokeObjectURL(this.state.lokasiFotoPreview);
            this.state.lokasiFoto        = null;
            this.state.lokasiFotoPreview = null;
        }

        /* ── Tambah titik lokasi ─────────────────────────── */
        async addLokasi() {
            if (!this.state.lokasiLat) {
                this.state.lokasiError = 'GPS belum tersedia. Tekan tombol "Perbarui" untuk mengambil lokasi.';
                return;
            }
            this.state.addingLokasi = true;
            this.state.lokasiError  = null;
            try {
                const tanggalStr = this.state.lokasiTanggal || this._nowLocalDt();
                const resp = await this._jsonRpc('/patroli/api/lokasi_add', {
                    token:     this.initData.token,
                    record_id: this.state.recordId,
                    latitude:  this.state.lokasiLat,
                    longitude: this.state.lokasiLng,
                    tanggal:   tanggalStr,
                    catatan:   this.state.lokasiCatatan || '',
                    foto:      this.state.lokasiFoto    || null,
                }, 60000);
                const result = (resp && resp.result) || {};
                if (result.success) {
                    // Format tanggal display: "3 Jul 2026 12:26"
                    const dispStr = this._fmtDtLocal(tanggalStr);
                    this.state.lokasi = [...this.state.lokasi, {
                        id:          result.id,
                        tanggal_str: dispStr,
                        latitude:    this.state.lokasiLat,
                        longitude:   this.state.lokasiLng,
                        catatan:     this.state.lokasiCatatan,
                        hasFoto:     !!this.state.lokasiFoto,
                        fotoPreview: this.state.lokasiFotoPreview,
                    }];
                    // Kembali ke operasional
                    if (this._lokasiMap) { this._lokasiMap.remove(); this._lokasiMap = null; this._lokasiMarker = null; }
                    this.state.phase = 'operasional';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    this.state.lokasiError = result.error || 'Gagal menambah titik lokasi';
                }
            } catch (_) {
                this.state.lokasiError = 'Koneksi gagal. Coba lagi.';
            } finally {
                this.state.addingLokasi = false;
            }
        }

        onRemoveLokasi(ev) {
            const id = parseInt(ev.currentTarget.dataset.lid);
            if (!id || !confirm('Hapus titik lokasi ini?')) return;
            this._removeLokasi(id);
        }

        async _removeLokasi(id) {
            this.state.removingLokasiId = id;
            try {
                const resp = await this._jsonRpc('/patroli/api/lokasi_remove',
                    { token: this.initData.token, lokasi_id: id });
                if (resp && resp.result && resp.result.success) {
                    const item = this.state.lokasi.find(l => l.id === id);
                    if (item && item.fotoPreview) URL.revokeObjectURL(item.fotoPreview);
                    this.state.lokasi = this.state.lokasi.filter(l => l.id !== id);
                }
            } catch (_) {} finally { this.state.removingLokasiId = null; }
        }

        /* ── Set Selesai ─────────────────────────────────── */
        goToSelesai() {
            if (!this.state.tanggalSelesai) {
                const now = new Date();
                const pad = n => String(n).padStart(2, '0');
                this.state.tanggalSelesai =
                    `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}` +
                    `T${pad(now.getHours())}:${pad(now.getMinutes())}`;
            }
            this.state.selesaiError = null;
            this.state.phase = 'selesai';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        async submitSelesai() {
            if (!this.state.tanggalSelesai) {
                this.state.selesaiError = 'Tanggal selesai wajib diisi';
                return;
            }
            this.state.settingSelesai = true;
            this.state.selesaiError   = null;
            try {
                const resp = await this._jsonRpc('/patroli/api/set_selesai', {
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
            this.state.lokasi.forEach(l => { if (l.fotoPreview) URL.revokeObjectURL(l.fotoPreview); });
            if (this.state.lokasiFotoPreview) URL.revokeObjectURL(this.state.lokasiFotoPreview);
            if (this._lokasiMap) { this._lokasiMap.remove(); this._lokasiMap = null; this._lokasiMarker = null; }
            const autoPolres = this.initData.is_subdit_form ? this.initData.auto_polres_id : null;
            Object.assign(this.state, {
                phase: 'form',
                polres_id: autoPolres, polsek_id: null, polsek_list: [],
                kabupaten_id: null, kabupaten_list: [],
                kecamatan_id: null, kecamatan_list: [],
                desa_id: null, desa_list: [],
                keterangan: '', submitting: false, submitCode: null,
                submitError: null, errors: {}, recordId: null,
                personel: [], personelNama: '', personelPangkat: '',
                addingPersonel: false, removingPersonelId: null, personelError: null,
                lokasi: [], lokasiLat: null, lokasiLng: null,
                lokasiGpsLoading: false, lokasiGpsError: null,
                lokasiAccuracy: null, lokasiTanggal: '', lokasiCatatan: '',
                lokasiFoto: null, lokasiFotoPreview: null,
                lokasiFotoLoading: false, addingLokasi: false,
                removingLokasiId: null, lokasiError: null,
                tanggalSelesai: '', settingSelesai: false, selesaiError: null,
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (autoPolres) this._loadKabupaten(autoPolres);
        }

        /* ── Helpers ─────────────────────────────────────── */
        _nowLocalDt() {
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}` +
                   `T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        }

        _fmtDtLocal(dtStr) {
            // '2026-07-03T12:26' → '3 Jul 2026 12:26'
            if (!dtStr) return '';
            const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            const [datePart, timePart] = dtStr.split('T');
            if (!datePart) return dtStr;
            const [y, m, d] = datePart.split('-');
            const mon = months[parseInt(m, 10) - 1] || m;
            return `${parseInt(d, 10)} ${mon} ${y} ${timePart || ''}`.trim();
        }

        /* ── Image resize ────────────────────────────────── */
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
        const root = document.getElementById('ppf-app');
        if (root) mount(PatroliPublicFormApp, root);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
