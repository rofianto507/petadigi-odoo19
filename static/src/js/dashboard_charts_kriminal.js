/** @odoo-module **/

import { fmtTanggal, wibDateStartUtc, wibDateEndUtc } from "./dashboard_helpers";

// ─── Internal render functions ────────────────────────────────────────────────

function _renderBarChart(ctx, names, values) {
    const el = ctx.chartBarRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsBar) ctx._echartsBar.dispose();
    ctx._echartsBar = echarts.init(el);
    ctx._echartsBar.setOption({
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

function _renderDonutChart(ctx, data) {
    const el = ctx.chartDonutRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsDonut) ctx._echartsDonut.dispose();
    ctx._echartsDonut = echarts.init(el);
    const COLORS = ['#875A7B', '#9B59B6', '#6C3483', '#A569BD', '#C39BD3', '#7D3C98', '#D2B4DE', '#BDC3C7'];
    ctx._echartsDonut.setOption({
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

function _renderTkpChart(ctx, data) {
    const el = ctx.chartTkpRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsTkp) ctx._echartsTkp.dispose();
    ctx._echartsTkp = echarts.init(el);
    const COLORS = ['#875A7B', '#9B59B6', '#6C3483', '#A509BD', '#C39BD3',
                    '#7D3C98', '#D2B4DE', '#BDC3C7', '#E8DAEF', '#D7BDE2'];

    ctx._echartsTkp.setOption({
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
            // startAngle 180 → 0: setengah lingkaran bagian atas (half doughnut)
            radius: ['38%', '70%'],
            center: ['38%', '62%'],
            startAngle: 180,
            endAngle: 0,
            data,
            label: {
                show: true,
                formatter: '{b}\n{c}',
                fontSize: 10,
                color: '#555',
            },
            labelLine: { length: 6, length2: 8 },
            itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 3 },
            emphasis: { itemStyle: { shadowBlur: 8, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' } },
        }],
    });
}

function _renderSubKatChart(ctx, names, values) {
    const el = ctx.chartSubKatRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsSubKat) ctx._echartsSubKat.dispose();
    ctx._echartsSubKat = echarts.init(el);
    ctx._echartsSubKat.setOption({
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
                    { offset: 0, color: '#48C9B0' },
                    { offset: 1, color: '#117A65' },
                ]),
                borderRadius: [4, 4, 0, 0],
            },
            emphasis: { itemStyle: { color: '#0E6655' } },
        }],
    });
}

function _renderTrendChart(ctx, months, selesaiData, prosesData) {
    const el = ctx.chartTrendRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsTrend) ctx._echartsTrend.dispose();
    ctx._echartsTrend = echarts.init(el);
    ctx._echartsTrend.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: params => {
                const month   = params[0]?.name || '';
                const selesai = params.find(p => p.seriesName === 'Selesai')?.value || 0;
                const proses  = params.find(p => p.seriesName === 'Proses')?.value  || 0;
                const total   = selesai + proses;
                return `<b>${month}</b><br/>Total: <b>${total.toLocaleString('id-ID')}</b><br/>`
                     + `<span style="color:#F39C12">&#9632;</span> Proses: ${proses.toLocaleString('id-ID')} (${total ? Math.round(proses / total * 100) : 0}%)<br/>`
                     + `<span style="color:#27AE60">&#9632;</span> Selesai: ${selesai.toLocaleString('id-ID')} (${total ? Math.round(selesai / total * 100) : 0}%)`;
            },
        },
        legend: {
            top: 6,
            textStyle: { fontSize: 11, color: '#555' },
            icon: 'roundRect',
            itemWidth: 12,
            itemHeight: 8,
        },
        grid: { left: 10, right: 16, top: 36, bottom: 24, containLabel: true },
        xAxis: {
            type: 'category',
            data: months,
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
                name: 'Selesai',
                type: 'bar',
                stack: 'total',
                data: selesaiData,
                itemStyle: { color: '#27AE60' },
                barMaxWidth: 40,
            },
            {
                name: 'Proses',
                type: 'bar',
                stack: 'total',
                data: prosesData,
                itemStyle: { color: '#F39C12', borderRadius: [4, 4, 0, 0] },
                barMaxWidth: 40,
                label: {
                    show: true,
                    position: 'top',
                    fontSize: 10,
                    color: '#71639e',
                    fontWeight: '600',
                    formatter: params => {
                        const total = (prosesData[params.dataIndex] || 0) + (selesaiData[params.dataIndex] || 0);
                        return total > 0 ? total.toLocaleString('id-ID') : '';
                    },
                },
            },
        ],
    });
}

