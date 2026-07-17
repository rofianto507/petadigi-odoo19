/** @odoo-module **/

import { fmtTanggalJam, wibDateStartUtc, wibDateEndUtc } from "./dashboard_helpers";

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function _renderBarChart(ctx, names, values) {
    const el = ctx.chartStrongBarRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsStrongBar) ctx._echartsStrongBar.dispose();
    ctx._echartsStrongBar = echarts.init(el);
    ctx._echartsStrongBar.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: params => {
                const p = params[0];
                return `${p.name}<br/><b>Total Strong Point: ${p.value.toLocaleString('id-ID')}</b>`;
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
                    { offset: 0, color: '#2E86C1' },
                    { offset: 1, color: '#1A5276' },
                ]),
                borderRadius: [4, 4, 0, 0],
            },
            emphasis: { itemStyle: { color: '#1F618D' } },
        }],
    });
}

function _renderTrendChart(ctx, months, totalData, personelData) {
    const el = ctx.chartStrongTrendRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsStrongTrend) ctx._echartsStrongTrend.dispose();
    ctx._echartsStrongTrend = echarts.init(el);
    ctx._echartsStrongTrend.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: params => {
                const sp  = params.find(p => p.seriesName === 'Strong Point');
                const per = params.find(p => p.seriesName === 'Personel');
                return `<b>${params[0]?.name}</b><br/>`
                    + `<span style="color:#1a6b9a">&#9632;</span> Strong Point: <b>${(sp?.value || 0).toLocaleString('id-ID')}</b><br/>`
                    + `<span style="color:#8e44ad">&#9632;</span> Personel: <b>${(per?.value || 0).toLocaleString('id-ID')}</b>`;
            },
        },
        legend: {
            top: 4,
            textStyle: { fontSize: 11, color: '#555' },
            icon: 'roundRect',
            itemWidth: 12,
            itemHeight: 8,
        },
        grid: { left: 12, right: 48, top: 36, bottom: 24, containLabel: true },
        xAxis: {
            type: 'category',
            data: months,
            axisLabel: { fontSize: 10, color: '#666' },
            axisLine: { lineStyle: { color: '#d0d7de' } },
            axisTick: { show: false },
        },
        yAxis: [
            {
                type: 'value',
                minInterval: 1,
                axisLabel: { fontSize: 10, color: '#1a6b9a', margin: 4 },
                splitLine: { lineStyle: { color: '#f3f0f5', type: 'dashed' } },
            },
            {
                type: 'value',
                minInterval: 1,
                axisLabel: { fontSize: 10, color: '#8e44ad', margin: 4 },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: 'Strong Point',
                type: 'line',
                yAxisIndex: 0,
                data: totalData,
                smooth: false,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { color: '#1a6b9a', width: 2 },
                itemStyle: { color: '#1a6b9a', borderColor: '#fff', borderWidth: 2 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(26,107,154,0.20)' },
                        { offset: 1, color: 'rgba(26,107,154,0.02)' },
                    ]),
                },
                label: { show: false },
            },
            {
                name: 'Personel',
                type: 'bar',
                yAxisIndex: 1,
                data: personelData,
                barMaxWidth: 28,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#c688e0' },
                        { offset: 1, color: '#a46abb' },
                    ]),
                    borderRadius: [4, 4, 0, 0],
                },
                label: {
                    show: true,
                    position: 'top',
                    fontSize: 10,
                    color: '#8e44ad',
                    fontWeight: '600',
                    formatter: p => p.value > 0 ? p.value.toLocaleString('id-ID') : '',
                },
            },
        ],
    });
}

const WAKTU_LABELS = ['00:00-02:59', '03:00-05:59', '06:00-08:59', '09:00-11:59',
                      '12:00-14:59', '15:00-17:59', '18:00-20:59', '21:00-23:59'];

