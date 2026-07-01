/** @odoo-module **/

import { fmtTanggal } from "./dashboard_helpers";

// ─── Bar chart: total per kabupaten ──────────────────────────────────────────
function _renderKamBarChart(ctx, names, values) {
    const el = ctx.chartKamBarRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsKamBar) ctx._echartsKamBar.dispose();
    ctx._echartsKamBar = echarts.init(el);
    ctx._echartsKamBar.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: params => {
                const p = params[0];
                return `${p.name}<br/><b>Total Kasus: ${p.value.toLocaleString('id-ID')}</b>`;
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
                    { offset: 0, color: '#48C9B0' },
                    { offset: 1, color: '#117A65' },
                ]),
                borderRadius: [4, 4, 0, 0],
            },
            emphasis: { itemStyle: { color: '#0E6655' } },
        }],
    });
}

// ─── Donut chart: per kategori ────────────────────────────────────────────────
function _renderKamDonutChart(ctx, data) {
    const el = ctx.chartKamDonutRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsKamDonut) ctx._echartsKamDonut.dispose();
    ctx._echartsKamDonut = echarts.init(el);
    const COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#3498DB',
                    '#9B59B6', '#1ABC9C', '#E91E63', '#FF5722', '#795548'];
    ctx._echartsKamDonut.setOption({
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
            label: { show: true, formatter: '{b}\n{c}', fontSize: 10, color: '#555' },
            labelLine: { length: 8, length2: 10 },
            itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
            emphasis: { itemStyle: { shadowBlur: 8, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' } },
        }],
    });
}

// ─── Bar chart: per modus operandi ───────────────────────────────────────────
function _renderKamModusChart(ctx, names, values) {
    const el = ctx.chartKamModusRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsKamModus) ctx._echartsKamModus.dispose();
    ctx._echartsKamModus = echarts.init(el);
    ctx._echartsKamModus.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: params => {
                const p = params[0];
                return `${p.name}<br/><b>Total: ${p.value.toLocaleString('id-ID')}</b>`;
            },
        },
        grid: { left: 10, right: 16, top: 10, bottom: 60, containLabel: true },
        xAxis: {
            type: 'category',
            data: names,
            axisLabel: {
                rotate: 40,
                fontSize: 10,
                color: '#666',
                interval: 0,
                formatter: v => v.length > 20 ? v.slice(0, 20) + '…' : v,
            },
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
                    { offset: 0, color: '#F39C12' },
                    { offset: 1, color: '#D35400' },
                ]),
                borderRadius: [4, 4, 0, 0],
            },
            emphasis: { itemStyle: { color: '#BA4A00' } },
        }],
    });
}

// ─── Half doughnut: per jenis TKP ───────────────────────────────────────────
function _renderKamTkpChart(ctx, data) {
    const el = ctx.chartKamTkpRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsKamTkp) ctx._echartsKamTkp.dispose();
    ctx._echartsKamTkp = echarts.init(el);
    const COLORS = ['#5DADE2', '#27AE60', '#E74C3C', '#F39C12', '#8E44AD',
                    '#16A085', '#2471A3', '#D35400', '#2ECC71', '#BDC3C7'];
    ctx._echartsKamTkp.setOption({
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
            textStyle: { fontSize: 10, color: '#555' },
            icon: 'circle',
            itemWidth: 8,
            itemHeight: 8,
            itemGap: 8,
            formatter: name => name.length > 16 ? name.slice(0, 16) + '…' : name,
        },
        color: COLORS,
        series: [{
            type: 'pie',
            radius: ['38%', '70%'],
            center: ['38%', '62%'],
            startAngle: 180,
            endAngle: 0,
            data,
            label: { show: true, formatter: '{b}\n{c}', fontSize: 10, color: '#555' },
            labelLine: { length: 6, length2: 8 },
            itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 3 },
            emphasis: { itemStyle: { shadowBlur: 8, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' } },
        }],
    });
}

// ─── Helper: proses month groups → array[12] ─────────────────────────────────
function _processKamMonthGroups(groups) {
    const data = new Array(12).fill(0);
    groups.forEach(g => {
        const rangeFrom = g.__range?.['tanggal_kejadian:month']?.from
                       || g.__range?.['tanggal_kejadian']?.from;
        if (!rangeFrom) return;
        const dateObj = new Date(rangeFrom.length > 10 ? rangeFrom.replace(' ', 'T') + 'Z' : rangeFrom);
        const month   = dateObj.getMonth(); // 0-11
        if (month >= 0 && month < 12) data[month] += g.__count || 0;
    });
    return data;
}