function _renderWaktuChart(ctx, labels, values) {
    const el = ctx.chartWaktuRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsWaktu) ctx._echartsWaktu.dispose();
    ctx._echartsWaktu = echarts.init(el);

    ctx._echartsWaktu.setOption({
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
        grid: { left: 12, right: 12, top: 24, bottom: 36, containLabel: true },
        xAxis: {
            type: 'category',
            data: labels,
            axisLabel: { fontSize: 9, color: '#666', rotate: 30 },
            axisLine:  { lineStyle: { color: '#e5e7eb' } },
            axisTick:  { show: false },
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            axisLabel: { fontSize: 10, color: '#999' },
            splitLine: { lineStyle: { color: '#f0f0f0' } },
        },
        series: [{
            type: 'line',
            smooth: false,
            data: values,
            lineStyle: { color: '#3B6BDB', width: 2 },
            itemStyle: { color: '#3B6BDB' },
            areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,107,219,0.18)' }, { offset: 1, color: 'rgba(59,107,219,0)' }] } },
            symbol: 'circle',
            symbolSize: 6,
            label: {
                show: true,
                position: 'top',
                fontSize: 10,
                color: '#3B6BDB',
                fontWeight: '600',
                formatter: p => p.value > 0 ? p.value.toLocaleString('id-ID') : '',
            },
        }],
    });
}

// Helper: proses month groups → array[12]
function _processMonthGroups(groups) {
    const data = new Array(12).fill(0);
    groups.forEach(g => {
        const rangeFrom = g.__range?.['tanggal_kejadian:month']?.from
                       || g.__range?.['tanggal_kejadian']?.from;
        if (!rangeFrom) return;
        const dateObj = new Date(rangeFrom.length > 10 ? rangeFrom.replace(' ', 'T') + 'Z' : rangeFrom);
        const month   = new Date(dateObj.getTime() + 7 * 3600 * 1000).getUTCMonth();
        if (month >= 0 && month < 12) data[month] += g.__count || 0;
    });
    return data;
}

// Render: perbandingan dua tahun (area line current + dashed line prev)
function _renderTahunanChart(ctx, months, currentData, prevData, selectedYear, prevYear) {
    const el = ctx.chartTahunanRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsTahunan) ctx._echartsTahunan.dispose();
    ctx._echartsTahunan = echarts.init(el);

    const totalCurrent = currentData.reduce((s, v) => s + v, 0);
    const totalPrev    = prevData.reduce((s, v) => s + v, 0);
    const trendPct     = totalPrev > 0 ? ((totalCurrent - totalPrev) / totalPrev * 100) : null;
    const trendIcon    = trendPct === null ? '' : (trendPct >= 0 ? '▲' : '▼');
    const trendText    = trendPct === null
        ? `Total ${selectedYear}: ${totalCurrent.toLocaleString('id-ID')}  |  Total ${prevYear}: ${totalPrev.toLocaleString('id-ID')}`
        : `Tren ${trendIcon} ${Math.abs(trendPct).toFixed(1)}%  |  Total ${selectedYear}: ${totalCurrent.toLocaleString('id-ID')}  |  Total ${prevYear}: ${totalPrev.toLocaleString('id-ID')}`;

    ctx._echartsTahunan.setOption({
        graphic: [{
            type: 'text',
            left: 'center',
            top: 10,
            style: {
                text: trendText,
                fill: '#E74C3C',
                fontSize: 12,
                fontWeight: 'bold',
            },
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
                     + `<span style="color:#5DADE2">&#9632;</span> ${selectedYear}: <b>${cur.toLocaleString('id-ID')}</b><br/>`
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
                    show: true,
                    position: 'top',
                    fontSize: 10,
                    color: '#E67E22',
                    fontWeight: '600',
                    formatter: params => params.value > 0 ? params.value.toLocaleString('id-ID') : '',
                },
            },
            {
                name: `Total ${selectedYear}`,
                type: 'line',
                data: currentData,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { color: '#5DADE2', width: 2.5 },
                itemStyle: { color: '#2471A3' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(93,173,226,0.35)' },
                        { offset: 1, color: 'rgba(93,173,226,0.02)' },
                    ]),
                },
                label: {
                    show: true,
                    position: 'top',
                    fontSize: 10,
                    color: '#2471A3',
                    fontWeight: '600',
                    formatter: params => params.value > 0 ? params.value.toLocaleString('id-ID') : '',
                },
            },
        ],
    });
}

