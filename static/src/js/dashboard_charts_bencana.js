/** @odoo-module **/

// ─── Bar chart: total per kabupaten ──────────────────────────────────────────
function _renderBencanaBarChart(ctx, names, values) {
    const el = ctx.chartBencanaBarRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsBencanaBar) ctx._echartsBencanaBar.dispose();
    ctx._echartsBencanaBar = echarts.init(el);
    ctx._echartsBencanaBar.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: params => {
                const p = params[0];
                return `${p.name}<br/><b>Total Kejadian: ${p.value.toLocaleString('id-ID')}</b>`;
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
                    { offset: 0, color: '#E74C3C' },
                    { offset: 1, color: '#922B21' },
                ]),
                borderRadius: [4, 4, 0, 0],
            },
            emphasis: { itemStyle: { color: '#7B241C' } },
        }],
    });
}

// ─── Donut chart: per kategori ────────────────────────────────────────────────
function _renderBencanaDonutChart(ctx, data) {
    const el = ctx.chartBencanaDonutRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsBencanaDonut) ctx._echartsBencanaDonut.dispose();
    ctx._echartsBencanaDonut = echarts.init(el);
    const COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#3498DB',
                    '#9B59B6', '#1ABC9C', '#E91E63', '#FF5722', '#795548'];
    ctx._echartsBencanaDonut.setOption({
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

export function disposeBencanaCharts(ctx) {
    if (ctx._echartsBencanaBar)   { ctx._echartsBencanaBar.dispose();   ctx._echartsBencanaBar   = null; }
    if (ctx._echartsBencanaDonut) { ctx._echartsBencanaDonut.dispose(); ctx._echartsBencanaDonut = null; }
}

export async function updateBencanaCharts(ctx, mode) {
    const row = ctx.chartBencanaRowRef?.el;
    if (!row) return;

    if (mode !== 'bencana') {
        row.style.display = 'none';
        disposeBencanaCharts(ctx);
        return;
    }
    row.style.display = 'flex';

    const tahun       = ctx.filterTahun?.el?.value      || '';
    const dateFrom    = ctx.activeDateFrom               || '';
    const dateTo      = ctx.activeDateTo                 || '';
    const kategoriId  = parseInt(ctx.filterKategori?.el?.value)  || null;
    const kabupatenId = parseInt(ctx.filterKabupaten?.el?.value) || null;
    const stateValue  = ctx.filterState?.el?.value       || '';

    const drillDomain = ctx.drillKecamatanId
        ? [['kecamatan_id', '=', ctx.drillKecamatanId]]
        : ctx.drillKabupatenId
            ? [['kabupaten_id', '=', ctx.drillKabupatenId]]
            : [];

    const baseDomain = [
        ...drillDomain,
        ...(kabupatenId ? [['kabupaten_id',             '=',  kabupatenId]]                : []),
        ...(stateValue  ? [['state',                    '=',  stateValue]]                 : []),
        ...(tahun       ? [['sumber_dokumen_id.tahun',  '=',  tahun]]                      : []),
        ...(dateFrom    ? [['tanggal_kejadian',          '>=', dateFrom + ' 00:00:00']]    : []),
        ...(dateTo      ? [['tanggal_kejadian',          '<=', dateTo   + ' 23:59:59']]    : []),
        ...(kategoriId  ? [['kategori_id',               '=',  kategoriId]]                : []),
    ];
    const donutDomain = [...baseDomain];

    try {
        const [kabGroups, katGroups, allKabupaten] = await Promise.all([
            ctx.orm.call('petadigi.bencana', 'read_group',
                [baseDomain,  ['kabupaten_id'], ['kabupaten_id']], { lazy: false }),
            ctx.orm.call('petadigi.bencana', 'read_group',
                [donutDomain, ['kategori_id'],  ['kategori_id']],  { lazy: false }),
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
        _renderBencanaBarChart(ctx, kabList.map(k => k.name), kabList.map(k => k.val));

        // Donut — per kategori
        const donutData = katGroups
            .filter(g => g.kategori_id)
            .map(g => ({ name: g.kategori_id[1], value: g.__count || 0 }))
            .sort((a, b) => b.value - a.value);

        const donutEl = ctx.chartBencanaDonutTitleRef?.el;
        if (donutEl) {
            const loc = ctx.drillKecamatanId
                ? 'Wilayah Kecamatan Terpilih'
                : ctx.drillKabupatenId
                    ? 'Kabupaten Terpilih'
                    : kabupatenId
                        ? 'Kabupaten Terpilih'
                        : 'Semua Wilayah';
            donutEl.innerHTML = `<i class="fa fa-pie-chart"></i> Bencana Berdasarkan Kategori (${loc})`;
        }

        _renderBencanaDonutChart(ctx, donutData);

    } catch (e) {
        console.error('Gagal memuat grafik bencana:', e);
    }
}
