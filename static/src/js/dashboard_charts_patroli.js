/** @odoo-module **/

import { fmtTanggalJam } from "./dashboard_helpers";

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function _renderBarChart(ctx, names, values) {
    const el = ctx.chartPatroliBarRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsPatroliBar) ctx._echartsPatroliBar.dispose();
    ctx._echartsPatroliBar = echarts.init(el);
    ctx._echartsPatroliBar.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: params => {
                const p = params[0];
                return `${p.name}<br/><b>Total Patroli: ${p.value.toLocaleString('id-ID')}</b>`;
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
                    { offset: 0, color: '#27ae60' },
                    { offset: 1, color: '#145a32' },
                ]),
                borderRadius: [4, 4, 0, 0],
            },
            emphasis: { itemStyle: { color: '#1e8449' } },
        }],
    });
}

function _renderTrendChart(ctx, months, patroliData, lokasiData) {
    const el = ctx.chartPatroliTrendRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsPatroliTrend) ctx._echartsPatroliTrend.dispose();
    ctx._echartsPatroliTrend = echarts.init(el);
    ctx._echartsPatroliTrend.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: params => {
                const pat = params.find(p => p.seriesName === 'Patroli');
                const lok = params.find(p => p.seriesName === 'Titik Lokasi');
                return `<b>${params[0]?.name}</b><br/>`
                    + `<span style="color:#27ae60">&#9632;</span> Patroli: <b>${(pat?.value || 0).toLocaleString('id-ID')}</b><br/>`
                    + `<span style="color:#148F77">&#9632;</span> Titik Lokasi: <b>${(lok?.value || 0).toLocaleString('id-ID')}</b>`;
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
                axisLabel: { fontSize: 10, color: '#27ae60', margin: 4 },
                splitLine: { lineStyle: { color: '#f3f0f5', type: 'dashed' } },
            },
            {
                type: 'value',
                minInterval: 1,
                axisLabel: { fontSize: 10, color: '#148F77', margin: 4 },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: 'Patroli',
                type: 'line',
                yAxisIndex: 0,
                data: patroliData,
                smooth: false,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { color: '#27ae60', width: 2 },
                itemStyle: { color: '#27ae60', borderColor: '#fff', borderWidth: 2 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(39,174,96,0.20)' },
                        { offset: 1, color: 'rgba(39,174,96,0.02)' },
                    ]),
                },
                label: { show: false },
            },
            {
                name: 'Titik Lokasi',
                type: 'bar',
                yAxisIndex: 1,
                data: lokasiData,
                barMaxWidth: 28,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#1abc9c' },
                        { offset: 1, color: '#148F77' },
                    ]),
                    borderRadius: [4, 4, 0, 0],
                },
                label: {
                    show: true,
                    position: 'top',
                    fontSize: 10,
                    color: '#148F77',
                    fontWeight: '600',
                    formatter: p => p.value > 0 ? p.value.toLocaleString('id-ID') : '',
                },
            },
        ],
    });
}

export function disposePatroliCharts(ctx) {
    if (ctx._echartsPatroliBar)   { ctx._echartsPatroliBar.dispose();   ctx._echartsPatroliBar   = null; }
    if (ctx._echartsPatroliTrend) { ctx._echartsPatroliTrend.dispose(); ctx._echartsPatroliTrend = null; }
}