// Helper: proses hour groups → array[8] waktu slot
function _processWaktuHourGroups(groups) {
    const data = new Array(8).fill(0);
    groups.forEach(g => {
        const rangeFrom = g.__range?.['tanggal_kejadian:hour']?.from
                       || g.__range?.['tanggal_kejadian']?.from;
        if (!rangeFrom) return;
        const dateObj = new Date(rangeFrom.length > 10 ? rangeFrom.replace(' ', 'T') + 'Z' : rangeFrom);
        const slot    = Math.floor(((dateObj.getUTCHours() + 7) % 24) / 3);
        if (slot >= 0 && slot < 8) data[slot] += g.__count || 0;
    });
    return data;
}

// Helper: render area line chart waktu kejadian (dipakai berulang untuk sub_kategori)
function _renderWaktuSubKatChart(ctx, elRef, chartKey, lineColor, areaColorStart, labels, data) {
    const el = ctx[elRef]?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx[chartKey]) ctx[chartKey].dispose();
    ctx[chartKey] = echarts.init(el);
    ctx[chartKey].setOption({
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
        grid: { left: 10, right: 16, top: 20, bottom: 55, containLabel: true },
        xAxis: {
            type: 'category',
            data: labels,
            boundaryGap: false,
            axisLabel: { rotate: 35, fontSize: 9, color: '#666', interval: 0 },
            axisLine: { lineStyle: { color: '#d0d7de' } },
            axisTick: { show: false },
        },
        yAxis: {
            type: 'value',
            axisLabel: { fontSize: 10, color: '#888' },
            splitLine: { lineStyle: { color: '#f3f0f5', type: 'dashed' } },
        },
        series: [{
            type: 'line',
            data,
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { color: lineColor, width: 2 },
            itemStyle: { color: lineColor },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: areaColorStart },
                    { offset: 1, color: 'rgba(255,255,255,0.02)' },
                ]),
            },
            label: {
                show: true,
                position: 'top',
                fontSize: 10,
                color: lineColor,
                fontWeight: '600',
                formatter: params => params.value > 0 ? params.value.toLocaleString('id-ID') : '',
            },
        }],
    });
}

// ─── Exported functions ───────────────────────────────────────────────────────

export function disposeKriminalCharts(ctx) {
    if (ctx._echartsBar)      { ctx._echartsBar.dispose();      ctx._echartsBar = null; }
    if (ctx._echartsDonut)    { ctx._echartsDonut.dispose();    ctx._echartsDonut = null; }
    if (ctx._echartsTkp)      { ctx._echartsTkp.dispose();      ctx._echartsTkp = null; }
    if (ctx._echartsSubKat)   { ctx._echartsSubKat.dispose();   ctx._echartsSubKat = null; }
    if (ctx._echartsTrend)    { ctx._echartsTrend.dispose();    ctx._echartsTrend = null; }
    if (ctx._echartsWaktu)    { ctx._echartsWaktu.dispose();    ctx._echartsWaktu = null; }
    if (ctx._echartsCurat)    { ctx._echartsCurat.dispose();    ctx._echartsCurat = null; }
    if (ctx._echartsCuras)    { ctx._echartsCuras.dispose();    ctx._echartsCuras = null; }
    if (ctx._echartsCuranmor) { ctx._echartsCuranmor.dispose(); ctx._echartsCuranmor = null; }
    if (ctx._echartsTahunan)  { ctx._echartsTahunan.dispose();  ctx._echartsTahunan = null; }
}