function _renderWaktuChart(ctx, spValues, lalinValues) {
    const el = ctx.chartStrongDailyRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsStrongDaily) ctx._echartsStrongDaily.dispose();
    ctx._echartsStrongDaily = echarts.init(el);

    ctx._echartsStrongDaily.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: params => {
                const sp    = params.find(p => p.seriesName === 'Strong Point');
                const lalin = params.find(p => p.seriesName === 'Gangguan Lalin');
                return `<b>${params[0]?.name}</b><br/>`
                    + `<span style="color:#1a6b9a">&#9632;</span> Strong Point: <b>${(sp?.value || 0).toLocaleString('id-ID')}</b><br/>`
                    + `<span style="color:#e67e22">&#9632;</span> Gangguan Lalin: <b>${(lalin?.value || 0).toLocaleString('id-ID')}</b>`;
            },
        },
        legend: {
            bottom: 0,
            textStyle: { fontSize: 11, color: '#555' },
            icon: 'roundRect',
            itemWidth: 12, itemHeight: 8,
        },
        grid: { left: 12, right: 24, top: 12, bottom: 48, containLabel: true },
        xAxis: {
            type: 'category',
            data: WAKTU_LABELS,
            axisLabel: { fontSize: 10, color: '#666', rotate: 30, interval: 0 },
            axisLine: { lineStyle: { color: '#e5e7eb' } },
            axisTick: { show: false },
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            axisLabel: { fontSize: 10, color: '#999' },
            splitLine: { lineStyle: { color: '#f0f0f0' } },
        },
        series: [
            {
                name: 'Strong Point',
                type: 'line',
                smooth: false,
                data: spValues,
                lineStyle: { color: '#1a6b9a', width: 2 },
                itemStyle: { color: '#1a6b9a' },
                symbol: 'circle',
                symbolSize: 6,
                areaStyle: {
                    color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: 'rgba(26,107,154,0.18)' }, { offset: 1, color: 'rgba(26,107,154,0)' }] },
                },
                label: {
                    show: true,
                    position: 'top',
                    fontSize: 10,
                    color: '#1a6b9a',
                    fontWeight: '600',
                    formatter: p => p.value > 0 ? p.value.toLocaleString('id-ID') : '',
                },
            },
            {
                name: 'Rawan Laka dan Macet',
                type: 'line',
                smooth: false,
                data: lalinValues,
                lineStyle: { color: '#e67e22', width: 2 },
                itemStyle: { color: '#e67e22' },
                symbol: 'circle',
                symbolSize: 6,
                areaStyle: {
                    color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [{ offset: 0, color: 'rgba(230,126,34,0.14)' }, { offset: 1, color: 'rgba(230,126,34,0)' }] },
                },
                label: {
                    show: true,
                    position: 'top',
                    fontSize: 10,
                    color: '#e67e22',
                    fontWeight: '600',
                    formatter: p => p.value > 0 ? p.value.toLocaleString('id-ID') : '',
                },
            },
        ],
    });
}

export function disposeStrongCharts(ctx) {
    if (ctx._echartsStrongBar)   { ctx._echartsStrongBar.dispose();   ctx._echartsStrongBar   = null; }
    if (ctx._echartsStrongTrend) { ctx._echartsStrongTrend.dispose(); ctx._echartsStrongTrend = null; }
    if (ctx._echartsStrongDaily) { ctx._echartsStrongDaily.dispose(); ctx._echartsStrongDaily = null; }
}