export async function updatePatroliCharts(ctx, mode) {
    const ver = ctx._modeVersion;
    const row = ctx.chartPatroliRowRef?.el;
    if (!row) return;

    if (mode !== 'patroli') {
        if (ctx.currentMode !== 'patroli') {
            row.style.display = 'none';
            disposePatroliCharts(ctx);
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
        ...(polresId    ? [['polres_id',    '=',  polresId]]                   : []),
        ...(kabupatenId ? [['kabupaten_id', '=',  kabupatenId]]               : []),
        ...(stateValue  ? [['state',        '=',  stateValue]]                : []),
        ...(dateFrom    ? [['tanggal_mulai', '>=', dateFrom + ' 00:00:00']]   : []),
        ...(dateTo      ? [['tanggal_mulai', '<=', dateTo   + ' 23:59:59']]   : []),
    ];

    const lokasiBaseDomain = [
        ...drillDomain.map(([f, op, v]) => [`patroli_id.${f}`, op, v]),
        ...(polresId    ? [['patroli_id.polres_id',    '=',  polresId]]                      : []),
        ...(kabupatenId ? [['patroli_id.kabupaten_id', '=',  kabupatenId]]                   : []),
        ...(stateValue  ? [['patroli_id.state',        '=',  stateValue]]                    : []),
        ...(dateFrom    ? [['patroli_id.tanggal_mulai', '>=', dateFrom + ' 00:00:00']]       : []),
        ...(dateTo      ? [['patroli_id.tanggal_mulai', '<=', dateTo   + ' 23:59:59']]       : []),
    ];

    try {
        const [polresGroups, trendGroups, lokasiTrendGroups] = await Promise.all([
            ctx.orm.call('petadigi.patroli', 'read_group',
                [baseDomain, ['polres_id'], ['polres_id']], { lazy: false }),
            ctx.orm.call('petadigi.patroli', 'read_group',
                [baseDomain, [], ['tanggal_mulai:month']], { lazy: false }),
            ctx.orm.call('petadigi.lokasi_patroli', 'read_group',
                [lokasiBaseDomain, [], ['tanggal:month']], { lazy: false }),
        ]);

        if (ctx._modeVersion !== ver) return;

        const barData = polresGroups
            .filter(g => Array.isArray(g.polres_id) && (g.__count || 0) > 0)
            .map(g => ({ name: g.polres_id[1], count: g.__count }))
            .sort((a, b) => b.count - a.count);
        const barNames  = barData.map(p => p.name);
        const barValues = barData.map(p => p.count);

        const patroliData = new Array(12).fill(0);
        trendGroups.forEach(g => {
            const from = g.__range?.['tanggal_mulai:month']?.from
                      || g.__range?.['tanggal_mulai']?.from;
            if (!from) return;
            const month = new Date(from.replace(' ', 'T') + 'Z').getMonth();
            if (month < 0 || month > 11) return;
            patroliData[month] += g.__count || 0;
        });

        const lokasiData = new Array(12).fill(0);
        lokasiTrendGroups.forEach(g => {
            const from = g.__range?.['tanggal:month']?.from
                      || g.__range?.['tanggal']?.from;
            if (!from) return;
            const month = new Date(from.replace(' ', 'T') + 'Z').getMonth();
            if (month < 0 || month > 11) return;
            lokasiData[month] += g.__count || 0;
        });

        _renderBarChart(ctx, barNames, barValues);
        _renderTrendChart(ctx, MONTHS_ID, patroliData, lokasiData);
    } catch (e) {
        console.error('Patroli chart load error:', e);
    }
}

// ─── Data Table ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export async function updatePatroliTable(ctx, mode, page) {
    const ver    = ctx._modeVersion;
    const rowEl  = ctx.tablePatroliRowRef?.el;
    const bodyEl = ctx.tablePatroliBodyRef?.el;
    if (!rowEl) return;

    if (mode !== 'patroli') {
        if (ctx.currentMode !== 'patroli') rowEl.style.display = 'none';
        return;
    }
    rowEl.style.display = 'flex';

    ctx._patroliTablePage = (page !== undefined) ? page : 1;
    const offset = (ctx._patroliTablePage - 1) * PAGE_SIZE;

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
        ...(polresId    ? [['polres_id',    '=',  polresId]]                   : []),
        ...(kabupatenId ? [['kabupaten_id', '=',  kabupatenId]]               : []),
        ...(stateValue  ? [['state',        '=',  stateValue]]                : []),
        ...(dateFrom    ? [['tanggal_mulai', '>=', dateFrom + ' 00:00:00']]   : []),
        ...(dateTo      ? [['tanggal_mulai', '<=', dateTo   + ' 23:59:59']]   : []),
    ];

    bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#bbb;font-size:13px;">Memuat data...</div>`;

    try {
        const [records, total] = await Promise.all([
            ctx.orm.searchRead(
                'petadigi.patroli',
                domain,
                ['id', 'code', 'tanggal_mulai', 'tanggal_selesai',
                 'polres_id', 'polsek_id', 'kabupaten_id', 'kecamatan_id', 'desa_id',
                 'personel_count', 'lokasi_count', 'state'],
                { order: 'tanggal_mulai desc', limit: PAGE_SIZE, offset }
            ),
            ctx.orm.searchCount('petadigi.patroli', domain),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const curPage    = ctx._patroliTablePage;
        const fromRow    = total > 0 ? offset + 1 : 0;
        const toRow      = Math.min(offset + PAGE_SIZE, total);

        const rows = records.map((r, i) => {
            const polres = Array.isArray(r.polres_id)    ? r.polres_id[1]    : '-';
            const polsek = Array.isArray(r.polsek_id)    ? r.polsek_id[1]    : '-';
            const kab    = Array.isArray(r.kabupaten_id) ? r.kabupaten_id[1] : '-';
            const kec    = Array.isArray(r.kecamatan_id) ? r.kecamatan_id[1] : '-';
            const desa   = Array.isArray(r.desa_id)      ? r.desa_id[1]      : '-';
            const statusClass = r.state === 'SELESAI'
                ? 'petadigi-badge petadigi-badge--green'
                : 'petadigi-badge petadigi-badge--red';

            return `
                <tr class="petadigi-table-row" data-id="${r.id}" style="cursor:pointer;">
                    <td class="petadigi-td">${offset + i + 1}</td>
                    <td class="petadigi-td petadigi-td--mono">${r.code || '-'}</td>
                    <td class="petadigi-td" style="white-space:nowrap;">${fmtTanggalJam(r.tanggal_mulai)}</td>
                    <td class="petadigi-td" style="white-space:nowrap;">${fmtTanggalJam(r.tanggal_selesai)}</td>
                    <td class="petadigi-td">${polres}</td>
                    <td class="petadigi-td">${polsek}</td>
                    <td class="petadigi-td">${kab}</td>
                    <td class="petadigi-td">${kec}</td>
                    <td class="petadigi-td">${desa}</td>
                    <td class="petadigi-td" style="text-align:center;">${r.personel_count || 0}</td>
                    <td class="petadigi-td" style="text-align:center;">${r.lokasi_count || 0}</td>
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
                            <th class="petadigi-th">Tgl Mulai</th>
                            <th class="petadigi-th">Tgl Selesai</th>
                            <th class="petadigi-th">Polres</th>
                            <th class="petadigi-th">Polsek</th>
                            <th class="petadigi-th">Kabupaten</th>
                            <th class="petadigi-th">Kecamatan</th>
                            <th class="petadigi-th">Desa</th>
                            <th class="petadigi-th">Personel</th>
                            <th class="petadigi-th">Titik Lokasi</th>
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
                    res_model: 'petadigi.patroli',
                    res_id: id,
                    views: [[false, 'form']],
                    target: 'current',
                });
            });
        });

        bodyEl.querySelector('[data-action="prev"]')
            ?.addEventListener('click', () => updatePatroliTable(ctx, mode, curPage - 1));
        bodyEl.querySelector('[data-action="next"]')
            ?.addEventListener('click', () => updatePatroliTable(ctx, mode, curPage + 1));

    } catch (e) {
        console.error('Patroli table load error:', e);
        bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#e74c3c;font-size:13px;">Gagal memuat data</div>`;
    }
}