export async function updateKriminalCharts(ctx, mode) {
    const ver  = ctx._modeVersion;
    const row  = ctx.chartRowRef?.el;
    const row2 = ctx.chartRow2Ref?.el;
    const row3 = ctx.chartRow3Ref?.el;
    const row4 = ctx.chartRow4Ref?.el;
    const row5 = ctx.chartRow5Ref?.el;
    if (!row) return;

    if (mode !== 'kriminal') {
        if (ctx.currentMode !== 'kriminal') {
            row.style.display = 'none';
            if (row2) row2.style.display = 'none';
            if (row3) row3.style.display = 'none';
            if (row4) row4.style.display = 'none';
            if (row5) row5.style.display = 'none';
            disposeKriminalCharts(ctx);
        }
        return;
    }
    row.style.display  = 'flex';
    if (row2) row2.style.display = 'flex';
    if (row3) row3.style.display = 'flex';
    if (row4) row4.style.display = 'none';  // hidden sementara
    if (row5) row5.style.display = 'flex';

    const tahun         = ctx.filterTahun?.el?.value         || '';
    const dateFrom      = ctx.activeDateFrom                  || '';
    const dateTo        = ctx.activeDateTo                    || '';
    const jenisLp       = ctx.filterJenisLP?.el?.value        || '';
    const kategoriId    = parseInt(ctx.filterKategori?.el?.value)     || null;
    const subKategoriId = parseInt(ctx.filterSubKategori?.el?.value)  || null;
    const polresId      = ctx._polresFilterId;
    const stateValue    = ctx.filterState?.el?.value          || '';

    const drillDomain = ctx.drillKecamatanId
        ? [['kecamatan_id', '=', ctx.drillKecamatanId]]
        : ctx.drillKabupatenId
            ? [['kabupaten_id', '=', ctx.drillKabupatenId]]
            : [];

    const baseDomain = [
        ...drillDomain,
        ...(polresId      ? [['kabupaten_id.polres_id',  '=',  polresId]]                       : []),
        ...(stateValue    ? [['status_perkara',          '=',  stateValue]]                     : []),
        ...(tahun         ? [['tahun', '=',  tahun]]                          : []),
        ...(dateFrom      ? [['tanggal_kejadian',        '>=', wibDateStartUtc(dateFrom)]]         : []),
        ...(dateTo        ? [['tanggal_kejadian',        '<=', wibDateEndUtc(dateTo)]]         : []),
        ...(jenisLp       ? [['jenis_lp',                '=',  jenisLp]]                        : []),
        ...(kategoriId    ? [['kategori_id',             '=',  kategoriId]]                     : []),
        ...(subKategoriId ? [['sub_kategori_id',         '=',  subKategoriId]]                  : []),
    ];
    const donutDomain = [...baseDomain];

    // Domain untuk perbandingan tahunan — pakai kategori/subkat/polres tapi tahun dikelola sendiri
    const selectedYear  = tahun ? parseInt(tahun) : new Date().getFullYear();
    const prevYear      = selectedYear - 1;
    const yearlyBase    = [
        ...drillDomain,
        ...(kategoriId    ? [['kategori_id',             '=', kategoriId]]                     : []),
        ...(subKategoriId ? [['sub_kategori_id',         '=', subKategoriId]]                  : []),
        ...(polresId      ? [['kabupaten_id.polres_id',  '=', polresId]]                       : []),
    ];
    const currentYrDom  = [...yearlyBase, ['tahun', '=', String(selectedYear)]];
    const prevYrDom     = [...yearlyBase, ['tahun', '=', String(prevYear)]];

    try {
        const [kabGroups, katGroups, allKabupaten, tkpGroups, subKatGroups, trendGroups,
               waktuGroups, curatGroups, curasGroups, curanmorGroups,
               currentYrGroups, prevYrGroups] = await Promise.all([
            ctx.orm.call('petadigi.kriminalitas', 'read_group',
                [baseDomain,  ['kabupaten_id'],  ['kabupaten_id']],  { lazy: false }),
            ctx.orm.call('petadigi.kriminalitas', 'read_group',
                [donutDomain, ['kategori_id'],   ['kategori_id']],   { lazy: false }),
            ctx.orm.searchRead('petadigi.kabupaten', [], ['id', 'name'], { order: 'name asc' }),
            ctx.orm.call('petadigi.kriminalitas', 'read_group',
                [donutDomain, ['jenis_tkp_id'],  ['jenis_tkp_id']],  { lazy: false }),
            ctx.orm.call('petadigi.kriminalitas', 'read_group',
                [donutDomain, ['sub_kategori_id'], ['sub_kategori_id']], { lazy: false }),
            ctx.orm.call('petadigi.kriminalitas', 'read_group',
                [donutDomain, ['status_perkara'], ['tanggal_kejadian:month', 'status_perkara']], { lazy: false }),
            ctx.orm.call('petadigi.kriminalitas', 'read_group',
                [donutDomain, ['id'], ['tanggal_kejadian:hour']], { lazy: false }),
            ctx.orm.call('petadigi.kriminalitas', 'read_group',
                [[...donutDomain, ['sub_kategori_id.name', '=', 'Curat']],    ['id'], ['tanggal_kejadian:hour']], { lazy: false }),
            ctx.orm.call('petadigi.kriminalitas', 'read_group',
                [[...donutDomain, ['sub_kategori_id.name', '=', 'Curas']],    ['id'], ['tanggal_kejadian:hour']], { lazy: false }),
            ctx.orm.call('petadigi.kriminalitas', 'read_group',
                [[...donutDomain, ['sub_kategori_id.name', '=', 'Curanmor']], ['id'], ['tanggal_kejadian:hour']], { lazy: false }),
            ctx.orm.call('petadigi.kriminalitas', 'read_group',
                [currentYrDom, ['tanggal_kejadian'], ['tanggal_kejadian:month']], { lazy: false }),
            ctx.orm.call('petadigi.kriminalitas', 'read_group',
                [prevYrDom,    ['tanggal_kejadian'], ['tanggal_kejadian:month']], { lazy: false }),
        ]);

        // Bar chart — semua kabupaten, termasuk yg 0, sort by count desc
        const kabCountMap = {};
        kabGroups.forEach(g => {
            if (Array.isArray(g.kabupaten_id)) kabCountMap[g.kabupaten_id[0]] = g.__count || 0;
        });
        const merged    = allKabupaten
            .map(k => ({ name: k.name, count: kabCountMap[k.id] || 0 }))
            .sort((a, b) => b.count - a.count);
        const barNames  = merged.map(k => k.name);
        const barValues = merged.map(k => k.count);

        if (ctx._modeVersion !== ver) return;
        // Donut chart (kategori)
        const donutData = katGroups.map(g => ({
            name:  Array.isArray(g.kategori_id) ? g.kategori_id[1] : 'Lainnya',
            value: g.__count || 0,
        }));

        // Update donut title dengan nama polres terpilih
        const polresEl = ctx.filterPolres?.el;
        const wilayah  = polresEl?.value ? (polresEl.options[polresEl.selectedIndex]?.text || 'Semua Wilayah') : 'Semua Wilayah';
        const titleEl = ctx.chartDonutTitleRef?.el;
        if (titleEl) {
            titleEl.innerHTML = `<i class="fa fa-pie-chart"></i> Grafik Kriminalitas Berdasarkan Kategori (${wilayah})`;
        }

        // Pie chart (jenis TKP / lokasi kejahatan)
        const tkpData = tkpGroups
            .map(g => ({
                name:  Array.isArray(g.jenis_tkp_id) ? g.jenis_tkp_id[1] : 'Tidak Diisi',
                value: g.__count || 0,
            }))
            .sort((a, b) => b.value - a.value);

        // Bar chart (sub kategori)
        const subKatSorted = [...subKatGroups].sort((a, b) => (b.__count || 0) - (a.__count || 0)).slice(0, 10);
        const subKatNames  = subKatSorted.map(g => Array.isArray(g.sub_kategori_id) ? g.sub_kategori_id[1] : 'Lainnya');
        const subKatValues = subKatSorted.map(g => g.__count || 0);

        // Trend bulanan — stacked bar per status_perkara
        const MONTHS_ID   = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const prosesData  = new Array(12).fill(0);
        const selesaiData = new Array(12).fill(0);
        trendGroups.forEach(g => {
            const rangeFrom = g.__range?.['tanggal_kejadian:month']?.from
                           || g.__range?.['tanggal_kejadian']?.from;
            if (!rangeFrom) return;
            const dateObj = new Date(rangeFrom.length > 10 ? rangeFrom.replace(' ', 'T') + 'Z' : rangeFrom);
            const month   = new Date(dateObj.getTime() + 7 * 3600 * 1000).getUTCMonth();
            if (month < 0 || month > 11) return;
            if (g.status_perkara === 'PROSES')   prosesData[month]  = g.__count || 0;
            else if (g.status_perkara === 'SELESAI') selesaiData[month] = g.__count || 0;
        });

        // Statistik waktu kejadian — area line per slot 3 jam
        const TIME_LABELS   = ['00:00-02:59', '03:00-05:59', '06:00-08:59', '09:00-11:59',
                                '12:00-14:59', '15:00-17:59', '18:00-20:59', '21:00-23:59'];
        const waktuData     = _processWaktuHourGroups(waktuGroups);
        const curatData     = _processWaktuHourGroups(curatGroups);
        const curasData     = _processWaktuHourGroups(curasGroups);
        const curanmorData  = _processWaktuHourGroups(curanmorGroups);

        _renderBarChart(ctx, barNames, barValues);
        _renderDonutChart(ctx, donutData);
        _renderTkpChart(ctx, tkpData);
        _renderSubKatChart(ctx, subKatNames, subKatValues);
        _renderTrendChart(ctx, MONTHS_ID, selesaiData, prosesData);
        _renderWaktuChart(ctx, TIME_LABELS, waktuData);
        _renderWaktuSubKatChart(ctx, 'chartCuratRef',    '_echartsCurat',    '#E74C3C', 'rgba(231,76,60,0.28)',    TIME_LABELS, curatData);
        _renderWaktuSubKatChart(ctx, 'chartCurasRef',    '_echartsCuras',    '#BB8FCE', 'rgba(187,143,206,0.3)',   TIME_LABELS, curasData);
        _renderWaktuSubKatChart(ctx, 'chartCuranmorRef', '_echartsCuranmor', '#8E44AD', 'rgba(142,68,173,0.3)',    TIME_LABELS, curanmorData);

        // Data tahunan — perbandingan tahun terpilih vs tahun sebelumnya
        const currentYrData = _processMonthGroups(currentYrGroups);
        const prevYrData    = _processMonthGroups(prevYrGroups);
        _renderTahunanChart(ctx, MONTHS_ID, currentYrData, prevYrData, selectedYear, prevYear);
    } catch (e) {
        console.error('Chart load error:', e);
    }
}