export async function updateStrongCharts(ctx, mode) {
    const ver      = ctx._modeVersion;
    const row      = ctx.chartStrongRowRef?.el;
    const dailyRow = ctx.chartStrongDailyRowRef?.el;
    if (!row) return;

    if (mode !== 'strong') {
        if (ctx.currentMode !== 'strong') {
            row.style.display = 'none';
            if (dailyRow) dailyRow.style.display = 'none';
            disposeStrongCharts(ctx);
        }
        return;
    }
    row.style.display = 'flex';
    if (dailyRow) dailyRow.style.display = 'flex';

    const kabupatenId = parseInt(ctx.filterKabupaten?.el?.value) || null;
    const stateValue  = ctx.filterState?.el?.value || '';
    const dateFrom    = ctx.activeDateFrom || '';
    const dateTo      = ctx.activeDateTo   || '';
    const polresId    = ctx._polresFilterId;

    const drillDomain = ctx.drillKecamatanId
        ? [['kecamatan_id', '=', ctx.drillKecamatanId]]
        : ctx.drillKabupatenId
            ? [['kabupaten_id', '=', ctx.drillKabupatenId]]
            : [];

    const baseDomain = [
        ...drillDomain,
        ...(polresId    ? [['polres_id',       '=',  polresId]]                 : []),
        ...(kabupatenId ? [['kabupaten_id',    '=',  kabupatenId]]              : []),
        ...(stateValue  ? [['state',           '=',  stateValue]]               : []),
        ...(dateFrom    ? [['tanggal_mulai',   '>=', wibDateStartUtc(dateFrom)]]   : []),
        ...(dateTo      ? [['tanggal_mulai',   '<=', wibDateEndUtc(dateTo)]]   : []),
    ];

    try {
        const lalinDomain = [
            ...(polresId    ? [['polres_id',        '=',  polresId]]                   : []),
            ...(kabupatenId ? [['kabupaten_id',      '=',  kabupatenId]]               : []),
            ...(dateFrom    ? [['tanggal_kejadian',  '>=', wibDateStartUtc(dateFrom)]] : []),
            ...(dateTo      ? [['tanggal_kejadian',  '<=', wibDateEndUtc(dateTo)]]     : []),
        ];

        const [polresGroups, trendGroups, personelGroups, dailyGroups, lalinDailyGroups] = await Promise.all([
            ctx.orm.call('petadigi.strong_point', 'read_group',
                [baseDomain, ['polres_id'], ['polres_id']], { lazy: false }),
            ctx.orm.call('petadigi.strong_point', 'read_group',
                [baseDomain, [], ['tanggal_mulai:month']], { lazy: false }),
            ctx.orm.call('petadigi.strong_point', 'read_group',
                [baseDomain, ['personel_count:sum'], ['tanggal_mulai:month']], { lazy: false }),
            ctx.orm.call('petadigi.strong_point', 'read_group',
                [baseDomain, [], ['tanggal_mulai:hour']], { lazy: false }),
            ctx.orm.call('petadigi.lalu_lintas', 'read_group',
                [lalinDomain, [], ['tanggal_kejadian:hour']], { lazy: false }),
        ]);

        if (ctx._modeVersion !== ver) return;

        // Bar chart per polres
        const barData = polresGroups
            .filter(g => Array.isArray(g.polres_id) && (g.__count || 0) > 0)
            .map(g => ({ name: g.polres_id[1], count: g.__count }))
            .sort((a, b) => b.count - a.count);
        const barNames  = barData.map(p => p.name);
        const barValues = barData.map(p => p.count);

        // Line chart total strong point per bulan
        const totalData = new Array(12).fill(0);
        trendGroups.forEach(g => {
            const rangeFrom = g.__range?.['tanggal_mulai:month']?.from
                           || g.__range?.['tanggal_mulai']?.from;
            if (!rangeFrom) return;
            const month = new Date(new Date(rangeFrom.replace(' ', 'T') + 'Z').getTime() + 7 * 3600 * 1000).getUTCMonth();
            if (month < 0 || month > 11) return;
            totalData[month] += g.__count || 0;
        });

        // Bar chart total personel per bulan
        const personelData = new Array(12).fill(0);
        personelGroups.forEach(g => {
            const rangeFrom = g.__range?.['tanggal_mulai:month']?.from
                           || g.__range?.['tanggal_mulai']?.from;
            if (!rangeFrom) return;
            const month = new Date(new Date(rangeFrom.replace(' ', 'T') + 'Z').getTime() + 7 * 3600 * 1000).getUTCMonth();
            if (month < 0 || month > 11) return;
            personelData[month] += g.personel_count || 0;
        });

        // Distribusi per slot waktu 3 jam (WIB) — Strong Point
        const spSlots = new Array(8).fill(0);
        dailyGroups.forEach(g => {
            const rangeFrom = g.__range?.['tanggal_mulai:hour']?.from
                           || g.__range?.['tanggal_mulai']?.from;
            if (!rangeFrom) return;
            const d    = new Date(rangeFrom.replace(' ', 'T') + 'Z');
            const slot = Math.floor(((d.getUTCHours() + 7) % 24) / 3);
            if (slot >= 0 && slot < 8) spSlots[slot] += g.__count || 0;
        });

        // Distribusi per slot waktu 3 jam (WIB) — Gangguan Lalin
        const lalinSlots = new Array(8).fill(0);
        lalinDailyGroups.forEach(g => {
            const rangeFrom = g.__range?.['tanggal_kejadian:hour']?.from
                           || g.__range?.['tanggal_kejadian']?.from;
            if (!rangeFrom) return;
            const d    = new Date(rangeFrom.replace(' ', 'T') + 'Z');
            const slot = Math.floor(((d.getUTCHours() + 7) % 24) / 3);
            if (slot >= 0 && slot < 8) lalinSlots[slot] += g.__count || 0;
        });

        _renderBarChart(ctx, barNames, barValues);
        _renderTrendChart(ctx, MONTHS_ID, totalData, personelData);
        _renderWaktuChart(ctx, spSlots, lalinSlots);
    } catch (e) {
        console.error('Strong Point chart load error:', e);
    }
}

