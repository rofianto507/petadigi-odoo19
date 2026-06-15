// @ts-nocheck
/** @odoo-module **/

import { Component, useState, onMounted, onWillDestroy, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

class MonitoringGiatDashboard extends Component {
    static template = "petadigi.MonitoringGiatDashboard";
    static props = ["*"];

    setup() {
        this.orm    = useService("orm");
        this.action = useService("action");

        const today = new Date();
        const from = new Date(today);
        from.setDate(from.getDate() - 30);

        this.state = useState({
            loading: true,
            jenisList: [],
            polresList: [],
            polsekAll: [],
            jenisId: "",
            polresId: "",
            dateFrom: this._fmtDate(from),
            dateTo: this._fmtDate(today),
            kpi: {
                total: 0, petugas: 0,
                polresTeraktif: "-", polresTeraktifCount: 0,
                hariTeraktif: "-", hariTeraktifCount: 0,
            },
            donutData: [],
            lineData: { dates: [], data: [] },
            barData: { labels: [], values: [] },
            barPolsekData: { labels: [], values: [] },
            mapPoints: [],
            tblPolres: {
                data: [], search: "",
                sortCol: "name", sortDir: "asc",
                page: 1, perPage: 10,
            },
            tblPolsek: {
                data: [], search: "",
                sortCol: "count", sortDir: "desc",
                page: 1, perPage: 10,
            },
            kanban: {
                data: [], page: 1, perPage: 12, total: 0, loading: false,
            },
            confirmDelete: { visible: false, id: null, label: '' },
        });

        this.dateRangeRef  = useRef("dateRangeRef");
        this.donutRef      = useRef("donutRef");
        this.lineRef       = useRef("lineRef");
        this.barRef        = useRef("barRef");
        this.barPolsekRef  = useRef("barPolsekRef");
        this.mapRef        = useRef("mapRef");

        this._fpRange     = null;
        this._charts      = [];
        this._leafletMap  = null;
        this._loadSeq     = 0;

        onMounted(async () => {
            await this._loadFilters();
            this._initFlatpickr();
            await this._loadData();
        });

        onWillDestroy(() => {
            this._destroyCharts();
            if (this._fpRange) { try { this._fpRange.destroy(); } catch (_) {} }
        });
    }

    // ── Active filter chips ──────────────────────────────────────────────────
    get activeFilters() {
        const filters = [];
        if (this.state.dateFrom && this.state.dateTo) {
            filters.push({
                icon: "fa-calendar",
                label: `${this._fmtDateDisplay(this.state.dateFrom)} → ${this._fmtDateDisplay(this.state.dateTo)}`,
            });
        }
        if (this.state.jenisId) {
            const j = this.state.jenisList.find(x => x.id == this.state.jenisId);
            if (j) filters.push({ icon: "fa-tag", label: j.nama });
        }
        if (this.state.polresId) {
            const p = this.state.polresList.find(x => x.id == this.state.polresId);
            if (p) filters.push({ icon: "fa-building", label: p.name });
        }
        return filters;
    }

    // ── Computed table: Ringkasan per Polres ─────────────────────────────────
    get polresTable() {
        const { data, search, sortCol, sortDir, page, perPage } = this.state.tblPolres;
        let rows = data;
        if (search) {
            const q = search.toLowerCase();
            rows = rows.filter(r => r.name.toLowerCase().includes(q));
        }
        rows = [...rows].sort((a, b) => {
            const av = a[sortCol], bv = b[sortCol];
            const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
            return sortDir === "asc" ? cmp : -cmp;
        });
        const total = rows.length;
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * perPage;
        return {
            rows: rows.slice(start, start + perPage),
            total,
            totalPages,
            from: total === 0 ? 0 : start + 1,
            to: Math.min(start + perPage, total),
            hasPrev: safePage > 1,
            hasNext: safePage < totalPages,
        };
    }

    // ── Computed table: Polsek yang mengirim ─────────────────────────────────
    get polsekTable() {
        const { data, search, sortCol, sortDir, page, perPage } = this.state.tblPolsek;
        let rows = data;
        if (search) {
            const q = search.toLowerCase();
            rows = rows.filter(r =>
                r.polsekName.toLowerCase().includes(q) ||
                r.polresName.toLowerCase().includes(q)
            );
        }
        rows = [...rows].sort((a, b) => {
            const av = a[sortCol], bv = b[sortCol];
            const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
            return sortDir === "asc" ? cmp : -cmp;
        });
        const total = rows.length;
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * perPage;
        return {
            rows: rows.slice(start, start + perPage),
            total,
            totalPages,
            from: total === 0 ? 0 : start + 1,
            to: Math.min(start + perPage, total),
            hasPrev: safePage > 1,
            hasNext: safePage < totalPages,
        };
    }

    // ── Computed: Kanban pagination info ─────────────────────────────────────
    get kanbanPages() {
        const { total, perPage, page } = this.state.kanban;
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        const safePage = Math.min(page, totalPages);
        return {
            total,
            totalPages,
            hasPrev: safePage > 1,
            hasNext: safePage < totalPages,
            from: total === 0 ? 0 : (safePage - 1) * perPage + 1,
            to: Math.min(safePage * perPage, total),
        };
    }

    _sortIcon(tblState, col) {
        if (tblState.sortCol !== col) return "fa fa-sort";
        return tblState.sortDir === "asc" ? "fa fa-sort-asc" : "fa fa-sort-desc";
    }

    // ── Date helpers ─────────────────────────────────────────────────────────
    _BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

    _fmtDateDisplay(s) {
        if (!s || s === "-") return s || "";
        const [y, m, d] = s.split("-");
        if (!y || !m || !d) return s;
        return `${parseInt(d)} ${this._BULAN[parseInt(m) - 1]} ${y}`;
    }

    _fmtDateTimeDisplay(s) {
        if (!s) return "-";
        // Parse sebagai UTC lalu tampilkan dalam local timezone
        const iso = s.trim().length <= 10
            ? `${s}T00:00:00Z`
            : `${s.replace(' ', 'T')}Z`;
        const d = new Date(iso);
        if (isNaN(d.getTime())) return s;
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${d.getDate()} ${this._BULAN[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
    }

    _fmtDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    // ── Filters & data loading ───────────────────────────────────────────────
    _buildDomain() {
        const d = [];
        if (this.state.dateFrom)  d.push(["tanggal", ">=", `${this.state.dateFrom} 00:00:00`]);
        if (this.state.dateTo)    d.push(["tanggal", "<=", `${this.state.dateTo} 23:59:59`]);
        if (this.state.jenisId)   d.push(["jenis_laporan_id", "=", parseInt(this.state.jenisId)]);
        if (this.state.polresId)  d.push(["polres_id",        "=", parseInt(this.state.polresId)]);
        return d;
    }

    async _loadFilters() {
        const [jenisList, polresList, polsekAll] = await Promise.all([
            this.orm.searchRead(
                "petadigi.jenis_laporan",
                [["state", "=", "aktif"]],
                ["id", "nama"],
                { order: "nama asc" }
            ),
            this.orm.searchRead(
                "petadigi.polres",
                [],
                ["id", "name"],
                { order: "name asc" }
            ),
            this.orm.searchRead(
                "petadigi.polsek",
                [],
                ["id", "name", "polres_id"],
                { order: "name asc" }
            ),
        ]);
        this.state.jenisList  = jenisList;
        this.state.polresList = polresList;
        this.state.polsekAll  = polsekAll;
    }

    _initFlatpickr() {
        this._fpRange = flatpickr(this.dateRangeRef.el, {
            mode: "range",
            dateFormat: "Y-m-d",
            defaultDate: [this.state.dateFrom, this.state.dateTo],
            onChange: (dates) => {
                if (dates.length === 2) {
                    this.state.dateFrom = this._fmtDate(dates[0]);
                    this.state.dateTo   = this._fmtDate(dates[1]);
                    this._loadData();
                }
            },
        });
    }

    async _loadData() {
        const seq = ++this._loadSeq;
        this.state.loading = true;
        this.state.kanban.page = 1;
        this._destroyCharts();

        const domain = this._buildDomain();

        const records = await this.orm.searchRead(
            "petadigi.hasil_giat",
            domain,
            ["tanggal", "jenis_laporan_id", "nrp", "nama_petugas", "pangkat_petugas",
             "polres_id", "polsek_id", "latitude", "longitude", "kegiatan"],
            { limit: 0 }
        );

        if (seq !== this._loadSeq) return;

        this._aggregate(records);
        await this._loadKanban();
        this.state.loading = false;
        setTimeout(() => { if (seq === this._loadSeq) this._initCharts(); }, 50);
    }

    async _loadKanban() {
        this.state.kanban.loading = true;
        const domain = this._buildDomain();
        const { page, perPage } = this.state.kanban;
        const offset = (page - 1) * perPage;
        const [records, total] = await Promise.all([
            this.orm.searchRead(
                "petadigi.hasil_giat",
                domain,
                ["id", "code", "nama_petugas", "pangkat_petugas", "nrp",
                 "jenis_laporan_id", "tanggal", "kegiatan", "polres_id", "polsek_id"],
                { limit: perPage, offset, order: "tanggal desc, id desc" }
            ),
            this.orm.searchCount("petadigi.hasil_giat", domain),
        ]);
        this.state.kanban.data    = records;
        this.state.kanban.total   = total;
        this.state.kanban.loading = false;
    }

    // ── Aggregation ──────────────────────────────────────────────────────────
    _aggregate(records) {
        const nrpSet = new Set(records.map(r => r.nrp).filter(Boolean));

        // Count per polres
        const polresMap = {};
        records.forEach(r => {
            if (r.polres_id) {
                const [id, name] = r.polres_id;
                if (!polresMap[id]) polresMap[id] = { name, count: 0 };
                polresMap[id].count++;
            }
        });

        let polresTeraktif = "-", polresTeraktifCount = 0;
        Object.values(polresMap).forEach(p => {
            if (p.count > polresTeraktifCount) {
                polresTeraktifCount = p.count;
                polresTeraktif = p.name;
            }
        });

        // Count per date — konversi UTC ke local date dulu
        const dateMap = {};
        records.forEach(r => {
            if (r.tanggal) {
                const iso = `${r.tanggal.replace(' ', 'T')}Z`;
                const dt  = new Date(iso);
                const d   = isNaN(dt.getTime())
                    ? r.tanggal.substring(0, 10)
                    : `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                dateMap[d] = (dateMap[d] || 0) + 1;
            }
        });

        let hariTeraktif = "-", hariTeraktifCount = 0;
        Object.entries(dateMap).forEach(([d, cnt]) => {
            if (cnt > hariTeraktifCount) { hariTeraktifCount = cnt; hariTeraktif = d; }
        });

        const _n = (n) => n.toLocaleString('id-ID');
        this.state.kpi = {
            total: _n(records.length), petugas: _n(nrpSet.size),
            polresTeraktif, polresTeraktifCount: _n(polresTeraktifCount),
            hariTeraktif: this._fmtDateDisplay(hariTeraktif),
            hariTeraktifCount: _n(hariTeraktifCount),
        };

        // Polres bar: always show ALL polres sorted by count desc
        const barAll = this.state.polresList
            .map(p => ({ name: p.name, count: polresMap[p.id] ? polresMap[p.id].count : 0 }))
            .sort((a, b) => b.count - a.count);
        this.state.barData = {
            labels: barAll.map(p => p.name),
            values: barAll.map(p => p.count),
        };

        // Ringkasan per Polres table: always show all polres
        const polsekByPolres = {};
        this.state.polsekAll.forEach(ps => {
            if (ps.polres_id) {
                const pid = ps.polres_id[0];
                if (!polsekByPolres[pid]) polsekByPolres[pid] = new Set();
                polsekByPolres[pid].add(ps.id);
            }
        });
        const polsekLaporByPolres = {};
        records.forEach(r => {
            if (r.polres_id && r.polsek_id) {
                const pid = r.polres_id[0];
                const sid = r.polsek_id[0];
                if (!polsekLaporByPolres[pid]) polsekLaporByPolres[pid] = new Set();
                polsekLaporByPolres[pid].add(sid);
            }
        });
        this.state.tblPolres.data = this.state.polresList.map(pr => {
            const allPolsek  = polsekByPolres[pr.id]       || new Set();
            const laporSet   = polsekLaporByPolres[pr.id]  || new Set();
            const total      = polresMap[pr.id] ? polresMap[pr.id].count : 0;
            return {
                id: pr.id, name: pr.name, total,
                polsekLapor: laporSet.size,
                polsekBelum: Math.max(0, allPolsek.size - laporSet.size),
            };
        });
        this.state.tblPolres.page = 1;

        // Map points: records with valid coordinates
        this.state.mapPoints = records
            .filter(r => !(r.latitude === 0 && r.longitude === 0))
            .map(r => ({
                id:      r.id,
                lat:     r.latitude,
                lng:     r.longitude,
                jenis:   r.jenis_laporan_id    ? r.jenis_laporan_id[1]    : "Giat",
                polres:  r.polres_id           ? r.polres_id[1]           : "-",
                polsek:  r.polsek_id           ? r.polsek_id[1]           : "-",
                tanggal: this._fmtDateTimeDisplay(r.tanggal),
                nrp:     r.nrp                 || "-",
                nama:    r.nama_petugas        || "-",
                pangkat: r.pangkat_petugas     || "-",
                kegiatan: r.kegiatan           || "",
            }));

        if (records.length === 0) {
            this.state.donutData       = [];
            this.state.lineData        = { dates: [], data: [] };
            this.state.barPolsekData   = { labels: [], values: [] };
            this.state.tblPolsek.data  = [];
            return;
        }

        // Donut: per jenis laporan
        const jenisMap = {};
        records.forEach(r => {
            const name = r.jenis_laporan_id ? r.jenis_laporan_id[1] : "Lainnya";
            jenisMap[name] = (jenisMap[name] || 0) + 1;
        });
        this.state.donutData = Object.entries(jenisMap).map(([name, value]) => ({ name, value }));

        // Line: daily trend
        const dates = this.state.dateFrom && this.state.dateTo
            ? this._dateRange(this.state.dateFrom, this.state.dateTo)
            : Object.keys(dateMap).sort();
        this.state.lineData = { dates, data: dates.map(d => dateMap[d] || 0) };

        // Polsek bar: top 5
        const polsekMap = {};
        records.forEach(r => {
            if (r.polsek_id) {
                const [id, name] = r.polsek_id;
                if (!polsekMap[id]) polsekMap[id] = { name, count: 0 };
                polsekMap[id].count++;
            }
        });
        const top5 = Object.values(polsekMap).sort((a, b) => b.count - a.count).slice(0, 5);
        this.state.barPolsekData = {
            labels: top5.map(p => p.name),
            values: top5.map(p => p.count),
        };

        // Polsek table: all polsek that submitted at least once
        const polsekTableMap = {};
        records.forEach(r => {
            if (r.polsek_id) {
                const [sid, sname] = r.polsek_id;
                const polresName = r.polres_id ? r.polres_id[1] : "-";
                if (!polsekTableMap[sid]) polsekTableMap[sid] = { id: sid, polsekName: sname, polresName, count: 0 };
                polsekTableMap[sid].count++;
            }
        });
        this.state.tblPolsek.data = Object.values(polsekTableMap);
        this.state.tblPolsek.page = 1;
    }

    _dateRange(from, to) {
        const dates = [];
        const cur = new Date(from);
        const end = new Date(to);
        while (cur <= end) {
            dates.push(this._fmtDate(cur));
            cur.setDate(cur.getDate() + 1);
        }
        return dates;
    }

    // ── Charts ───────────────────────────────────────────────────────────────
    _initCharts() {
        this._destroyCharts();
        if (this.state.donutData.length            && this.donutRef.el)     this._donut();
        if (this.state.lineData.dates.length       && this.lineRef.el)      this._line();
        if (this.state.barData.labels.length       && this.barRef.el)       this._bar();
        if (this.state.barPolsekData.labels.length && this.barPolsekRef.el) this._barPolsek();
        if (this.mapRef.el) this._initMap();
    }

    _donut() {
        const chart = echarts.init(this.donutRef.el);
        this._charts.push(chart);
        chart.setOption({
            color: ["#71639e","#27ae60","#e67e22","#8e44ad","#16a085","#c0392b","#2ecc71","#f39c12"],
            tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
            legend: { orient: "horizontal", bottom: 0, left: "center", type: "scroll", textStyle: { fontSize: 11 }, itemWidth: 12, itemHeight: 12, pageIconSize: 10 },
            series: [{
                type: "pie",
                radius: ["38%", "65%"],
                center: ["50%", "44%"],
                avoidLabelOverlap: false,
                label: { show: false },
                labelLine: { show: false },
                emphasis: {
                    label: { show: true, fontSize: 13, fontWeight: "bold" },
                    itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.25)" },
                },
                data: this.state.donutData,
            }],
        });
    }

    _line() {
        const chart = echarts.init(this.lineRef.el);
        this._charts.push(chart);
        chart.setOption({
            color: ["#71639e"],
            tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
            grid: { left: 44, right: 16, top: 14, bottom: 54 },
            xAxis: {
                type: "category",
                data: this.state.lineData.dates,
                axisLabel: { rotate: 40, fontSize: 11, formatter: v => v.substring(5) },
                boundaryGap: false,
            },
            yAxis: { type: "value", minInterval: 1, axisLabel: { fontSize: 11 } },
            series: [{
                type: "line",
                data: this.state.lineData.data,
                smooth: true,
                areaStyle: {
                    color: {
                        type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(41,128,185,0.35)" },
                            { offset: 1, color: "rgba(41,128,185,0.03)" },
                        ],
                    },
                },
                lineStyle: { width: 2.5 },
                symbol: "circle", symbolSize: 5,
                itemStyle: { color: "#71639e" },
            }],
        });
    }

    _bar() {
        const chart = echarts.init(this.barRef.el);
        this._charts.push(chart);
        const { labels, values } = this.state.barData;
        const endPct = labels.length <= 12 ? 100 : Math.round(1200 / labels.length);
        chart.setOption({
            color: ["#71639e"],
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
            grid: { left: 44, right: 16, top: 16, bottom: 80 },
            xAxis: {
                type: "category",
                data: labels,
                axisLabel: { rotate: 40, fontSize: 10, interval: 0, width: 80, overflow: "truncate", ellipsis: "..." },
            },
            yAxis: { type: "value", minInterval: 1, axisLabel: { fontSize: 11 } },
            dataZoom: [
                { type: "inside", xAxisIndex: 0, start: 0, end: endPct },
                { type: "slider", xAxisIndex: 0, start: 0, end: endPct, height: 18, bottom: 8 },
            ],
            series: [{
                type: "bar",
                data: values,
                barMaxWidth: 40,
                label: { show: true, position: "top", fontSize: 10, color: "#2c3e50", formatter: v => v > 0 ? v : "" },
                itemStyle: {
                    borderRadius: [4, 4, 0, 0],
                    color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [
                        { offset: 0, color: "#71639e" }, { offset: 1, color: "#855de2ff" },
                    ]},
                },
            }],
        });
    }

    _barPolsek() {
        const chart = echarts.init(this.barPolsekRef.el);
        this._charts.push(chart);
        const { labels, values } = this.state.barPolsekData;
        chart.setOption({
            color: ["#27ae60"],
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
            grid: { left: 44, right: 16, top: 16, bottom: 80 },
            xAxis: {
                type: "category",
                data: labels,
                axisLabel: { rotate: 40, fontSize: 10, interval: 0, width: 90, overflow: "truncate", ellipsis: "..." },
            },
            yAxis: { type: "value", minInterval: 1, axisLabel: { fontSize: 11 } },
            series: [{
                type: "bar",
                data: values,
                barMaxWidth: 50,
                label: { show: true, position: "top", fontSize: 11, color: "#2c3e50" },
                itemStyle: {
                    borderRadius: [4, 4, 0, 0],
                    color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [
                        { offset: 0, color: "#27ae60" }, { offset: 1, color: "#58d68d" },
                    ]},
                },
            }],
        });
    }

    _destroyCharts() {
        this._charts.forEach(c => { try { c.dispose(); } catch (_) {} });
        this._charts = [];
        if (this._leafletMap) {
            try { this._leafletMap.remove(); } catch (_) {}
            this._leafletMap = null;
        }
    }

    // ── Leaflet map ──────────────────────────────────────────────────────────
    _initMap() {
        const el = this.mapRef.el;
        if (!el) return;

        const map = L.map(el, {
            center: [-2.5, 118.0],
            zoom: 5,
            zoomControl: true,
        });
        this._leafletMap = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
            maxZoom: 19,
        }).addTo(map);

        const cluster = L.markerClusterGroup({
            chunkedLoading: true,
            maxClusterRadius: 60,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            iconCreateFunction: (c) => {
                const count = c.getChildCount();
                const size  = count < 10 ? 32 : count < 100 ? 38 : 44;
                return L.divIcon({
                    html: `<div class="petadigi-cluster-icon" style="width:${size}px;height:${size}px;line-height:${size}px;">${count}</div>`,
                    className: '',
                    iconSize: L.point(size, size),
                });
            },
        });

        const points = this.state.mapPoints;
        points.forEach(p => {
            const icon = L.divIcon({
                className: '',
                html: `<div class="petadigi-giat-marker"><i class="fa fa-user"></i></div>`,
                iconSize:   [28, 28],
                iconAnchor: [14, 14],
                popupAnchor: [0, -16],
            });

            const marker = L.marker([p.lat, p.lng], { icon });

            marker.bindPopup(this._buildGiatPopupHtml(p), {
                maxWidth: 300,
                className: 'petadigi-leaflet-popup',
            });

            marker.on('popupopen', () => {
                const fotoWrap = document.getElementById(`mg-giat-foto-wrap-${p.id}`);
                if (fotoWrap) {
                    // Buat img secara dinamis — hindari masalah src="" awal
                    const img = document.createElement('img');
                    img.className = 'mg-popup-foto-img';
                    img.alt = 'Foto Giat';
                    const spinner = fotoWrap.querySelector('.mg-popup-foto-spinner');

                    img.onload = () => {
                        if (img.naturalWidth > 1) {
                            fotoWrap.appendChild(img);
                            img.style.display = 'block';
                            if (spinner) spinner.style.display = 'none';
                        } else {
                            fotoWrap.style.display = 'none';
                        }
                    };
                    img.onerror = () => { fotoWrap.style.display = 'none'; };
                    img.src = `/web/image/petadigi.hasil_giat/${p.id}/foto`;
                }
                // Bind tombol detail
                const btn = document.getElementById(`mg-giat-btn-${p.id}`);
                if (btn) {
                    btn.onclick = () => this.action.doAction({
                        type:      'ir.actions.act_window',
                        res_model: 'petadigi.hasil_giat',
                        res_id:    p.id,
                        views:     [[false, 'form']],
                        target:    'current',
                    });
                }
            });

            cluster.addLayer(marker);
        });

        map.addLayer(cluster);

        if (points.length) {
            const bounds = cluster.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
            }
        }

        setTimeout(() => { try { map.invalidateSize(); } catch (_) {} }, 100);
    }

    _buildGiatPopupHtml(p) {
        const polsekRow = p.polsek !== '-'
            ? `<tr><td><i class="fa fa-map-marker"></i> Polsek</td>
                   <td><strong>${p.polsek}</strong></td></tr>`
            : '';
        const kegRow = p.kegiatan
            ? `<tr><td><i class="fa fa-file-text-o"></i> Kegiatan</td>
                   <td><strong>${p.kegiatan.length > 80 ? p.kegiatan.substring(0, 80) + '…' : p.kegiatan}</strong></td></tr>`
            : '';

        return `
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#1a6b9a;">
                    <i class="fa fa-user"></i>
                    <strong>${p.jenis}</strong>
                </div>
                <div id="mg-giat-foto-wrap-${p.id}" class="mg-popup-foto">
                    <div class="mg-popup-foto-spinner">
                        <i class="fa fa-circle-o-notch fa-spin"></i>
                    </div>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-calendar"></i> Tanggal</td>
                            <td><strong>${p.tanggal}</strong></td></tr>
                        <tr><td><i class="fa fa-building"></i> Polres</td>
                            <td><strong>${p.polres}</strong></td></tr>
                        ${polsekRow}
                        <tr><td><i class="fa fa-id-badge"></i> Petugas</td>
                            <td><strong>${p.pangkat} ${p.nama}</strong></td></tr>
                        <tr><td><i class="fa fa-barcode"></i> NRP</td>
                            <td><strong>${p.nrp}</strong></td></tr>
                        ${kegRow}
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#1a6b9a;"
                            id="mg-giat-btn-${p.id}">
                        <i class="fa fa-external-link"></i> Lihat Detail
                    </button>
                </div>
            </div>`;
    }

    // ── Filter event handlers ────────────────────────────────────────────────
    onJenisChange(ev)  { this.state.jenisId  = ev.target.value; this._loadData(); }
    onPolresChange(ev) { this.state.polresId = ev.target.value; this._loadData(); }

    onClearDate() {
        const today = new Date();
        const from = new Date(today);
        from.setDate(from.getDate() - 30);
        this.state.dateFrom = this._fmtDate(from);
        this.state.dateTo   = this._fmtDate(today);
        if (this._fpRange) this._fpRange.setDate([this.state.dateFrom, this.state.dateTo]);
        this._loadData();
    }

    // ── Table: Ringkasan per Polres ──────────────────────────────────────────
    onPolresSearch(ev) {
        this.state.tblPolres.search = ev.target.value;
        this.state.tblPolres.page   = 1;
    }
    onPolresPerPage(ev) {
        this.state.tblPolres.perPage = parseInt(ev.target.value);
        this.state.tblPolres.page    = 1;
    }
    onPolresSort(ev) {
        const col = ev.currentTarget.dataset.col;
        const tbl = this.state.tblPolres;
        tbl.sortDir = tbl.sortCol === col ? (tbl.sortDir === "asc" ? "desc" : "asc") : "asc";
        tbl.sortCol = col;
        tbl.page    = 1;
    }
    onPolresPrev() { if (this.state.tblPolres.page > 1) this.state.tblPolres.page--; }
    onPolresNext() {
        const { page, perPage, data } = this.state.tblPolres;
        if (page < Math.ceil(data.length / perPage)) this.state.tblPolres.page++;
    }

    // ── Table: Polsek yang mengirim ──────────────────────────────────────────
    onPolsekSearch(ev) {
        this.state.tblPolsek.search = ev.target.value;
        this.state.tblPolsek.page   = 1;
    }
    onPolsekPerPage(ev) {
        this.state.tblPolsek.perPage = parseInt(ev.target.value);
        this.state.tblPolsek.page    = 1;
    }
    onPolsekSort(ev) {
        const col = ev.currentTarget.dataset.col;
        const tbl = this.state.tblPolsek;
        tbl.sortDir = tbl.sortCol === col ? (tbl.sortDir === "asc" ? "desc" : "asc") : "asc";
        tbl.sortCol = col;
        tbl.page    = 1;
    }
    onPolsekPrev() { if (this.state.tblPolsek.page > 1) this.state.tblPolsek.page--; }
    onPolsekNext() {
        const { page, perPage, data } = this.state.tblPolsek;
        if (page < Math.ceil(data.length / perPage)) this.state.tblPolsek.page++;
    }

    // ── Kanban: card click ───────────────────────────────────────────────────
    onKanbanCardClick(id) {
        this.action.doAction({
            type:      'ir.actions.act_window',
            res_model: 'petadigi.hasil_giat',
            res_id:    id,
            views:     [[false, 'form']],
            target:    'current',
        });
    }

    // ── Kanban: pagination ───────────────────────────────────────────────────
    onKanbanPerPage(ev) {
        this.state.kanban.perPage = parseInt(ev.target.value);
        this.state.kanban.page   = 1;
        this._loadKanban();
    }
    onKanbanPrev() {
        if (this.state.kanban.page > 1) {
            this.state.kanban.page--;
            this._loadKanban();
        }
    }
    onKanbanNext() {
        const { page, perPage, total } = this.state.kanban;
        if (page < Math.ceil(total / perPage)) {
            this.state.kanban.page++;
            this._loadKanban();
        }
    }

    // ── Kanban: delete ───────────────────────────────────────────────────────
    onDeleteClick(id, label) {
        this.state.confirmDelete = { visible: true, id, label: label || 'data ini' };
    }
    async onDeleteConfirm() {
        const id = this.state.confirmDelete.id;
        this.state.confirmDelete = { visible: false, id: null, label: '' };
        await this.orm.unlink("petadigi.hasil_giat", [id]);
        await this._loadData();
    }
    onDeleteCancel() {
        this.state.confirmDelete = { visible: false, id: null, label: '' };
    }
}

registry.category("actions").add("petadigi.MonitoringGiatDashboard", MonitoringGiatDashboard);