// ─── Data Table ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export async function updateKriminalTable(ctx, mode, page) {
    const ver    = ctx._modeVersion;
    const rowEl  = ctx.tableKriminalRowRef?.el;
    const bodyEl = ctx.tableKriminalBodyRef?.el;
    if (!rowEl) return;

    if (mode !== 'kriminal') {
        if (ctx.currentMode !== 'kriminal') rowEl.style.display = 'none';
        return;
    }
    rowEl.style.display = 'flex';

    // Reset ke halaman 1 jika dipanggil tanpa argumen page (filter berubah)
    ctx._kriminalTablePage = (page !== undefined) ? page : 1;
    const offset = (ctx._kriminalTablePage - 1) * PAGE_SIZE;

    // Bangun domain — sama persis dengan chart kriminal
    const tahun         = ctx.filterTahun?.el?.value         || '';
    const dateFrom      = ctx.activeDateFrom                  || '';
    const dateTo        = ctx.activeDateTo                    || '';
    const jenisLp       = ctx.filterJenisLP?.el?.value        || '';
    const kategoriId    = parseInt(ctx.filterKategori?.el?.value)    || null;
    const subKategoriId = parseInt(ctx.filterSubKategori?.el?.value) || null;
    const polresId      = ctx._polresFilterId;
    const stateValue    = ctx.filterState?.el?.value          || '';

    const drillDomain = ctx.drillKecamatanId
        ? [['kecamatan_id', '=', ctx.drillKecamatanId]]
        : ctx.drillKabupatenId
            ? [['kabupaten_id', '=', ctx.drillKabupatenId]]
            : [];

    const domain = [
        ...drillDomain,
        ...(polresId      ? [['kabupaten_id.polres_id',  '=',  polresId]]                       : []),
        ...(stateValue    ? [['status_perkara',          '=',  stateValue]]                     : []),
        ...(tahun         ? [['tahun', '=',  tahun]]                          : []),
        ...(dateFrom      ? [['tanggal_kejadian',        '>=', wibDateStartUtc(dateFrom)]]         : []),
        ...(dateTo        ? [['tanggal_kejadian',        '<=', wibDateEndUtc(dateTo)]]         : []),
        ...(jenisLp       ? [['jenis_lp',                '=',  jenisLp]]                        : []),
        ...(kategoriId    ? [['kategori_id',             '=',  kategoriId]]                     : []),
        ...(subKategoriId ? [['sub_kategori_id',         '=',  subKategoriId]]                  : []),
    ];

    bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#bbb;font-size:13px;">Memuat data...</div>`;

    try {
        const [records, total] = await Promise.all([
            ctx.orm.searchRead(
                'petadigi.kriminalitas',
                domain,
                ['id', 'no_lp', 'jenis_lp', 'tanggal_kejadian', 'tempat_kejadian',
                 'kabupaten_id', 'kecamatan_id', 'kategori_id', 'sub_kategori_id', 'status_perkara'],
                { order: 'tanggal_kejadian desc', limit: PAGE_SIZE, offset }
            ),
            ctx.orm.searchCount('petadigi.kriminalitas', domain),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const curPage    = ctx._kriminalTablePage;
        const fromRow    = total > 0 ? offset + 1 : 0;
        const toRow      = Math.min(offset + PAGE_SIZE, total);

        const rows = records.map((r, i) => {
            const kab  = Array.isArray(r.kabupaten_id)    ? r.kabupaten_id[1]    : '-';
            const kec  = Array.isArray(r.kecamatan_id)    ? r.kecamatan_id[1]    : '-';
            const kat  = Array.isArray(r.kategori_id)     ? r.kategori_id[1]     : '-';
            const subk = Array.isArray(r.sub_kategori_id) ? r.sub_kategori_id[1] : '-';
            const tkp  = r.tempat_kejadian
                ? (r.tempat_kejadian.length > 55 ? r.tempat_kejadian.slice(0, 55) + '…' : r.tempat_kejadian)
                : '-';
            const statusClass = r.status_perkara === 'SELESAI'
                ? 'petadigi-badge petadigi-badge--green'
                : 'petadigi-badge petadigi-badge--red';

            return `
                <tr class="petadigi-table-row" data-id="${r.id}" style="cursor:pointer;">
                    <td class="petadigi-td">${offset + i + 1}</td>
                    <td class="petadigi-td petadigi-td--mono">${r.no_lp || '-'}</td>
                    <td class="petadigi-td">${r.jenis_lp || '-'}</td>
                    <td class="petadigi-td" style="white-space:nowrap;">${fmtTanggal(r.tanggal_kejadian)}</td>
                    <td class="petadigi-td petadigi-td--wrap" title="${(r.tempat_kejadian || '').replace(/"/g, '&quot;')}">${tkp}</td>
                    <td class="petadigi-td">${kab}</td>
                    <td class="petadigi-td">${kec}</td>
                    <td class="petadigi-td">${kat}</td>
                    <td class="petadigi-td">${subk}</td>
                    <td class="petadigi-td"><span class="${statusClass}">${r.status_perkara || '-'}</span></td>
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
                            <th class="petadigi-th">No. LP</th>
                            <th class="petadigi-th">Jenis</th>
                            <th class="petadigi-th">Tgl Kejadian</th>
                            <th class="petadigi-th">Tempat Kejadian</th>
                            <th class="petadigi-th">Kabupaten</th>
                            <th class="petadigi-th">Kecamatan</th>
                            <th class="petadigi-th">Kategori</th>
                            <th class="petadigi-th">Sub Kategori</th>
                            <th class="petadigi-th">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || `<tr><td colspan="10" style="text-align:center;padding:24px;color:#bbb;font-size:13px;">Tidak ada data</td></tr>`}
                    </tbody>
                </table>
            </div>`;

        // Click row → buka form view
        bodyEl.querySelectorAll('.petadigi-table-row').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = parseInt(tr.dataset.id);
                if (!id) return;
                ctx.action.doAction({
                    type: 'ir.actions.act_window',
                    res_model: 'petadigi.kriminalitas',
                    res_id: id,
                    views: [[false, 'form']],
                    target: 'current',
                });
            });
        });

        // Paginasi
        bodyEl.querySelector('[data-action="prev"]')
            ?.addEventListener('click', () => updateKriminalTable(ctx, mode, curPage - 1));
        bodyEl.querySelector('[data-action="next"]')
            ?.addEventListener('click', () => updateKriminalTable(ctx, mode, curPage + 1));

    } catch (e) {
        console.error('Table load error:', e);
        bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#e74c3c;font-size:13px;">Gagal memuat data</div>`;
    }
}