// ─── Data Table ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export async function updateStrongTable(ctx, mode, page, viewMode) {
    const ver    = ctx._modeVersion;
    const rowEl  = ctx.tableStrongRowRef?.el;
    const bodyEl = ctx.tableStrongBodyRef?.el;
    if (!rowEl) return;

    if (mode !== 'strong') {
        if (ctx.currentMode !== 'strong') rowEl.style.display = 'none';
        return;
    }
    rowEl.style.display = 'flex';

    if (viewMode !== undefined) ctx._strongViewMode = viewMode;
    if (!ctx._strongViewMode) ctx._strongViewMode = 'table';

    ctx._strongTablePage = (page !== undefined) ? page : 1;
    const offset   = (ctx._strongTablePage - 1) * PAGE_SIZE;
    const isKanban = ctx._strongViewMode === 'kanban';

    const kabupatenId = parseInt(ctx.filterKabupaten?.el?.value) || null;
    const stateValue  = ctx.filterState?.el?.value || '';
    const dateFrom    = ctx.activeDateFrom || '';
    const dateTo      = ctx.activeDateTo   || '';
    const polresId    = ctx._polresFilterId;

    const drillDomain = ctx.drillKecamatanId
        ? [['kecamatan_id', '=', ctx.drillKecamatanId]]
        : ctx.drillKabupatenId
            ? [['kabupaten_id', '=', ctx.drillKabupatenId]]
            : [];

    const domain = [
        ...drillDomain,
        ...(polresId    ? [['polres_id',      '=',  polresId]]                   : []),
        ...(kabupatenId ? [['kabupaten_id',   '=',  kabupatenId]]                : []),
        ...(stateValue  ? [['state',          '=',  stateValue]]                 : []),
        ...(dateFrom    ? [['tanggal_mulai',  '>=', wibDateStartUtc(dateFrom)]]  : []),
        ...(dateTo      ? [['tanggal_mulai',  '<=', wibDateEndUtc(dateTo)]]      : []),
    ];

    bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#bbb;font-size:13px;">Memuat data...</div>`;

    try {
        const [records, total] = await Promise.all([
            ctx.orm.searchRead(
                'petadigi.strong_point',
                domain,
                ['id', 'code', 'lokasi_id', 'keterangan_lokasi', 'tanggal_mulai', 'tanggal_selesai',
                 'polres_id', 'polsek_id', 'kabupaten_id', 'kecamatan_id', 'desa_id',
                 'personel_count', 'state', 'foto'],
                { order: 'tanggal_mulai desc', limit: PAGE_SIZE, offset }
            ),
            ctx.orm.searchCount('petadigi.strong_point', domain),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const curPage    = ctx._strongTablePage;
        const fromRow    = total > 0 ? offset + 1 : 0;
        const toRow      = Math.min(offset + PAGE_SIZE, total);

        // ─── Table view ───────────────────────────────────────────────────────
        const tableContent = () => {
            const rows = records.map((r, i) => {
                const polres = Array.isArray(r.polres_id)    ? r.polres_id[1]    : '-';
                const polsek = Array.isArray(r.polsek_id)    ? r.polsek_id[1]    : '-';
                const kab    = Array.isArray(r.kabupaten_id) ? r.kabupaten_id[1] : '-';
                const kec    = Array.isArray(r.kecamatan_id) ? r.kecamatan_id[1] : '-';
                const desa   = Array.isArray(r.desa_id)      ? r.desa_id[1]      : '-';
                const lokasi = Array.isArray(r.lokasi_id)    ? r.lokasi_id[1]    : (r.keterangan_lokasi || '-');
                const statusClass = r.state === 'SELESAI'
                    ? 'petadigi-badge petadigi-badge--green'
                    : 'petadigi-badge petadigi-badge--red';
                return `
                    <tr class="petadigi-table-row" data-id="${r.id}" style="cursor:pointer;">
                        <td class="petadigi-td">${offset + i + 1}</td>
                        <td class="petadigi-td petadigi-td--mono">${r.code || '-'}</td>
                        <td class="petadigi-td">${lokasi}</td>
                        <td class="petadigi-td" style="white-space:nowrap;">${fmtTanggalJam(r.tanggal_mulai)}</td>
                        <td class="petadigi-td" style="white-space:nowrap;">${fmtTanggalJam(r.tanggal_selesai)}</td>
                        <td class="petadigi-td">${polres}</td>
                        <td class="petadigi-td">${polsek}</td>
                        <td class="petadigi-td">${kab}</td>
                        <td class="petadigi-td">${kec}</td>
                        <td class="petadigi-td">${desa}</td>
                        <td class="petadigi-td" style="text-align:center;">${r.personel_count || 0}</td>
                        <td class="petadigi-td"><span class="${statusClass}">${r.state || '-'}</span></td>
                    </tr>`;
            }).join('');
            return `
                <div class="petadigi-table-wrapper">
                    <table class="petadigi-table">
                        <thead><tr>
                            <th class="petadigi-th">#</th>
                            <th class="petadigi-th">Kode</th>
                            <th class="petadigi-th">Lokasi</th>
                            <th class="petadigi-th">Tgl Mulai</th>
                            <th class="petadigi-th">Tgl Selesai</th>
                            <th class="petadigi-th">Polres</th>
                            <th class="petadigi-th">Polsek</th>
                            <th class="petadigi-th">Kabupaten</th>
                            <th class="petadigi-th">Kecamatan</th>
                            <th class="petadigi-th">Desa</th>
                            <th class="petadigi-th">Personel</th>
                            <th class="petadigi-th">Status</th>
                        </tr></thead>
                        <tbody>
                            ${rows || `<tr><td colspan="12" style="text-align:center;padding:24px;color:#bbb;font-size:13px;">Tidak ada data</td></tr>`}
                        </tbody>
                    </table>
                </div>`;
        };

        // ─── Kanban view ──────────────────────────────────────────────────────
        const kanbanContent = () => {
            if (!records.length)
                return `<div style="text-align:center;padding:32px;color:#bbb;font-size:13px;">Tidak ada data</div>`;
            const cards = records.map(r => {
                const polres = Array.isArray(r.polres_id)    ? r.polres_id[1]    : '-';
                const kab    = Array.isArray(r.kabupaten_id) ? r.kabupaten_id[1] : '-';
                const kec    = Array.isArray(r.kecamatan_id) ? r.kecamatan_id[1] : '-';
                const lokasi = Array.isArray(r.lokasi_id)    ? r.lokasi_id[1]    : (r.keterangan_lokasi || '-');
                const statusCls = r.state === 'SELESAI' ? '--green' : '--red';
                const thumb = r.foto
                    ? `<img class="petadigi-kanban-thumb" src="/web/image/petadigi.strong_point/${r.id}/foto" alt="" loading="lazy" onerror="this.outerHTML='<div class=\\'petadigi-kanban-thumb-placeholder\\'><i class=\\'fa fa-map-pin\\'></i></div>'">`
                    : `<div class="petadigi-kanban-thumb-placeholder"><i class="fa fa-map-pin"></i></div>`;
                return `
                    <div class="petadigi-kanban-card" data-id="${r.id}">
                        ${thumb}
                        <div class="petadigi-kanban-body">
                            <div class="petadigi-kanban-code">${r.code || '-'}</div>
                            <div class="petadigi-kanban-name" title="${lokasi}">${lokasi}</div>
                            <div class="petadigi-kanban-meta"><i class="fa fa-shield" style="color:#1a6b9a;font-size:10px;"></i> ${polres}</div>
                            <div class="petadigi-kanban-meta"><i class="fa fa-map-marker" style="color:#e67e22;font-size:10px;"></i> ${kec}, ${kab}</div>
                            <div class="petadigi-kanban-volume"><i class="fa fa-clock-o" style="font-size:10px;"></i> ${fmtTanggalJam(r.tanggal_mulai)}</div>
                            <div class="petadigi-kanban-footer">
                                <span class="petadigi-badge petadigi-badge${statusCls}">${r.state || '-'}</span>
                                <span style="font-size:11px;color:#7f8c8d;"><i class="fa fa-users" style="font-size:10px;"></i> ${r.personel_count || 0}</span>
                            </div>
                        </div>
                    </div>`;
            }).join('');
            return `<div class="petadigi-kanban-grid">${cards}</div>`;
        };

        if (ctx._modeVersion !== ver) return;

        bodyEl.innerHTML = `
            <div class="petadigi-table-toolbar">
                <span class="petadigi-table-info">
                    ${total > 0
                        ? `Menampilkan&nbsp;<b>${fromRow}–${toRow}</b>&nbsp;dari&nbsp;<b>${total.toLocaleString('id-ID')}</b>&nbsp;data`
                        : 'Tidak ada data'}
                </span>
                <div style="display:flex;align-items:center;gap:8px;">
                    <div class="petadigi-table-pagination">
                        <button class="petadigi-page-btn" data-action="prev" ${curPage <= 1 ? 'disabled' : ''}><i class="fa fa-chevron-left"></i></button>
                        <span class="petadigi-page-info">Hal. ${curPage} / ${totalPages}</span>
                        <button class="petadigi-page-btn" data-action="next" ${curPage >= totalPages ? 'disabled' : ''}><i class="fa fa-chevron-right"></i></button>
                    </div>
                    <div class="petadigi-view-toggle">
                        <button class="petadigi-view-btn${!isKanban ? ' petadigi-view-btn--active' : ''}" data-view="table" title="Tampilan Tabel"><i class="fa fa-list"></i></button>
                        <button class="petadigi-view-btn${isKanban ? ' petadigi-view-btn--active' : ''}" data-view="kanban" title="Tampilan Kanban"><i class="fa fa-th"></i></button>
                    </div>
                </div>
            </div>
            ${isKanban ? kanbanContent() : tableContent()}`;

        bodyEl.querySelectorAll('.petadigi-table-row, .petadigi-kanban-card').forEach(el => {
            el.addEventListener('click', () => {
                const id = parseInt(el.dataset.id);
                if (!id) return;
                ctx.action.doAction({
                    type: 'ir.actions.act_window',
                    res_model: 'petadigi.strong_point',
                    res_id: id,
                    views: [[false, 'form']],
                    target: 'current',
                });
            });
        });
        bodyEl.querySelector('[data-action="prev"]')
            ?.addEventListener('click', () => updateStrongTable(ctx, mode, curPage - 1));
        bodyEl.querySelector('[data-action="next"]')
            ?.addEventListener('click', () => updateStrongTable(ctx, mode, curPage + 1));
        bodyEl.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', () => updateStrongTable(ctx, mode, 1, btn.dataset.view));
        });

    } catch (e) {
        console.error('Strong Point table load error:', e);
        bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#e74c3c;font-size:13px;">Gagal memuat data</div>`;
    }
}
