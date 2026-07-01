/** @odoo-module **/

import { fmtTanggalJam } from "./dashboard_helpers";

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

export function disposeStrongCharts(ctx) {
    if (ctx._echartsStrongBar)   { ctx._echartsStrongBar.dispose();   ctx._echartsStrongBar   = null; }
    if (ctx._echartsStrongTrend) { ctx._echartsStrongTrend.dispose(); ctx._echartsStrongTrend = null; }
}

export async function updateStrongCharts(ctx, mode) {
    const ver = ctx._modeVersion;
    const row = ctx.chartStrongRowRef?.el;
    if (!row) return;

    if (mode !== 'strong') {
        if (ctx.currentMode !== 'strong') {
            row.style.display = 'none';
            disposeStrongCharts(ctx);
        }
        return;
    }
    row.style.display = 'flex';

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
        ...(dateFrom    ? [['tanggal_mulai',   '>=', dateFrom + ' 00:00:00']]   : []),
        ...(dateTo      ? [['tanggal_mulai',   '<=', dateTo   + ' 23:59:59']]   : []),
    ];

    try {
        const [polresGroups, trendGroups, personelGroups] = await Promise.all([
            ctx.orm.call('petadigi.strong_point', 'read_group',
                [baseDomain, ['polres_id'], ['polres_id']], { lazy: false }),
            ctx.orm.call('petadigi.strong_point', 'read_group',
                [baseDomain, [], ['tanggal_mulai:month']], { lazy: false }),
            ctx.orm.call('petadigi.strong_point', 'read_group',
                [baseDomain, ['personel_count:sum'], ['tanggal_mulai:month']], { lazy: false }),
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
            const month = new Date(rangeFrom.replace(' ', 'T') + 'Z').getMonth();
            if (month < 0 || month > 11) return;
            totalData[month] += g.__count || 0;
        });

        // Bar chart total personel per bulan
        const personelData = new Array(12).fill(0);
        personelGroups.forEach(g => {
            const rangeFrom = g.__range?.['tanggal_mulai:month']?.from
                           || g.__range?.['tanggal_mulai']?.from;
            if (!rangeFrom) return;
            const month = new Date(rangeFrom.replace(' ', 'T') + 'Z').getMonth();
            if (month < 0 || month > 11) return;
            personelData[month] += g.personel_count || 0;
        });

        _renderBarChart(ctx, barNames, barValues);
        _renderTrendChart(ctx, MONTHS_ID, totalData, personelData);
    } catch (e) {
        console.error('Strong Point chart load error:', e);
    }
}

// ─── Data Table ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export async function updateStrongTable(ctx, mode, page) {
    const ver    = ctx._modeVersion;
    const rowEl  = ctx.tableStrongRowRef?.el;
    const bodyEl = ctx.tableStrongBodyRef?.el;
    if (!rowEl) return;

    if (mode !== 'strong') {
        if (ctx.currentMode !== 'strong') rowEl.style.display = 'none';
        return;
    }
    rowEl.style.display = 'flex';

    ctx._strongTablePage = (page !== undefined) ? page : 1;
    const offset = (ctx._strongTablePage - 1) * PAGE_SIZE;

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
        ...(polresId    ? [['polres_id',      '=',  polresId]]                : []),
        ...(kabupatenId ? [['kabupaten_id',   '=',  kabupatenId]]             : []),
        ...(stateValue  ? [['state',          '=',  stateValue]]              : []),
        ...(dateFrom    ? [['tanggal_mulai',  '>=', dateFrom + ' 00:00:00']]  : []),
        ...(dateTo      ? [['tanggal_mulai',  '<=', dateTo   + ' 23:59:59']]  : []),
    ];

    bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#bbb;font-size:13px;">Memuat data...</div>`;

    try {
        const [records, total] = await Promise.all([
            ctx.orm.searchRead(
                'petadigi.strong_point',
                domain,
                ['id', 'code', 'lokasi_id', 'tanggal_mulai', 'tanggal_selesai',
                 'polres_id', 'polsek_id', 'kabupaten_id', 'kecamatan_id', 'desa_id',
                 'personel_count', 'state'],
                { order: 'tanggal_mulai desc', limit: PAGE_SIZE, offset }
            ),
            ctx.orm.searchCount('petadigi.strong_point', domain),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const curPage    = ctx._strongTablePage;
        const fromRow    = total > 0 ? offset + 1 : 0;
        const toRow      = Math.min(offset + PAGE_SIZE, total);

        const rows = records.map((r, i) => {
            const polres = Array.isArray(r.polres_id)    ? r.polres_id[1]    : '-';
            const polsek = Array.isArray(r.polsek_id)    ? r.polsek_id[1]    : '-';
            const kab    = Array.isArray(r.kabupaten_id) ? r.kabupaten_id[1] : '-';
            const kec    = Array.isArray(r.kecamatan_id) ? r.kecamatan_id[1] : '-';
            const desa   = Array.isArray(r.desa_id)      ? r.desa_id[1]      : '-';
            const lokasi = Array.isArray(r.lokasi_id)    ? r.lokasi_id[1]    : '-';
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

        if (ctx._modeVersion !== ver) return;
        bodyEl.innerHTML = `
            <div class="petadigi-table-toolbar">
                <span class="petadigi-table-info">
                    ${total > 0
                        ? `Menampilkan&nbsp;<b>${fromRow}–${toRow}</b>&nbsp;dari&nbsp;<b>${total.toLocaleString('id-ID')}</b>&nbsp;data`
                        : 'Tidak ada data'}
                </span>
                <div class="petadigi-table-pagination">
                    <button class="petadigi-page-btn" data-action="prev" ${curPage <= 1 ? 'disabled' : ''}>
                        <i class="fa fa-chevron-left"></i>
                    </button>
                    <span class="petadigi-page-info">Hal. ${curPage} / ${totalPages}</span>
                    <button class="petadigi-page-btn" data-action="next" ${curPage >= totalPages ? 'disabled' : ''}>
                        <i class="fa fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            <div class="petadigi-table-wrapper">
                <table class="petadigi-table">
                    <thead>
                        <tr>
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
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || `<tr><td colspan="12" style="text-align:center;padding:24px;color:#bbb;font-size:13px;">Tidak ada data</td></tr>`}
                    </tbody>
                </table>
            </div>`;

        bodyEl.querySelectorAll('.petadigi-table-row').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = parseInt(tr.dataset.id);
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

    } catch (e) {
        console.error('Strong Point table load error:', e);
        bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#e74c3c;font-size:13px;">Gagal memuat data</div>`;
    }
}
