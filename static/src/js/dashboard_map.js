/** @odoo-module **/

import { Component, onMounted, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

import { initFilters } from "./dashboard_helpers";
import { loadKabupatenLayer } from "./dashboard_layer_umum";
import { loadModeKriminal, removeKriminalLegend } from "./dashboard_layer_kriminal";
import { loadModeLayLin } from "./dashboard_layer_lalin";
import { loadModeBencana } from "./dashboard_layer_bencana";
import { loadModeLokasi } from "./dashboard_layer_lokasi";

export class DashboardMap extends Component {
    static template = "petadigi.DashboardMap";

    setup() {
        this.mapRef          = useRef("mapContainer");
        this.sidebarRef      = useRef("sidebar");
        this.breadcrumbRef   = useRef("breadcrumb");
        this.collapseIcon    = useRef("collapseIcon");
        this.collapseText    = useRef("collapseText");
        this.filterKategori         = useRef("filterKategori");
        this.filterSubKategori      = useRef("filterSubKategori");
        this.filterTahun            = useRef("filterTahun");
        this.filterKabupaten        = useRef("filterKabupaten");
        this.filterDateRange        = useRef("filterDateRange");
        this.filterDateClear        = useRef("filterDateClear");
        this.filterDateRangeWrapper = useRef("filterDateRangeWrapper");
        this.filterSummaryRef       = useRef("filterSummary");
        this.kpiRowRef              = useRef("kpiRow");
        this.mapWrapperRef          = useRef("mapWrapper");
        this.chartRowRef            = useRef("chartRow");
        this.chartBarRef            = useRef("chartBar");
        this.chartDonutRef          = useRef("chartDonut");
        this.chartDonutTitleRef     = useRef("chartDonutTitle");

        this.orm = useService("orm");

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

        this._KATEGORI_MODEL = {
            kriminal: 'petadigi.kategori_kriminal',
            kam:      'petadigi.kategori_kamtibmas',
            bencana:  'petadigi.kategori_bencana',
            lalin:    'petadigi.kategori_lalu_lintas',
            lokasi:   'petadigi.kategori_lokasi',
        };

        onMounted(async () => {
            await initFilters(this);
            this._initFlatpickr();
            await this._updateFilterVisibility('umum');
            await this._initMap();
            await this._updateKpiCards('umum');
            this._updateFilterSummary('umum');
            this._updateCharts('umum');
        });
    }

    // ─────────────────────────────────────────────
    // FLATPICKR DATE RANGE
    // ─────────────────────────────────────────────
    _initFlatpickr() {
        const el = this.filterDateRange.el;
        if (!el || typeof flatpickr === 'undefined') return;

        this._fp = flatpickr(el, {
            mode: 'range',
            dateFormat: 'Y-m-d',
            allowInput: false,
            disableMobile: true,
            onChange: (selectedDates) => {
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
        if (this._fp) this._fp.clear();
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
        this._clearAllLayers();
        if (this.backButton) { this.backButton.remove(); this.backButton = null; }
        this.currentLevel = 'kabupaten';

        const modeLabels = {
            umum:    { icon: 'fa-map',                  label: 'Peta Umum' },
            kriminal:{ icon: 'fa-exclamation-triangle', label: 'Peta Kriminalitas' },
            kam:     { icon: 'fa-shield',               label: 'Peta Kasus Menonjol' },
            lalin:   { icon: 'fa-car',                  label: 'Peta Lalu Lintas' },
            bencana: { icon: 'fa-bolt',                 label: 'Peta Bencana' },
            lokasi:  { icon: 'fa-map-marker',           label: 'Lokasi Penting' },
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
        this._updateCharts(mode);

        switch (mode) {
            case 'umum':     loadKabupatenLayer(this); break;
            case 'kriminal': loadModeKriminal(this); break;
            case 'lalin':    loadModeLayLin(this); break;
            case 'bencana':  loadModeBencana(this); break;
            case 'lokasi':   loadModeLokasi(this); break;
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
                `<i class="fa fa-chevron-right petadigi-breadcrumb-sep" style="margin:0 6px;font-size:9px;opacity:.6;"></i>${html}`;
        }
    }

    // ─────────────────────────────────────────────
    // FILTER VISIBILITY per mode
    // ─────────────────────────────────────────────
    async _updateFilterVisibility(mode) {
        const showKategori    = mode !== 'umum';
        const showSubKategori = mode === 'kriminal';
        const showExtended    = !['umum', 'lokasi'].includes(mode);

        const tahunEl       = this.filterTahun?.el;
        const dateWrap      = this.filterDateRangeWrapper?.el;
        const kategoriEl    = this.filterKategori?.el;
        const subKategoriEl = this.filterSubKategori?.el;

        if (tahunEl)       tahunEl.style.display       = showExtended    ? '' : 'none';
        if (dateWrap)      dateWrap.style.display       = showExtended    ? '' : 'none';
        if (kategoriEl)    kategoriEl.style.display     = showKategori    ? '' : 'none';
        if (subKategoriEl) subKategoriEl.style.display  = showSubKategori ? '' : 'none';

        const modeChanged = mode !== this._filterMode;
        this._filterMode = mode;

        if (modeChanged) {
            // Reset & repopulate hanya saat mode berganti
            if (kategoriEl)    { kategoriEl.value = ''; }
            if (subKategoriEl) {
                subKategoriEl.innerHTML = '<option value="">Semua Sub Kategori</option>';
                subKategoriEl.value = '';
            }
            if (showKategori) await this._populateKategori(mode);
        }
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

        const hasTahunFilter  = !['umum', 'lokasi'].includes(mode);
        const hasDateFilter   = !['umum', 'lokasi'].includes(mode);

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
    // KPI CARDS — dinamis per mode
    // ─────────────────────────────────────────────
    async _updateKpiCards(mode) {
        const row = this.kpiRowRef.el;
        if (!row) return;
        row.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#bbb;font-size:12px;padding:8px 0;">Memuat data...</div>`;

        const tahun        = this.filterTahun?.el?.value        || '';
        const dateFrom     = this.activeDateFrom                  || '';
        const dateTo       = this.activeDateTo                    || '';
        const kategoriId   = parseInt(this.filterKategori?.el?.value)    || null;
        const subKategoriId= parseInt(this.filterSubKategori?.el?.value) || null;
        const tf = tahun        ? [['sumber_dokumen_id.tahun', '=', tahun]]        : [];
        const df = [
            ...(dateFrom ? [['tanggal_kejadian', '>=', dateFrom + ' 00:00:00']] : []),
            ...(dateTo   ? [['tanggal_kejadian', '<=', dateTo   + ' 23:59:59']] : []),
        ];
        const kf = kategoriId    ? [['kategori_id',    '=', kategoriId]]    : [];
        const sf = subKategoriId ? [['sub_kategori_id','=', subKategoriId]] : [];

        try {
            let cards = [];

            if (mode === 'kriminal') {
                const d = [...tf, ...df, ...kf, ...sf];
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
                const d = [...tf, ...df, ...kf];
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
                const d = [...tf, ...df, ...kf];
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
                const d = [...tf, ...df, ...kf];
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
                    this.orm.searchCount('petadigi.lokasi_penting', [...kf]),
                    this.orm.searchCount('petadigi.lokasi_penting', [...kf, ['state','=','AKTIF']]),
                ]);
                cards = [
                    { icon: 'fa-database',    color: '#27ae60', value: total,       label: 'Total Lokasi' },
                    { icon: 'fa-check-circle',color: '#1a6b9a', value: aktif,       label: 'Lokasi Aktif' },
                    { icon: 'fa-times-circle',color: '#c0392b', value: total-aktif, label: 'Non Aktif' },
                    { icon: 'fa-map-marker',  color: '#8e44ad', value: total,       label: 'Total Terdaftar' },
                ];
            }

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
            row.innerHTML = '';
            console.error('KPI load error:', e);
        }
    }

    // ─────────────────────────────────────────────
    // ECHARTS
    // ─────────────────────────────────────────────
    async _updateCharts(mode) {
        const row = this.chartRowRef?.el;
        if (!row) return;

        if (mode !== 'kriminal') {
            row.style.display = 'none';
            this._disposeCharts();
            return;
        }
        row.style.display = 'flex';

        const tahun        = this.filterTahun?.el?.value        || '';
        const dateFrom     = this.activeDateFrom                  || '';
        const dateTo       = this.activeDateTo                    || '';
        const kategoriId   = parseInt(this.filterKategori?.el?.value)    || null;
        const subKategoriId= parseInt(this.filterSubKategori?.el?.value) || null;
        const kabupatenId  = parseInt(this.filterKabupaten?.el?.value)   || null;

        const baseDomain = [
            ...(tahun        ? [['sumber_dokumen_id.tahun', '=',  tahun]]                          : []),
            ...(dateFrom     ? [['tanggal_kejadian',        '>=', dateFrom + ' 00:00:00']]         : []),
            ...(dateTo       ? [['tanggal_kejadian',        '<=', dateTo   + ' 23:59:59']]         : []),
            ...(kategoriId   ? [['kategori_id',             '=',  kategoriId]]                     : []),
            ...(subKategoriId? [['sub_kategori_id',         '=',  subKategoriId]]                  : []),
        ];
        const donutDomain = [
            ...baseDomain,
            ...(kabupatenId  ? [['kabupaten_id',            '=',  kabupatenId]]                    : []),
        ];

        try {
            const [kabGroups, katGroups, allKabupaten] = await Promise.all([
                this.orm.call('petadigi.kriminalitas', 'read_group',
                    [baseDomain, ['kabupaten_id'], ['kabupaten_id']], { lazy: false }),
                this.orm.call('petadigi.kriminalitas', 'read_group',
                    [donutDomain, ['kategori_id'], ['kategori_id']], { lazy: false }),
                this.orm.searchRead('petadigi.kabupaten', [], ['id', 'name'], { order: 'name asc' }),
            ]);

            // Bar chart — merge semua kabupaten (termasuk yg 0), sort by count desc
            const kabCountMap = {};
            kabGroups.forEach(g => {
                if (Array.isArray(g.kabupaten_id)) kabCountMap[g.kabupaten_id[0]] = g.__count || 0;
            });
            const merged = allKabupaten
                .map(k => ({ name: k.name, count: kabCountMap[k.id] || 0 }))
                .sort((a, b) => b.count - a.count);
            const barNames  = merged.map(k => k.name);
            const barValues = merged.map(k => k.count);

            // Donut chart
            const donutData = katGroups.map(g => ({
                name:  Array.isArray(g.kategori_id) ? g.kategori_id[1] : 'Lainnya',
                value: g.__count || 0,
            }));

            // Update donut title with kabupaten context
            const kabEl   = this.filterKabupaten?.el;
            const wilayah = kabEl?.value ? (kabEl.options[kabEl.selectedIndex]?.text || 'Semua Wilayah') : 'Semua Wilayah';
            const titleEl = this.chartDonutTitleRef?.el;
            if (titleEl) {
                titleEl.innerHTML = `<i class="fa fa-pie-chart"></i> Grafik Kriminalitas Berdasarkan Kategori (${wilayah})`;
            }

            this._renderBarChart(barNames, barValues);
            this._renderDonutChart(donutData);
        } catch (e) {
            console.error('Chart load error:', e);
        }
    }

    _disposeCharts() {
        if (this._echartsBar)   { this._echartsBar.dispose();   this._echartsBar = null; }
        if (this._echartsDonut) { this._echartsDonut.dispose(); this._echartsDonut = null; }
    }

    _renderBarChart(names, values) {
        const el = this.chartBarRef?.el;
        if (!el || typeof echarts === 'undefined') return;
        if (this._echartsBar) this._echartsBar.dispose();
        this._echartsBar = echarts.init(el);
        this._echartsBar.setOption({
            tooltip: {
                trigger: 'axis',
                backgroundColor: '#fff',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                textStyle: { color: '#2c3e50', fontSize: 12 },
                formatter: params => {
                    const p = params[0];
                    return `${p.name}<br/><b>Total Kriminalitas: ${p.value.toLocaleString('id-ID')}</b>`;
                },
            },
            grid: { left: 10, right: 16, top: 10, bottom: 55, containLabel: true },
            xAxis: {
                type: 'category',
                data: names,
                axisLabel: { rotate: 40, fontSize: 10, color: '#666', interval: 0 },
                axisLine: { lineStyle: { color: '#d0d7de' } },
                axisTick: { show: false },
            },
            yAxis: {
                type: 'value',
                axisLabel: { fontSize: 10, color: '#888' },
                splitLine: { lineStyle: { color: '#f3f0f5', type: 'dashed' } },
            },
            series: [{
                type: 'bar',
                data: values,
                barMaxWidth: 36,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#9B59B6' },
                        { offset: 1, color: '#6C3483' },
                    ]),
                    borderRadius: [4, 4, 0, 0],
                },
                emphasis: { itemStyle: { color: '#875A7B' } },
            }],
        });
    }

    _renderDonutChart(data) {
        const el = this.chartDonutRef?.el;
        if (!el || typeof echarts === 'undefined') return;
        if (this._echartsDonut) this._echartsDonut.dispose();
        this._echartsDonut = echarts.init(el);
        const COLORS = ['#875A7B', '#9B59B6', '#6C3483', '#A569BD', '#C39BD3', '#7D3C98', '#D2B4DE', '#BDC3C7'];
        this._echartsDonut.setOption({
            tooltip: {
                trigger: 'item',
                backgroundColor: '#fff',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                textStyle: { color: '#2c3e50', fontSize: 12 },
                formatter: '{b}: {c} ({d}%)',
            },
            legend: {
                orient: 'vertical',
                right: 8,
                top: 'middle',
                textStyle: { fontSize: 11, color: '#555' },
                icon: 'circle',
                itemWidth: 10,
                itemHeight: 10,
            },
            color: COLORS,
            series: [{
                type: 'pie',
                radius: ['42%', '68%'],
                center: ['36%', '50%'],
                data,
                label: {
                    show: true,
                    formatter: '{b}\n{c}',
                    fontSize: 10,
                    color: '#555',
                },
                labelLine: { length: 8, length2: 10 },
                itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
                emphasis: {
                    itemStyle: { shadowBlur: 8, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' },
                },
            }],
        });
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
        this.markerLayerGroup    = L.layerGroup().addTo(this.map);

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
    }
}

registry.category("actions").add("petadigi_dashboard_map", DashboardMap);