// ─── Area line: perbandingan dua tahun ───────────────────────────────────────
function _renderKamTahunanChart(ctx, months, currentData, prevData, selectedYear, prevYear) {
    const el = ctx.chartKamTahunanRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsKamTahunan) ctx._echartsKamTahunan.dispose();
    ctx._echartsKamTahunan = echarts.init(el);

    const totalCurrent = currentData.reduce((s, v) => s + v, 0);
    const totalPrev    = prevData.reduce((s, v) => s + v, 0);
    const trendPct     = totalPrev > 0 ? ((totalCurrent - totalPrev) / totalPrev * 100) : null;
    const trendIcon    = trendPct === null ? '' : (trendPct >= 0 ? '▲' : '▼');
    const trendText    = trendPct === null
        ? `Total ${selectedYear}: ${totalCurrent.toLocaleString('id-ID')}  |  Total ${prevYear}: ${totalPrev.toLocaleString('id-ID')}`
        : `Tren ${trendIcon} ${Math.abs(trendPct).toFixed(1)}%  |  Total ${selectedYear}: ${totalCurrent.toLocaleString('id-ID')}  |  Total ${prevYear}: ${totalPrev.toLocaleString('id-ID')}`;

    ctx._echartsKamTahunan.setOption({
        graphic: [{
            type: 'text', left: 'center', top: 10,
            style: { text: trendText, fill: '#117A65', fontSize: 12, fontWeight: 'bold' },
        }],
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: params => {
                const month = params[0]?.name || '';
                const cur   = params.find(p => p.seriesName === `Total ${selectedYear}`)?.value || 0;
                const prv   = params.find(p => p.seriesName === `Total ${prevYear}`)?.value     || 0;
                return `<b>${month}</b><br/>`
                     + `<span style="color:#48C9B0">&#9632;</span> ${selectedYear}: <b>${cur.toLocaleString('id-ID')}</b><br/>`
                     + `<span style="color:#F39C12">&#9632;</span> ${prevYear}: <b>${prv.toLocaleString('id-ID')}</b>`;
            },
        },
        legend: {
            bottom: 0,
            textStyle: { fontSize: 11, color: '#555' },
            icon: 'roundRect',
            itemWidth: 16,
            itemHeight: 8,
        },
        grid: { left: 10, right: 16, top: 48, bottom: 36, containLabel: true },
        xAxis: {
            type: 'category',
            data: months,
            boundaryGap: false,
            axisLabel: { fontSize: 10, color: '#666' },
            axisLine: { lineStyle: { color: '#d0d7de' } },
            axisTick: { show: false },
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: 10, color: '#888' },
            splitLine: { lineStyle: { color: '#f3f0f5', type: 'dashed' } },
        },
        series: [
            {
                name: `Total ${prevYear}`,
                type: 'line',
                data: prevData,
                smooth: true,
                symbol: 'circle',
                symbolSize: 5,
                lineStyle: { color: '#F5CBA7', width: 2, type: 'dashed' },
                itemStyle: { color: '#F39C12' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(243,156,18,0.15)' },
                        { offset: 1, color: 'rgba(243,156,18,0.01)' },
                    ]),
                },
                label: {
                    show: true, position: 'top', fontSize: 10, color: '#E67E22', fontWeight: '600',
                    formatter: p => p.value > 0 ? p.value.toLocaleString('id-ID') : '',
                },
            },
            {
                name: `Total ${selectedYear}`,
                type: 'line',
                data: currentData,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { color: '#48C9B0', width: 2.5 },
                itemStyle: { color: '#117A65' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(72,201,176,0.35)' },
                        { offset: 1, color: 'rgba(72,201,176,0.02)' },
                    ]),
                },
                label: {
                    show: true, position: 'top', fontSize: 10, color: '#117A65', fontWeight: '600',
                    formatter: p => p.value > 0 ? p.value.toLocaleString('id-ID') : '',
                },
            },
        ],
    });
}

// ─── Exported ─────────────────────────────────────────────────────────────────

