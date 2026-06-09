/** @odoo-module **/

// lokasi_penting tidak punya tanggal_kejadian / sumber_dokumen_id,
// jadi domain hanya pakai kabupaten_id, kategori_id, state.

// ─── Bar chart: total per kabupaten ──────────────────────────────────────────
function _renderLokasiBarChart(ctx, names, values) {
    const el = ctx.chartLokasiBarRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsLokasiBar) ctx._echartsLokasiBar.dispose();
    ctx._echartsLokasiBar = echarts.init(el);
    ctx._echartsLokasiBar.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: params => {
                const p = params[0];
                return `${p.name}<br/><b>Total Lokasi: ${p.value.toLocaleString('id-ID')}</b>`;
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
                    { offset: 0, color: '#A569BD' },
                    { offset: 1, color: '#4A235A' },
                ]),
                borderRadius: [4, 4, 0, 0],
            },
            emphasis: { itemStyle: { color: '#3B1A4A' } },
        }],
    });
}

// ─── Donut chart: per kategori ────────────────────────────────────────────────
function _renderLokasiDonutChart(ctx, data) {
    const el = ctx.chartLokasiDonutRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsLokasiDonut) ctx._echartsLokasiDonut.dispose();
    ctx._echartsLokasiDonut = echarts.init(el);
    const COLORS = ['#7D3C98', '#A569BD', '#D2B4DE', '#2ECC71', '#3498DB',
                    '#E74C3C', '#F39C12', '#1ABC9C', '#E91E63', '#795548'];
    ctx._echartsLokasiDonut.setOption({
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

// ─── Exported ─────────────────────────────────────────────────────────────────

export function disposeLokasiCharts(ctx) {
    if (ctx._echartsLokasiBar)   { ctx._echartsLokasiBar.dispose();   ctx._echartsLokasiBar   = null; }
    if (ctx._echartsLokasiDonut) { ctx._echartsLokasiDonut.dispose(); ctx._echartsLokasiDonut = null; }
}

export async function updateLokasiCharts(ctx, mode) {
    const row = ctx.chartLokasiRowRef?.el;
    if (!row) return;

    if (mode !== 'lokasi') {
        row.style.display = 'none';
        disposeLokasiCharts(ctx);
        return;
    }
    row.style.display = 'flex';

    const kategoriId  = parseInt(ctx.filterKategori?.el?.value)  || null;
    const kabupatenId = parseInt(ctx.filterKabupaten?.el?.value) || null;
    const stateValue  = ctx.filterState?.el?.value               || '';

    const drillDomain = ctx.drillKecamatanId
        ? [['kecamatan_id', '=', ctx.drillKecamatanId]]
        : ctx.drillKabupatenId
            ? [['kabupaten_id', '=', ctx.drillKabupatenId]]
            : [];

    const baseDomain = [
        ...drillDomain,
        ...(kabupatenId ? [['kabupaten_id', '=', kabupatenId]] : []),
        ...(stateValue  ? [['state',        '=', stateValue]]  : []),
        ...(kategoriId  ? [['kategori_id',  '=', kategoriId]]  : []),
    ];

    try {
        const [kabGroups, katGroups, allKabupaten] = await Promise.all([
            ctx.orm.call('petadigi.lokasi_penting', 'read_group',
                [baseDomain, ['kabupaten_id'], ['kabupaten_id']], { lazy: false }),
            ctx.orm.call('petadigi.lokasi_penting', 'read_group',
                [baseDomain, ['kategori_id'],  ['kategori_id']],  { lazy: false }),
            ctx.orm.searchRead('petadigi.kabupaten', [], ['id', 'name'], { order: 'name asc' }),
        ]);

        // Bar — semua kabupaten termasuk yang 0, sort desc
        const kabCountMap = {};
        kabGroups.forEach(g => {
            if (!g.kabupaten_id) return;
            kabCountMap[g.kabupaten_id[0]] = g.__count || 0;
        });
        const kabList = allKabupaten.map(k => ({ name: k.name, val: kabCountMap[k.id] || 0 }));
        kabList.sort((a, b) => b.val - a.val);
        _renderLokasiBarChart(ctx, kabList.map(k => k.name), kabList.map(k => k.val));

        // Donut — per kategori
        const donutData = katGroups
            .filter(g => g.kategori_id)
            .map(g => ({ name: g.kategori_id[1], value: g.__count || 0 }))
            .sort((a, b) => b.value - a.value);

        const titleEl = ctx.chartLokasiDonutTitleRef?.el;
        if (titleEl) {
            const loc = ctx.drillKecamatanId
                ? 'Wilayah Kecamatan Terpilih'
                : ctx.drillKabupatenId || kabupatenId
                    ? 'Kabupaten Terpilih'
                    : 'Semua Wilayah';
            titleEl.innerHTML = `<i class="fa fa-pie-chart"></i> Lokasi Penting Berdasarkan Kategori (${loc})`;
        }
        _renderLokasiDonutChart(ctx, donutData);

    } catch (e) {
        console.error('Gagal memuat grafik lokasi penting:', e);
    }
}
