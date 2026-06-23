/** @odoo-module **/

import { Component, onMounted, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

import { initFilters } from "./dashboard_helpers";
import { loadKabupatenLayer } from "./dashboard_layer_umum";
import { loadModeKriminal, removeKriminalLegend } from "./dashboard_layer_kriminal";
import { loadModeKam, removeKamLegend } from "./dashboard_layer_kam";
import { loadModeLalin, removeLalinLegend } from "./dashboard_layer_lalin";
import { loadModeBencana, removeBencanaLegend } from "./dashboard_layer_bencana";
import { loadModeLokasi, removeLokasiLegend } from "./dashboard_layer_lokasi";
import { loadModeSumur, removeSumurLegend } from "./dashboard_layer_sumur_minyak";
import { loadModeStrong, removeStrongLegend } from "./dashboard_layer_strong_point";
import { removeLokasiOverlay } from "./dashboard_overlay_lokasi";
import { updateKriminalCharts, disposeKriminalCharts, updateKriminalTable } from "./dashboard_charts_kriminal";
import { updateKamCharts, disposeKamCharts, updateKamTable } from "./dashboard_charts_kam";
import { updateBencanaCharts, disposeBencanaCharts, updateBencanaTable } from "./dashboard_charts_bencana";
import { updateLalinCharts, disposeLalinCharts, updateLalinTable } from "./dashboard_charts_lalin";
import { updateLokasiCharts, disposeLokasiCharts, updateLokasiTable } from "./dashboard_charts_lokasi";
import { updateSumurCharts, disposeSumurCharts, updateSumurTable } from "./dashboard_charts_sumur_minyak";
import { updateStrongCharts, disposeStrongCharts, updateStrongTable } from "./dashboard_charts_strong_point";

export class DashboardMap extends Component {
    static template = "petadigi.DashboardMap";
    static props = ["*"];

    setup() {
        this.mapRef          = useRef("mapContainer");
        this.sidebarRef      = useRef("sidebar");
        this.breadcrumbRef   = useRef("breadcrumb");
        this.collapseIcon    = useRef("collapseIcon");
        this.collapseText    = useRef("collapseText");
        this.filterJenisLP          = useRef("filterJenisLP");
        this.filterKategori         = useRef("filterKategori");
        this.filterSubKategori      = useRef("filterSubKategori");
        this.filterTahun            = useRef("filterTahun");
        this.filterKabupaten        = useRef("filterKabupaten");
        this.filterState            = useRef("filterState");
        this.filterDateRange        = useRef("filterDateRange");
        this.filterDateClear        = useRef("filterDateClear");
        this.filterDateRangeWrapper = useRef("filterDateRangeWrapper");
        this.filterSummaryRef       = useRef("filterSummary");
        this.sumberInfoRef          = useRef("sumberInfo");
        this.kpiRowRef              = useRef("kpiRow");
        this.mapWrapperRef          = useRef("mapWrapper");
        this.chartRowRef            = useRef("chartRow");
        this.chartBarRef            = useRef("chartBar");
        this.chartDonutRef          = useRef("chartDonut");
        this.chartDonutTitleRef     = useRef("chartDonutTitle");
        this.chartRow2Ref           = useRef("chartRow2");
        this.chartTkpRef            = useRef("chartTkp");
        this.chartSubKatRef         = useRef("chartSubKat");
        this.chartRow3Ref           = useRef("chartRow3");
        this.chartTrendRef          = useRef("chartTrend");
        this.chartWaktuRef          = useRef("chartWaktu");
        this.chartRow4Ref           = useRef("chartRow4");
        this.chartCuratRef          = useRef("chartCurat");
        this.chartCurasRef          = useRef("chartCuras");
        this.chartCuranmorRef       = useRef("chartCuranmor");
        this.chartRow5Ref           = useRef("chartRow5");
        this.chartTahunanRef        = useRef("chartTahunan");
        this.chartKamRowRef         = useRef("chartKamRow");
        this.chartKamBarRef         = useRef("chartKamBar");
        this.chartKamDonutRef       = useRef("chartKamDonut");
        this.chartKamDonutTitleRef  = useRef("chartKamDonutTitle");
        this.chartKamRow2Ref        = useRef("chartKamRow2");
        this.chartKamModusRef       = useRef("chartKamModus");
        this.chartKamTkpRef         = useRef("chartKamTkp");
        this.chartKamRow3Ref           = useRef("chartKamRow3");
        this.chartKamTahunanRef        = useRef("chartKamTahunan");
        this.chartBencanaRowRef        = useRef("chartBencanaRow");
        this.chartBencanaBarRef        = useRef("chartBencanaBar");
        this.chartBencanaDonutRef      = useRef("chartBencanaDonut");
        this.chartBencanaDonutTitleRef = useRef("chartBencanaDonutTitle");
        this.chartLalinRowRef          = useRef("chartLalinRow");
        this.chartLalinBarRef          = useRef("chartLalinBar");
        this.chartLalinDonutRef        = useRef("chartLalinDonut");
        this.chartLalinDonutTitleRef   = useRef("chartLalinDonutTitle");
        this.chartLalinRow2Ref         = useRef("chartLalinRow2");
        this.chartLalinJenisJalanRef   = useRef("chartLalinJenisJalan");
        this.chartLalinWaktuRef        = useRef("chartLalinWaktu");
        this.chartLokasiRowRef         = useRef("chartLokasiRow");
        this.chartLokasiBarRef         = useRef("chartLokasiBar");
        this.chartLokasiDonutRef       = useRef("chartLokasiDonut");
        this.chartLokasiDonutTitleRef  = useRef("chartLokasiDonutTitle");
        this.filterKategoriSumur       = useRef("filterKategoriSumur");
        this.chartSumurRowRef          = useRef("chartSumurRow");
        this.chartSumurBarRef          = useRef("chartSumurBar");
        this.chartSumurDonutRef        = useRef("chartSumurDonut");
        this.chartStrongRowRef         = useRef("chartStrongRow");
        this.chartStrongBarRef         = useRef("chartStrongBar");
        this.chartStrongTrendRef       = useRef("chartStrongTrend");
        this.tableStrongRowRef         = useRef("tableStrongRow");
        this.tableStrongBodyRef        = useRef("tableStrongBody");
        this.tableKriminalRowRef       = useRef("tableKriminalRow");
        this.tableKriminalBodyRef      = useRef("tableKriminalBody");
        this.tableKamRowRef            = useRef("tableKamRow");
        this.tableKamBodyRef           = useRef("tableKamBody");
        this.tableBencanaRowRef        = useRef("tableBencanaRow");
        this.tableBencanaBodyRef       = useRef("tableBencanaBody");
        this.tableLalinRowRef          = useRef("tableLalinRow");
        this.tableLalinBodyRef         = useRef("tableLalinBody");
        this.tableLokasiRowRef         = useRef("tableLokasiRow");
        this.tableLokasiBodyRef        = useRef("tableLokasiBody");
        this.tableSumurRowRef          = useRef("tableSumurRow");
        this.tableSumurBodyRef         = useRef("tableSumurBody");

        this.orm    = useService("orm");
        this.action = useService("action");

        this.sidebarOpen    = true;
        this.currentMode    = 'umum';
        this.currentLevel   = 'kabupaten';
        this.backButton     = null;
        this.comingSoonControl = null;
        this.activeDateFrom = '';
        this.activeDateTo   = '';
        this._filterMode    = null;
        this._echartsBar    = null;
        this._echartsDonut  = null;
        this._echartsTkp    = null;
        this._echartsSubKat = null;
        this._echartsTrend  = null;
        this._echartsWaktu  = null;
        this._echartsCurat    = null;
        this._echartsCuras    = null;
        this._echartsCuranmor = null;
        this._echartsTahunan  = null;
        this._echartsKamBar     = null;
        this._echartsKamDonut   = null;
        this._echartsKamModus   = null;
        this._echartsKamTkp     = null;
        this._echartsKamTahunan = null;
        this._echartsBencanaBar   = null;
        this._echartsBencanaDonut = null;
        this._echartsLalinBar        = null;
        this._echartsLalinDonut      = null;
        this._echartsLalinJenisJalan = null;
        this._echartsLalinWaktu      = null;
        this._echartsLokasiBar       = null;
        this._echartsLokasiDonut     = null;
        this._echartsSumurBar        = null;
        this._echartsSumurDonut      = null;
        this._echartsStrongBar       = null;
        this._echartsStrongTrend     = null;

        // Drill-down context — set oleh layer file saat user klik polygon
        this.drillKabupatenId = null;
        this.drillKecamatanId = null;
        this._kriminalTablePage = 1;
        this._kamTablePage      = 1;
        this._bencanaTablePage  = 1;
        this._lalinTablePage    = 1;
        this._lokasiTablePage   = 1;
        this._sumurTablePage    = 1;
        this._strongTablePage   = 1;

        // Overlay lokasi penting (multi-mode)
        this.lokasiOverlaySelected = new Set();
        this.lokasiOverlayControl  = null;

        this._KATEGORI_MODEL = {
            kriminal: 'petadigi.kategori_kriminal',
            kam:      'petadigi.kategori_kamtibmas',
            bencana:  'petadigi.kategori_bencana',
            lalin:    'petadigi.kategori_lalu_lintas',
            lokasi:   'petadigi.kategori_lokasi',
            // sumur tidak punya kategori — tidak didaftarkan
        };

        onMounted(async () => {
            await initFilters(this);
            this._initFlatpickr();
            await this._updateFilterVisibility('umum');
            await this._initMap();
            // User may have clicked a different menu while map/KPI was loading.
            // If so, _switchMode already handled the new mode — skip umum init.
            if (this.currentMode !== 'umum') return;
            await this._updateKpiCards('umum');
            if (this.currentMode !== 'umum') return;
            this._updateFilterSummary('umum');
            this._updateSumberDokumenInfo('umum');
            this._updateCharts('umum');
        });
    }

    // ─────────────────────────────────────────────
    // FLATPICKR DATE RANGE
    // ─────────────────────────────────────────────
    _initFlatpickr() {
        const el = this.filterDateRange.el;
        if (!el || typeof flatpickr === 'undefined') return;

        this._suppressDateChange = false;
        this._fp = flatpickr(el, {
            mode: 'range',
            dateFormat: 'Y-m-d',
            allowInput: false,
            disableMobile: true,
            onChange: (selectedDates) => {
                if (this._suppressDateChange) return;
                const fmt = d => d.toISOString().slice(0, 10);
                this.activeDateFrom = selectedDates[0] ? fmt(selectedDates[0]) : '';
                this.activeDateTo   = selectedDates[1] ? fmt(selectedDates[1]) : '';
                if (selectedDates.length === 0 || selectedDates.length === 2) {
                    this.onFilterChange();
                }
            },
        });
    }

    onClearDate() {
        this._suppressDateChange = true;
        if (this._fp) this._fp.clear();
        this._suppressDateChange = false;
        this.activeDateFrom = '';
        this.activeDateTo   = '';
        this.onFilterChange();
    }

    // ─────────────────────────────────────────────
    // SIDEBAR TOGGLE
    // ─────────────────────────────────────────────
    onToggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        const sidebar = this.sidebarRef.el;
        const icon    = this.collapseIcon.el;

        if (this.sidebarOpen) {
            sidebar.classList.remove('collapsed');
            icon.style.transform = '';
        } else {
            sidebar.classList.add('collapsed');
            icon.style.transform = 'rotate(180deg)';
        }
        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 320);
    }

    // ─────────────────────────────────────────────
    // NAV & FILTER
    // ─────────────────────────────────────────────
    onNavClick(ev) {
        const item = ev.currentTarget;
        const mode = item.dataset.mode;
        if (!mode || mode === this.currentMode) return;

        this.sidebarRef.el.querySelectorAll('.petadigi-nav-item').forEach(el => {
            el.classList.remove('active');
        });
        item.classList.add('active');

        this.currentMode = mode;
        this._switchMode(mode);
    }

    async onKategoriChange() {
        if (this.currentMode === 'kriminal') {
            await this._populateSubKategori();
        }
        this.onFilterChange();
    }

    onFilterChange() {
        this._switchMode(this.currentMode);
    }

    // ─────────────────────────────────────────────
    // MODE ROUTER
    // ─────────────────────────────────────────────
    _switchMode(mode) {
        // Setiap mode switch increment versi — async loads yang sedang berjalan cek ini
        // sebelum commit hasil ke DOM/map agar tidak terjadi race condition.
        this._modeVersion = (this._modeVersion || 0) + 1;

        this._clearAllLayers();
        if (this.backButton) { this.backButton.remove(); this.backButton = null; }
        this.currentLevel = 'kabupaten';
        // Reset drill context setiap ganti mode atau re-filter
        this.drillKabupatenId = null;
        this.drillKecamatanId = null;

        const modeLabels = {
            umum:    { icon: 'fa-map',                  label: 'Peta Umum' },
            kriminal:{ icon: 'fa-exclamation-triangle', label: 'Peta Kriminalitas' },
            kam:     { icon: 'fa-shield',               label: 'Peta Kasus Menonjol' },
            lalin:   { icon: 'fa-car',                  label: 'Peta Lalu Lintas' },
            bencana: { icon: 'fa-bolt',                 label: 'Peta Bencana' },
            lokasi:  { icon: 'fa-map-marker',           label: 'Lokasi Penting' },
            sumur:   { icon: 'fa-tint',                 label: 'Peta Sumur Minyak' },
            strong:  { icon: 'fa-map-pin',              label: 'Peta Strong Point' },
        };
        const meta = modeLabels[mode] || modeLabels['umum'];
        this._updateBreadcrumb(`<i class="fa ${meta.icon}"></i> ${meta.label}`);

        // Peta umum: map mengisi sisa ruang. Mode lain: tinggi tetap agar konten di bawah bisa muncul
        const mapWrapper = this.mapWrapperRef?.el;
        if (mapWrapper) {
            if (mode === 'umum') {
                mapWrapper.classList.remove('petadigi-map-wrapper--fixed');
            } else {
                mapWrapper.classList.add('petadigi-map-wrapper--fixed');
                this.map?.invalidateSize();
            }
        }

        this._updateFilterVisibility(mode);
        this._updateKpiCards(mode);
        this._updateFilterSummary(mode);
        this._updateSumberDokumenInfo(mode);
        this._updateCharts(mode);

        switch (mode) {
            case 'umum':     loadKabupatenLayer(this); break;
            case 'kriminal': loadModeKriminal(this); break;
            case 'kam':      loadModeKam(this); break;
            case 'lalin':    loadModeLalin(this); break;
            case 'bencana':  loadModeBencana(this); break;
            case 'lokasi':   loadModeLokasi(this); break;
            case 'sumur':    loadModeSumur(this); break;
            case 'strong':   loadModeStrong(this); break;
            default:         loadKabupatenLayer(this); break;
        }
    }

    // ─────────────────────────────────────────────
    // BREADCRUMB
    // ─────────────────────────────────────────────
    _updateBreadcrumb(html) {
        if (this.breadcrumbRef.el) {
            this.breadcrumbRef.el.innerHTML = html;
        }
    }

    _appendBreadcrumb(html) {
        if (this.breadcrumbRef.el) {
            this.breadcrumbRef.el.innerHTML +=
                `<i class="fa fa-chevron-right petadigi-breadcrumb-sep" style="margin:0 6px;font-size:9px;opacity:.6;"></i><span class="petadigi-breadcrumb-item">${html}</span>`;
        }
    }

    // ─────────────────────────────────────────────
    // FILTER VISIBILITY per mode
    // ─────────────────────────────────────────────
    async _updateFilterVisibility(mode) {
        const showJenisLP       = mode === 'kriminal';
        const showKategori      = !['umum', 'sumur', 'strong'].includes(mode);
        const showKategoriSumur = mode === 'sumur';
        const showSubKategori   = mode === 'kriminal';
        const showTahun         = !['umum', 'lokasi', 'sumur', 'strong'].includes(mode);
        const showDateRange     = !['umum', 'lokasi', 'sumur'].includes(mode);
        const showState         = mode !== 'umum';

        const jenisLpEl          = this.filterJenisLP?.el;
        const tahunEl            = this.filterTahun?.el;
        const dateWrap           = this.filterDateRangeWrapper?.el;
        const kategoriEl         = this.filterKategori?.el;
        const kategoriSumurEl    = this.filterKategoriSumur?.el;
        const subKategoriEl      = this.filterSubKategori?.el;
        const stateEl            = this.filterState?.el;

        if (jenisLpEl)       jenisLpEl.style.display          = showJenisLP       ? '' : 'none';
        if (tahunEl)         tahunEl.style.display             = showTahun         ? '' : 'none';
        if (dateWrap)        dateWrap.style.display            = showDateRange     ? '' : 'none';
        if (kategoriEl)      kategoriEl.style.display          = showKategori      ? '' : 'none';
        if (kategoriSumurEl) kategoriSumurEl.style.display     = showKategoriSumur ? '' : 'none';
        if (subKategoriEl)   subKategoriEl.style.display       = showSubKategori   ? '' : 'none';
        if (stateEl)         stateEl.style.display             = showState         ? '' : 'none';

        const modeChanged = mode !== this._filterMode;
        this._filterMode = mode;

        if (modeChanged) {
            // Reset & repopulate hanya saat mode berganti
            if (jenisLpEl)       { jenisLpEl.value = ''; }
            if (kategoriEl)      { kategoriEl.value = ''; }
            if (kategoriSumurEl) { kategoriSumurEl.value = ''; }
            if (subKategoriEl) {
                subKategoriEl.innerHTML = '<option value="">Semua Sub Kategori</option>';
                subKategoriEl.value = '';
            }
            if (stateEl) { stateEl.value = ''; }
            if (showKategori)      await this._populateKategori(mode);
            if (showKategoriSumur) await this._populateKategoriSumur();
            if (showState)         await this._populateState(mode);
        }
    }

    async _populateState(mode) {
        const el = this.filterState?.el;
        if (!el) return;
        el.innerHTML = '<option value="">Semua Status</option>';
        const OPTIONS = {
            kriminal: [{ value: 'PROSES', label: 'Proses' }, { value: 'SELESAI', label: 'Selesai' }],
            bencana:  [{ value: 'AKTIF', label: 'Aktif' }, { value: 'NON AKTIF', label: 'Non Aktif' }],
            lalin:    [{ value: 'PROSES', label: 'Proses' }, { value: 'SELESAI', label: 'Selesai' }],
            kam:      [{ value: 'PROSES', label: 'Proses' }, { value: 'SELESAI', label: 'Selesai' }],
            lokasi:   [{ value: 'AKTIF', label: 'Aktif' }, { value: 'NON AKTIF', label: 'Non Aktif' }],
            sumur:    [{ value: 'AKTIF', label: 'Aktif' }, { value: 'TIDAK AKTIF', label: 'Tidak Aktif' }],
            strong:   [{ value: 'PROSES', label: 'Proses' }, { value: 'SELESAI', label: 'Selesai' }],
        };
        (OPTIONS[mode] || []).forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.value;
            opt.textContent = o.label;
            el.appendChild(opt);
        });
    }

    async _populateKategoriSumur() {
        const el = this.filterKategoriSumur?.el;
        if (!el) return;
        el.innerHTML = '<option value="">Semua Kategori</option>';
        try {
            const records = await this.orm.searchRead(
                'petadigi.kategori_sumur_minyak', [], ['id', 'name'], { order: 'name asc' });
            records.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = r.name;
                el.appendChild(opt);
            });
        } catch (_) {}
    }

    async _populateKategori(mode) {
        const el = this.filterKategori?.el;
        if (!el) return;
        const model = this._KATEGORI_MODEL[mode];
        el.innerHTML = '<option value="">Semua Kategori</option>';
        if (!model) return;
        try {
            const records = await this.orm.searchRead(model, [], ['id', 'name'], { order: 'name asc' });
            records.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = r.name;
                el.appendChild(opt);
            });
        } catch (_) {}
    }

    async _populateSubKategori() {
        const el = this.filterSubKategori?.el;
        if (!el) return;
        const kategoriId = parseInt(this.filterKategori?.el?.value) || null;
        el.innerHTML = '<option value="">Semua Sub Kategori</option>';
        if (!kategoriId) return;
        try {
            const records = await this.orm.searchRead(
                'petadigi.sub_kategori_kriminal',
                [['kategori_kriminal_id', '=', kategoriId]],
                ['id', 'name'],
                { order: 'name asc' }
            );
            records.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = r.name;
                el.appendChild(opt);
            });
        } catch (_) {}
    }

    // ─────────────────────────────────────────────
    // FILTER SUMMARY
    // ─────────────────────────────────────────────
    _updateFilterSummary(mode) {
        const el = this.filterSummaryRef.el;
        if (!el) return;

        const hasTahunFilter  = !['umum', 'lokasi', 'sumur', 'strong'].includes(mode);
        const hasDateFilter   = !['umum', 'lokasi', 'sumur'].includes(mode);

        const chip = (icon, text) =>
            `<span class="petadigi-filter-summary-chip"><i class="fa ${icon}"></i>${text}</span>`;
        const sep  = () => `<span class="petadigi-filter-summary-sep">•</span>`;
        const fmt  = d => { const [y,m,day] = d.split('-'); return `${day}/${m}/${y}`; };

        const chips = [];

        // Tahun
        if (hasTahunFilter) {
            const tahun = this.filterTahun?.el?.value || '';
            chips.push(chip('fa-file-text-o', tahun ? `Sumber dokumen tahun ${tahun}` : 'Semua tahun'));
        }

        // Kabupaten
        const kabEl = this.filterKabupaten?.el;
        const kabName = (kabEl && kabEl.value)
            ? kabEl.options[kabEl.selectedIndex]?.text || 'Semua Kabupaten'
            : 'Semua Kabupaten';
        chips.push(chip('fa-building', kabName));

        // Kategori
        if (mode !== 'umum') {
            const katEl = this.filterKategori?.el;
            if (katEl && katEl.value) {
                chips.push(chip('fa-tag', katEl.options[katEl.selectedIndex]?.text || ''));
            }
            if (mode === 'kriminal') {
                const subEl = this.filterSubKategori?.el;
                if (subEl && subEl.value) {
                    chips.push(chip('fa-sitemap', subEl.options[subEl.selectedIndex]?.text || ''));
                }
            }
        }

        // Status
        if (mode !== 'umum') {
            const stEl = this.filterState?.el;
            if (stEl && stEl.value) {
                chips.push(chip('fa-circle', stEl.options[stEl.selectedIndex]?.text || stEl.value));
            }
        }

        // Tanggal kejadian
        if (hasDateFilter) {
            const df = this.activeDateFrom || '';
            const dt = this.activeDateTo   || '';
            if (df || dt) {
                const label = df && dt
                    ? `Tgl Kejadian: ${fmt(df)} s/d ${fmt(dt)}`
                    : df ? `Tgl Kejadian: mulai ${fmt(df)}` : `Tgl Kejadian: s/d ${fmt(dt)}`;
                chips.push(chip('fa-calendar', label));
            }
        }

        el.innerHTML = chips.join(sep());
    }

    // ─────────────────────────────────────────────
    // SUMBER DOKUMEN INFO (kanan filter summary)
    // ─────────────────────────────────────────────
    async _updateSumberDokumenInfo(mode) {
        const el = this.sumberInfoRef?.el;
        if (!el) return;

        const tahun = this.filterTahun?.el?.value || '';

        // lokasi_penting tidak punya sumber_dokumen_id; umum tidak relevan
        const MODEL_MAP = {
            kriminal: 'petadigi.kriminalitas',
            bencana:  'petadigi.bencana',
            lalin:    'petadigi.lalu_lintas',
            kam:      'petadigi.kasus_menonjol',
        };
        const model = MODEL_MAP[mode];
        if (!model || !tahun) { el.innerHTML = ''; return; }

        try {
            const groups = await this.orm.call(
                model,
                'read_group',
                [
                    [['sumber_dokumen_id.tahun', '=', tahun]],
                    ['sumber_dokumen_id'],
                    ['sumber_dokumen_id'],
                ],
                { lazy: false }
            );

            const names = groups
                .filter(g => g.sumber_dokumen_id)
                .map(g => Array.isArray(g.sumber_dokumen_id) ? g.sumber_dokumen_id[1] : String(g.sumber_dokumen_id))
                .sort();

            if (!names.length) { el.innerHTML = ''; return; }

            const joined    = names.join(' / ');
            const CHAR_LIMIT = 48;
            const first     = names[0];
            const firstTrunc = first.length > CHAR_LIMIT ? first.slice(0, CHAR_LIMIT) + '…' : first;
            const hasMore   = names.length > 1 || first.length > CHAR_LIMIT;
            const shortTxt  = names.length > 1
                ? `${firstTrunc}${names.length > 1 ? ` (+${names.length - 1})` : ''}`
                : firstTrunc;
            const uid       = 'sd-' + Math.random().toString(36).slice(2, 7);

            el.innerHTML = `
                <i class="fa fa-file-text-o"></i>
                <span class="petadigi-sumber-label">Sumber:</span>
                <span class="petadigi-sumber-text" id="${uid}-text">${shortTxt}</span>
                ${hasMore ? `<button class="petadigi-sumber-toggle" id="${uid}-btn" title="${joined}"><i class="fa fa-chevron-down"></i></button>` : ''}
            `;

            if (hasMore) {
                let expanded = false;
                const btn    = el.querySelector(`#${uid}-btn`);
                const textEl = el.querySelector(`#${uid}-text`);
                btn.addEventListener('click', () => {
                    expanded = !expanded;
                    textEl.textContent = expanded ? joined : shortTxt;
                    textEl.classList.toggle('expanded', expanded);
                    btn.innerHTML = expanded
                        ? '<i class="fa fa-chevron-up"></i>'
                        : '<i class="fa fa-chevron-down"></i>';
                });
            }
        } catch (_) {
            el.innerHTML = '';
        }
    }

    // ─────────────────────────────────────────────
    // KPI CARDS — dinamis per mode
    // ─────────────────────────────────────────────
    async _updateKpiCards(mode) {
        const myVersion = this._modeVersion;
        const row = this.kpiRowRef.el;
        if (!row) return;
        row.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#bbb;font-size:12px;padding:8px 0;">Memuat data...</div>`;

        const tahun         = this.filterTahun?.el?.value         || '';
        const dateFrom      = this.activeDateFrom                   || '';
        const dateTo        = this.activeDateTo                     || '';
        const kabupatenId   = parseInt(this.filterKabupaten?.el?.value)    || null;
        const kategoriId    = parseInt(this.filterKategori?.el?.value)     || null;
        const subKategoriId = parseInt(this.filterSubKategori?.el?.value)  || null;
        const stateValue    = this.filterState?.el?.value          || '';

        const tf  = tahun        ? [['sumber_dokumen_id.tahun', '=', tahun]]        : [];
        const df  = [
            ...(dateFrom ? [['tanggal_kejadian', '>=', dateFrom + ' 00:00:00']] : []),
            ...(dateTo   ? [['tanggal_kejadian', '<=', dateTo   + ' 23:59:59']] : []),
        ];
        const jenisLpValue  = this.filterJenisLP?.el?.value          || '';
        const kabf = kabupatenId   ? [['kabupaten_id',   '=', kabupatenId]]   : [];
        const kf  = kategoriId    ? [['kategori_id',    '=', kategoriId]]    : [];
        const sf  = subKategoriId ? [['sub_kategori_id','=', subKategoriId]] : [];
        const jlpf = jenisLpValue  ? [['jenis_lp',       '=', jenisLpValue]]  : [];
        // state field berbeda: kriminal pakai status_perkara, lainnya pakai state
        const stk = stateValue ? [['status_perkara', '=', stateValue]] : [];
        const sts = stateValue ? [['state',          '=', stateValue]] : [];
        // Drill-down context (set oleh layer saat user klik polygon)
        const drillDomain = this.drillKecamatanId
            ? [['kecamatan_id', '=', this.drillKecamatanId]]
            : this.drillKabupatenId
                ? [['kabupaten_id', '=', this.drillKabupatenId]]
                : [];

        try {
            let cards = [];

            if (mode === 'kriminal') {
                const d = [...tf, ...df, ...kabf, ...jlpf, ...kf, ...sf, ...stk, ...drillDomain];
                const [total, proses, selesai] = await Promise.all([
                    this.orm.searchCount('petadigi.kriminalitas', d),
                    this.orm.searchCount('petadigi.kriminalitas', [...d, ['status_perkara','=','PROSES']]),
                    this.orm.searchCount('petadigi.kriminalitas', [...d, ['status_perkara','=','SELESAI']]),
                ]);
                const persen = total > 0 ? Math.round(selesai / total * 100) : 0;
                cards = [
                    { icon: 'fa-database',    color: '#2980b9', value: total,        label: 'Total Data (PTP)' },
                    { icon: 'fa-spinner',     color: '#d35400', value: proses,       label: 'Total Proses' },
                    { icon: 'fa-check-circle',color: '#27ae60', value: selesai,      label: 'Total Selesai (JTP)' },
                    { icon: 'fa-percent',     color: '#8e44ad', value: persen + '%', label: 'Persentase Selesai' },
                ];
            } else if (mode === 'umum') {
                // Peta umum = data geografis, filter tahun & tanggal tidak relevan
                const [kab, kec, desa, polres] = await Promise.all([
                    this.orm.searchCount('petadigi.kabupaten', []),
                    this.orm.searchCount('petadigi.kecamatan', []),
                    this.orm.searchCount('petadigi.desa', []),
                    this.orm.searchCount('petadigi.polres', []),
                ]);
                cards = [
                    { icon: 'fa-building', color: '#2980b9', value: kab,    label: 'Total Kabupaten/Kota' },
                    { icon: 'fa-map',      color: '#8e44ad', value: kec,    label: 'Total Kecamatan' },
                    { icon: 'fa-home',     color: '#27ae60', value: desa,   label: 'Total Desa/Kelurahan' },
                    { icon: 'fa-shield',   color: '#c0392b', value: polres, label: 'Total Polres' },
                ];
            } else if (mode === 'bencana') {
                const d = [...tf, ...df, ...kabf, ...kf, ...sts, ...drillDomain];
                const [total, aktif, nonAktif] = await Promise.all([
                    this.orm.searchCount('petadigi.bencana', d),
                    this.orm.searchCount('petadigi.bencana', [...d, ['state','=','AKTIF']]),
                    this.orm.searchCount('petadigi.bencana', [...d, ['state','=','NON AKTIF']]),
                ]);
                const persen = total > 0 ? Math.round(nonAktif / total * 100) : 0;
                cards = [
                    { icon: 'fa-database',    color: '#2980b9', value: total,        label: 'Total Data' },
                    { icon: 'fa-bolt',        color: '#c0392b', value: aktif,        label: 'Masih Aktif' },
                    { icon: 'fa-check-circle',color: '#27ae60', value: nonAktif,     label: 'Non Aktif' },
                    { icon: 'fa-percent',     color: '#8e44ad', value: persen + '%', label: 'Persentase Tertangani' },
                ];
            } else if (mode === 'lalin') {
                const d = [...tf, ...df, ...kabf, ...kf, ...sts, ...drillDomain];
                const [total, proses, selesai] = await Promise.all([
                    this.orm.searchCount('petadigi.lalu_lintas', d),
                    this.orm.searchCount('petadigi.lalu_lintas', [...d, ['state','=','PROSES']]),
                    this.orm.searchCount('petadigi.lalu_lintas', [...d, ['state','=','SELESAI']]),
                ]);
                const persen = total > 0 ? Math.round(selesai / total * 100) : 0;
                cards = [
                    { icon: 'fa-database',    color: '#d35400', value: total,        label: 'Total Data' },
                    { icon: 'fa-spinner',     color: '#c0392b', value: proses,       label: 'Total Proses' },
                    { icon: 'fa-check-circle',color: '#27ae60', value: selesai,      label: 'Total Selesai' },
                    { icon: 'fa-percent',     color: '#1a6b9a', value: persen + '%', label: 'Persentase Selesai' },
                ];
            } else if (mode === 'kam') {
                const d = [...tf, ...df, ...kabf, ...kf, ...sts, ...drillDomain];
                const [total, proses, selesai] = await Promise.all([
                    this.orm.searchCount('petadigi.kasus_menonjol', d),
                    this.orm.searchCount('petadigi.kasus_menonjol', [...d, ['state','=','PROSES']]),
                    this.orm.searchCount('petadigi.kasus_menonjol', [...d, ['state','=','SELESAI']]),
                ]);
                const persen = total > 0 ? Math.round(selesai / total * 100) : 0;
                cards = [
                    { icon: 'fa-database',    color: '#8e44ad', value: total,        label: 'Total Data' },
                    { icon: 'fa-spinner',     color: '#c0392b', value: proses,       label: 'Total Proses' },
                    { icon: 'fa-check-circle',color: '#27ae60', value: selesai,      label: 'Total Selesai' },
                    { icon: 'fa-percent',     color: '#1a6b9a', value: persen + '%', label: 'Persentase Selesai' },
                ];
            } else if (mode === 'lokasi') {
                // lokasi_penting tidak punya sumber_dokumen_id & tanggal_kejadian
                const [total, aktif] = await Promise.all([
                    this.orm.searchCount('petadigi.lokasi_penting', [...kf, ...sts]),
                    this.orm.searchCount('petadigi.lokasi_penting', [...kf, ...sts, ['state','=','AKTIF']]),
                ]);
                cards = [
                    { icon: 'fa-database',    color: '#27ae60', value: total,       label: 'Total Lokasi' },
                    { icon: 'fa-check-circle',color: '#1a6b9a', value: aktif,       label: 'Lokasi Aktif' },
                    { icon: 'fa-times-circle',color: '#c0392b', value: total-aktif, label: 'Non Aktif' },
                    { icon: 'fa-map-marker',  color: '#8e44ad', value: total,       label: 'Total Terdaftar' },
                ];
            } else if (mode === 'sumur') {
                // sumur_minyak tidak punya sumber_dokumen_id & tanggal_kejadian
                const sumurSts = stateValue ? [['state', '=', stateValue]] : [];
                const sumurBase = [...kabf, ...sumurSts, ...drillDomain];
                const [total, aktif, lengkap] = await Promise.all([
                    this.orm.searchCount('petadigi.sumur_minyak', sumurBase),
                    this.orm.searchCount('petadigi.sumur_minyak', [...sumurBase, ['state','=','AKTIF']]),
                    this.orm.searchCount('petadigi.sumur_minyak', [...sumurBase, ['is_data_lengkap','=',true]]),
                ]);
                cards = [
                    { icon: 'fa-database',    color: '#A04000', value: total,        label: 'Total Sumur' },
                    { icon: 'fa-check-circle',color: '#27ae60', value: aktif,        label: 'Sumur Aktif' },
                    { icon: 'fa-times-circle',color: '#7F8C8D', value: total - aktif,label: 'Tidak Aktif' },
                    { icon: 'fa-tint',        color: '#CA6F1E', value: lengkap,      label: 'Data Lengkap' },
                ];
            } else if (mode === 'strong') {
                const df_s = [
                    ...(dateFrom ? [['tanggal_mulai', '>=', dateFrom + ' 00:00:00']] : []),
                    ...(dateTo   ? [['tanggal_mulai', '<=', dateTo   + ' 23:59:59']] : []),
                ];
                const d = [...kabf, ...df_s, ...drillDomain];
                const [total, proses, lokasiGroups, personelGroups] = await Promise.all([
                    this.orm.searchCount('petadigi.strong_point', d),
                    this.orm.searchCount('petadigi.strong_point', [...d, ['state','=','PROSES']]),
                    this.orm.call('petadigi.strong_point', 'read_group',
                        [d, ['lokasi_id'], ['lokasi_id']], { lazy: false }),
                    this.orm.call('petadigi.strong_point', 'read_group',
                        [d, ['personel_count:sum'], []], { lazy: false }),
                ]);
                const totalLokasi   = lokasiGroups.filter(g => g.lokasi_id).length;
                const totalPersonel = personelGroups[0]?.personel_count || 0;
                cards = [
                    { icon: 'fa-map-pin',   color: '#27ae60', value: totalLokasi,   label: 'Total Lokasi' },
                    { icon: 'fa-map-marker',color: '#1a6b9a', value: total,         label: 'Total Strong Point' },
                    { icon: 'fa-spinner',   color: '#d35400', value: proses,        label: 'Strong Point Proses' },
                    { icon: 'fa-users',     color: '#8e44ad', value: totalPersonel, label: 'Total Personel' },
                ];
            }

            if (this._modeVersion !== myVersion) return;
            row.innerHTML = cards.map(c => `
                <div class="petadigi-kpi-card">
                    <div class="petadigi-kpi-icon" style="color:${c.color};">
                        <i class="fa ${c.icon}"></i>
                    </div>
                    <div class="petadigi-kpi-body">
                        <div class="petadigi-kpi-value">${c.value.toLocaleString ? c.value.toLocaleString('id-ID') : c.value}</div>
                        <div class="petadigi-kpi-label">${c.label}</div>
                    </div>
                </div>
            `).join('');

        } catch (e) {
            if (this._modeVersion !== myVersion) return;
            row.innerHTML = '';
            console.error('KPI load error:', e);
        }
    }

    // ─────────────────────────────────────────────
    // ECHARTS — lihat dashboard_charts_kriminal.js
    // ─────────────────────────────────────────────
    async _updateCharts(mode) {
        await Promise.all([
            updateKriminalCharts(this, mode),
            updateKamCharts(this, mode),
            updateBencanaCharts(this, mode),
            updateLalinCharts(this, mode),
            updateLokasiCharts(this, mode),
            updateSumurCharts(this, mode),
            updateStrongCharts(this, mode),
            updateKriminalTable(this, mode),
            updateKamTable(this, mode),
            updateBencanaTable(this, mode),
            updateLalinTable(this, mode),
            updateLokasiTable(this, mode),
            updateSumurTable(this, mode),
            updateStrongTable(this, mode),
        ]);
    }
    _disposeCharts() {
        disposeKriminalCharts(this);
        disposeKamCharts(this);
        disposeBencanaCharts(this);
        disposeLalinCharts(this);
        disposeLokasiCharts(this);
        disposeSumurCharts(this);
        disposeStrongCharts(this);
    }

    // ─────────────────────────────────────────────
    // MAP INIT & LAYER GROUPS
    // ─────────────────────────────────────────────
    async _initMap() {
        const el = this.mapRef.el;
        if (!el) return;

        this.map = L.map(el).setView([-3.31987, 104.91459], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.map);

        this.kabupatenLayerGroup = L.layerGroup().addTo(this.map);
        this.kabupatenLabelGroup = L.layerGroup().addTo(this.map);
        this.kecamatanLayerGroup = L.layerGroup().addTo(this.map);
        this.kecamatanLabelGroup = L.layerGroup().addTo(this.map);
        this.desaLayerGroup      = L.layerGroup().addTo(this.map);
        this.desaLabelGroup      = L.layerGroup().addTo(this.map);
        this.markerLayerGroup    = L.markerClusterGroup({
            chunkedLoading:       true,
            maxClusterRadius:     60,
            showCoverageOnHover:  false,
            spiderfyOnMaxZoom:    true,
            disableClusteringAtZoom: 16,
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                const size  = count < 10 ? 32 : count < 100 ? 38 : 44;
                return L.divIcon({
                    html: `<div class="petadigi-cluster-icon" style="width:${size}px;height:${size}px;line-height:${size}px;">${count}</div>`,
                    className: '',
                    iconSize: L.point(size, size),
                });
            },
        }).addTo(this.map);

        // Layer terpisah untuk overlay lokasi penting (tidak ikut cluster)
        this.lokasiOverlayLayerGroup = L.layerGroup().addTo(this.map);

        // Label visibility: update setiap zoom berubah atau label baru ditambahkan
        this.map.on('zoomend', () => this._updateLabelVisibility());
        this.kabupatenLabelGroup.on('layeradd', () => {
            clearTimeout(this._labelVisTimer);
            this._labelVisTimer = setTimeout(() => this._updateLabelVisibility(), 60);
        });

        await loadKabupatenLayer(this);
    }

    _clearAllLayers() {
        if (this.kabupatenLayerGroup) this.kabupatenLayerGroup.clearLayers();
        if (this.kabupatenLabelGroup) this.kabupatenLabelGroup.clearLayers();
        if (this.kecamatanLayerGroup) this.kecamatanLayerGroup.clearLayers();
        if (this.kecamatanLabelGroup) this.kecamatanLabelGroup.clearLayers();
        if (this.desaLayerGroup)      this.desaLayerGroup.clearLayers();
        if (this.desaLabelGroup)      this.desaLabelGroup.clearLayers();
        if (this.markerLayerGroup)    this.markerLayerGroup.clearLayers();
        if (this.comingSoonControl)   { this.comingSoonControl.remove(); this.comingSoonControl = null; }
        removeKriminalLegend(this);
        removeKamLegend(this);
        removeBencanaLegend(this);
        removeLalinLegend(this);
        removeLokasiLegend(this);
        removeSumurLegend(this);
        removeStrongLegend(this);
        removeLokasiOverlay(this);
    }

    // ─────────────────────────────────────────────
    // LABEL VISIBILITY (zoom-adaptive)
    // ─────────────────────────────────────────────
    _updateLabelVisibility() {
        const map = this.map;
        if (!map) return;

        const applyGroup = (group, minPx) => {
            if (!group) return;
            group.getLayers().forEach(marker => {
                const el = marker.getElement();
                if (!el) return;
                const bounds = marker._polygonBounds;
                if (!bounds) { el.style.visibility = 'visible'; return; }
                const sw = map.latLngToContainerPoint(bounds.getSouthWest());
                const ne = map.latLngToContainerPoint(bounds.getNorthEast());
                const w  = Math.abs(ne.x - sw.x);
                const h  = Math.abs(ne.y - sw.y);
                el.style.visibility = (w >= minPx || h >= minPx) ? 'visible' : 'hidden';
            });
        };

        // Kabupaten: tampilkan hanya jika polygon ≥ 55px di salah satu dimensi
        applyGroup(this.kabupatenLabelGroup, 55);
        // Kecamatan & desa: sudah drill-down, threshold lebih kecil
        applyGroup(this.kecamatanLabelGroup, 30);
        applyGroup(this.desaLabelGroup, 20);
    }
}

registry.category("actions").add("petadigi_dashboard_map", DashboardMap);