export function disposeKamCharts(ctx) {
    if (ctx._echartsKamBar)     { ctx._echartsKamBar.dispose();     ctx._echartsKamBar     = null; }
    if (ctx._echartsKamDonut)   { ctx._echartsKamDonut.dispose();   ctx._echartsKamDonut   = null; }
    if (ctx._echartsKamModus)   { ctx._echartsKamModus.dispose();   ctx._echartsKamModus   = null; }
    if (ctx._echartsKamTkp)     { ctx._echartsKamTkp.dispose();     ctx._echartsKamTkp     = null; }
    if (ctx._echartsKamTahunan) { ctx._echartsKamTahunan.dispose(); ctx._echartsKamTahunan = null; }
}

export async function updateKamCharts(ctx, mode) {
    const ver  = ctx._modeVersion;
    const row  = ctx.chartKamRowRef?.el;
    const row2 = ctx.chartKamRow2Ref?.el;
    const row3 = ctx.chartKamRow3Ref?.el;
    if (!row) return;

    if (mode !== 'kam') {
        if (ctx.currentMode !== 'kam') {
            row.style.display = 'none';
            if (row2) row2.style.display = 'none';
            if (row3) row3.style.display = 'none';
            disposeKamCharts(ctx);
        }
        return;
    }
    row.style.display  = 'flex';
    if (row2) row2.style.display = 'flex';
    if (row3) row3.style.display = 'flex';

    const tahun       = ctx.filterTahun?.el?.value       || '';
    const dateFrom    = ctx.activeDateFrom                || '';
    const dateTo      = ctx.activeDateTo                  || '';
    const kategoriId  = parseInt(ctx.filterKategori?.el?.value)   || null;
    const kabupatenId = parseInt(ctx.filterKabupaten?.el?.value)  || null;
    const stateValue  = ctx.filterState?.el?.value        || '';

    const drillDomain = ctx.drillKecamatanId
        ? [['kecamatan_id', '=', ctx.drillKecamatanId]]
        : ctx.drillKabupatenId
            ? [['kabupaten_id', '=', ctx.drillKabupatenId]]
            : [];

    const baseDomain = [
        ...drillDomain,
        ...(kabupatenId ? [['kabupaten_id',             '=',  kabupatenId]]                : []),
        ...(stateValue  ? [['state',                   '=',  stateValue]]                 : []),
        ...(tahun       ? [['tahun', '=',  tahun]]                       : []),
        ...(dateFrom    ? [['tanggal_kejadian',         '>=', dateFrom + ' 00:00:00']]     : []),
        ...(dateTo      ? [['tanggal_kejadian',         '<=', dateTo   + ' 23:59:59']]     : []),
        ...(kategoriId  ? [['kategori_id',              '=',  kategoriId]]                 : []),
    ];
    const donutDomain = [...baseDomain];

    // Domain perbandingan tahunan — tahun terpilih vs tahun sebelumnya
    const selectedYear = tahun ? parseInt(tahun) : new Date().getFullYear();
    const prevYear     = selectedYear - 1;
    const yearlyBase   = [
        ...drillDomain,
        ...(kabupatenId ? [['kabupaten_id', '=', kabupatenId]] : []),
        ...(kategoriId  ? [['kategori_id',  '=', kategoriId]]  : []),
    ];
    const currentYrDom = [...yearlyBase, ['tahun', '=', String(selectedYear)]];
    const prevYrDom    = [...yearlyBase, ['tahun', '=', String(prevYear)]];

    try {
        const [kabGroups, katGroups, allKabupaten, modusGroups, tkpGroups,
               currentYrGroups, prevYrGroups] = await Promise.all([
            ctx.orm.call('petadigi.kasus_menonjol', 'read_group',
                [baseDomain,  ['kabupaten_id'],       ['kabupaten_id']],       { lazy: false }),
            ctx.orm.call('petadigi.kasus_menonjol', 'read_group',
                [donutDomain, ['kategori_id'],         ['kategori_id']],         { lazy: false }),
            ctx.orm.searchRead('petadigi.kabupaten', [], ['id', 'name'], { order: 'name asc' }),
            ctx.orm.call('petadigi.kasus_menonjol', 'read_group',
                [donutDomain, ['modus_operandi_id'],   ['modus_operandi_id']],   { lazy: false }),
            ctx.orm.call('petadigi.kasus_menonjol', 'read_group',
                [donutDomain, ['jenis_tkp_id'],        ['jenis_tkp_id']],        { lazy: false }),
            ctx.orm.call('petadigi.kasus_menonjol', 'read_group',
                [currentYrDom, ['tanggal_kejadian'], ['tanggal_kejadian:month']], { lazy: false }),
            ctx.orm.call('petadigi.kasus_menonjol', 'read_group',
                [prevYrDom,    ['tanggal_kejadian'], ['tanggal_kejadian:month']], { lazy: false }),
        ]);

        // Bar — semua kabupaten termasuk 0, sort desc
        const kabCountMap = {};
        kabGroups.forEach(g => {
            if (Array.isArray(g.kabupaten_id)) kabCountMap[g.kabupaten_id[0]] = g.__count || 0;
        });
        const merged = allKabupaten
            .map(k => ({ name: k.name, count: kabCountMap[k.id] || 0 }))
            .sort((a, b) => b.count - a.count);

        // Update donut title
        const kabEl   = ctx.filterKabupaten?.el;
        const wilayah = kabEl?.value ? (kabEl.options[kabEl.selectedIndex]?.text || 'Semua Wilayah') : 'Semua Wilayah';
        const titleEl = ctx.chartKamDonutTitleRef?.el;
        if (titleEl) {
            titleEl.innerHTML = `<i class="fa fa-pie-chart"></i> Kasus Menonjol Berdasarkan Kategori (${wilayah})`;
        }

        // Donut (kategori)
        const donutData = katGroups.map(g => ({
            name:  Array.isArray(g.kategori_id) ? g.kategori_id[1] : 'Lainnya',
            value: g.__count || 0,
        }));

        // Bar modus operandi — sort desc, label truncated
        const modusSorted = [...modusGroups].sort((a, b) => (b.__count || 0) - (a.__count || 0));
        const modusNames  = modusSorted.map(g => Array.isArray(g.modus_operandi_id) ? g.modus_operandi_id[1] : 'Tidak Diisi');
        const modusValues = modusSorted.map(g => g.__count || 0);

        // Pie jenis TKP — sort desc
        const tkpData = tkpGroups
            .map(g => ({
                name:  Array.isArray(g.jenis_tkp_id) ? g.jenis_tkp_id[1] : 'Tidak Diisi',
                value: g.__count || 0,
            }))
            .sort((a, b) => b.value - a.value);

        const MONTHS_ID     = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const currentYrData = _processKamMonthGroups(currentYrGroups);
        const prevYrData    = _processKamMonthGroups(prevYrGroups);

        if (ctx._modeVersion !== ver) return;
        _renderKamBarChart(ctx, merged.map(k => k.name), merged.map(k => k.count));
        _renderKamDonutChart(ctx, donutData);
        _renderKamModusChart(ctx, modusNames, modusValues);
        _renderKamTkpChart(ctx, tkpData);
        _renderKamTahunanChart(ctx, MONTHS_ID, currentYrData, prevYrData, selectedYear, prevYear);
    } catch (e) {
        console.error('KAM chart load error:', e);
    }
}

// ─── Data Table ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export async function updateKamTable(ctx, mode, page) {
    const ver    = ctx._modeVersion;
    const rowEl  = ctx.tableKamRowRef?.el;
    const bodyEl = ctx.tableKamBodyRef?.el;
    if (!rowEl) return;

    if (mode !== 'kam') { if (ctx.currentMode !== 'kam') rowEl.style.display = 'none'; return; }
    rowEl.style.display = 'flex';

    ctx._kamTablePage = (page !== undefined) ? page : 1;
    const offset = (ctx._kamTablePage - 1) * PAGE_SIZE;

    const tahun       = ctx.filterTahun?.el?.value       || '';
    const dateFrom    = ctx.activeDateFrom                || '';
    const dateTo      = ctx.activeDateTo                  || '';
    const kategoriId  = parseInt(ctx.filterKategori?.el?.value)   || null;
    const kabupatenId = parseInt(ctx.filterKabupaten?.el?.value)  || null;
    const stateValue  = ctx.filterState?.el?.value        || '';

    const drillDomain = ctx.drillKecamatanId
        ? [['kecamatan_id', '=', ctx.drillKecamatanId]]
        : ctx.drillKabupatenId ? [['kabupaten_id', '=', ctx.drillKabupatenId]] : [];

    const domain = [
        ...drillDomain,
        ...(kabupatenId ? [['kabupaten_id',            '=',  kabupatenId]]            : []),
        ...(stateValue  ? [['state',                   '=',  stateValue]]             : []),
        ...(tahun       ? [['tahun', '=',  tahun]]                  : []),
        ...(dateFrom    ? [['tanggal_kejadian',        '>=', dateFrom + ' 00:00:00']] : []),
        ...(dateTo      ? [['tanggal_kejadian',        '<=', dateTo   + ' 23:59:59']] : []),
        ...(kategoriId  ? [['kategori_id',             '=',  kategoriId]]             : []),
    ];

    bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#bbb;font-size:13px;">Memuat data...</div>`;

    try {
        const [records, total] = await Promise.all([
            ctx.orm.searchRead('petadigi.kasus_menonjol', domain,
                ['id', 'no_lp', 'tanggal_kejadian', 'kabupaten_id', 'kecamatan_id',
                 'kategori_id', 'modus_operandi_id', 'state', 'has_tindak_lanjut'],
                { order: 'tanggal_kejadian desc', limit: PAGE_SIZE, offset }),
            ctx.orm.searchCount('petadigi.kasus_menonjol', domain),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const curPage    = ctx._kamTablePage;
        const fromRow    = total > 0 ? offset + 1 : 0;
        const toRow      = Math.min(offset + PAGE_SIZE, total);

        const rows = records.map((r, i) => {
            const kab   = Array.isArray(r.kabupaten_id)      ? r.kabupaten_id[1]      : '-';
            const kec   = Array.isArray(r.kecamatan_id)      ? r.kecamatan_id[1]      : '-';
            const kat   = Array.isArray(r.kategori_id)       ? r.kategori_id[1]       : '-';
            const modus = Array.isArray(r.modus_operandi_id) ? r.modus_operandi_id[1] : '-';
            const cls   = r.state === 'SELESAI' ? '--green' : (r.has_tindak_lanjut ? '--blue' : '--red');
            return `
                <tr class="petadigi-table-row" data-id="${r.id}" style="cursor:pointer;">
                    <td class="petadigi-td">${offset + i + 1}</td>
                    <td class="petadigi-td petadigi-td--mono">${r.no_lp || '-'}</td>
                    <td class="petadigi-td" style="white-space:nowrap;">${fmtTanggal(r.tanggal_kejadian)}</td>
                    <td class="petadigi-td">${kab}</td>
                    <td class="petadigi-td">${kec}</td>
                    <td class="petadigi-td">${kat}</td>
                    <td class="petadigi-td">${modus}</td>
                    <td class="petadigi-td"><span class="petadigi-badge petadigi-badge${cls}">${r.state || '-'}</span></td>
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
                    <button class="petadigi-page-btn" data-action="prev" ${curPage <= 1 ? 'disabled' : ''}><i class="fa fa-chevron-left"></i></button>
                    <span class="petadigi-page-info">Hal. ${curPage} / ${totalPages}</span>
                    <button class="petadigi-page-btn" data-action="next" ${curPage >= totalPages ? 'disabled' : ''}><i class="fa fa-chevron-right"></i></button>
                </div>
            </div>
            <div class="petadigi-table-wrapper">
                <table class="petadigi-table">
                    <thead><tr>
                        <th class="petadigi-th">#</th>
                        <th class="petadigi-th">No. LP</th>
                        <th class="petadigi-th">Tgl Kejadian</th>
                        <th class="petadigi-th">Kabupaten</th>
                        <th class="petadigi-th">Kecamatan</th>
                        <th class="petadigi-th">Kategori</th>
                        <th class="petadigi-th">Modus Operandi</th>
                        <th class="petadigi-th">Status</th>
                    </tr></thead>
                    <tbody>
                        ${rows || `<tr><td colspan="8" style="text-align:center;padding:24px;color:#bbb;font-size:13px;">Tidak ada data</td></tr>`}
                    </tbody>
                </table>
            </div>`;

        bodyEl.querySelectorAll('.petadigi-table-row').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = parseInt(tr.dataset.id);
                if (!id) return;
                ctx.action.doAction({ type: 'ir.actions.act_window', res_model: 'petadigi.kasus_menonjol',
                    res_id: id, views: [[false, 'form']], target: 'current' });
            });
        });
        bodyEl.querySelector('[data-action="prev"]')?.addEventListener('click', () => updateKamTable(ctx, mode, curPage - 1));
        bodyEl.querySelector('[data-action="next"]')?.addEventListener('click', () => updateKamTable(ctx, mode, curPage + 1));

    } catch (e) {
        console.error('KAM table load error:', e);
        bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#e74c3c;font-size:13px;">Gagal memuat data</div>`;
    }
}
