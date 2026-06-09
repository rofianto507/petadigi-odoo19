/** @odoo-module **/

const TIME_LABELS = ['00:00-02:59', '03:00-05:59', '06:00-08:59', '09:00-11:59',
                     '12:00-14:59', '15:00-17:59', '18:00-20:59', '21:00-23:59'];

// ─── Bar chart: total per kabupaten ──────────────────────────────────────────
function _renderLalinBarChart(ctx, names, values) {
    const el = ctx.chartLalinBarRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsLalinBar) ctx._echartsLalinBar.dispose();
    ctx._echartsLalinBar = echarts.init(el);
    ctx._echartsLalinBar.setOption({
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
                    { offset: 0, color: '#E67E22' },
                    { offset: 1, color: '#7D6608' },
                ]),
                borderRadius: [4, 4, 0, 0],
            },
            emphasis: { itemStyle: { color: '#6E2F1A' } },
        }],
    });
}

// ─── Donut chart: per kategori ────────────────────────────────────────────────
function _renderLalinDonutChart(ctx, data) {
    const el = ctx.chartLalinDonutRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsLalinDonut) ctx._echartsLalinDonut.dispose();
    ctx._echartsLalinDonut = echarts.init(el);
    const COLORS = ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#3498DB',
                    '#9B59B6', '#1ABC9C', '#E91E63', '#FF5722', '#795548'];
    ctx._echartsLalinDonut.setOption({
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

// ─── Pie chart: per jenis jalan ───────────────────────────────────────────────
function _renderLalinJenisJalanChart(ctx, data) {
    const el = ctx.chartLalinJenisJalanRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsLalinJenisJalan) ctx._echartsLalinJenisJalan.dispose();
    ctx._echartsLalinJenisJalan = echarts.init(el);
    const COLORS = ['#3498DB', '#2471A3', '#1ABC9C', '#117A65', '#F39C12',
                    '#E74C3C', '#8E44AD', '#2ECC71', '#E67E22', '#BDC3C7'];
    ctx._echartsLalinJenisJalan.setOption({
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
            radius: '68%',
            center: ['36%', '50%'],
            data,
            label: { show: true, formatter: '{b}\n{c}', fontSize: 10, color: '#555' },
            labelLine: { length: 8, length2: 10 },
            itemStyle: { borderColor: '#fff', borderWidth: 2 },
            emphasis: { itemStyle: { shadowBlur: 8, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' } },
        }],
    });
}

// ─── Helper: proses hour groups → array[8] slot 3 jam ────────────────────────
function _processLalinHourGroups(groups) {
    const data = new Array(8).fill(0);
    groups.forEach(g => {
        const rangeFrom = g.__range?.['tanggal_kejadian:hour']?.from
                       || g.__range?.['tanggal_kejadian']?.from;
        if (!rangeFrom) return;
        const dateObj = new Date(rangeFrom.length > 10 ? rangeFrom.replace(' ', 'T') + 'Z' : rangeFrom);
        const slot    = Math.floor(dateObj.getHours() / 3);
        if (slot >= 0 && slot < 8) data[slot] += g.__count || 0;
    });
    return data;
}

// ─── Area line: rentang waktu kejadian (per slot 3 jam) ───────────────────────
function _renderLalinWaktuChart(ctx, labels, values) {
    const el = ctx.chartLalinWaktuRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsLalinWaktu) ctx._echartsLalinWaktu.dispose();
    ctx._echartsLalinWaktu = echarts.init(el);
    ctx._echartsLalinWaktu.setOption({
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
            data: values,
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: { color: '#E67E22', width: 2 },
            itemStyle: { color: '#D35400' },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(230,126,34,0.34)' },
                    { offset: 1, color: 'rgba(211,84,0,0.03)' },
                ]),
            },
            label: {
                show: true, position: 'top', fontSize: 10, color: '#D35400', fontWeight: '600',
                formatter: p => p.value > 0 ? p.value.toLocaleString('id-ID') : '',
            },
        }],
    });
}

// ─── Exported ─────────────────────────────────────────────────────────────────

export function disposeLalinCharts(ctx) {
    if (ctx._echartsLalinBar)        { ctx._echartsLalinBar.dispose();        ctx._echartsLalinBar        = null; }
    if (ctx._echartsLalinDonut)      { ctx._echartsLalinDonut.dispose();      ctx._echartsLalinDonut      = null; }
    if (ctx._echartsLalinJenisJalan) { ctx._echartsLalinJenisJalan.dispose(); ctx._echartsLalinJenisJalan = null; }
    if (ctx._echartsLalinWaktu)      { ctx._echartsLalinWaktu.dispose();      ctx._echartsLalinWaktu      = null; }
}

export async function updateLalinCharts(ctx, mode) {
    const row  = ctx.chartLalinRowRef?.el;
    const row2 = ctx.chartLalinRow2Ref?.el;
    if (!row) return;

    if (mode !== 'lalin') {
        row.style.display  = 'none';
        if (row2) row2.style.display = 'none';
        disposeLalinCharts(ctx);
        return;
    }
    row.style.display  = 'flex';
    if (row2) row2.style.display = 'flex';

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
        ...(kabupatenId ? [['kabupaten_id',            '=',  kabupatenId]]               : []),
        ...(stateValue  ? [['state',                   '=',  stateValue]]                : []),
        ...(tahun       ? [['sumber_dokumen_id.tahun', '=',  tahun]]                     : []),
        ...(dateFrom    ? [['tanggal_kejadian',         '>=', dateFrom + ' 00:00:00']]   : []),
        ...(dateTo      ? [['tanggal_kejadian',         '<=', dateTo   + ' 23:59:59']]   : []),
        ...(kategoriId  ? [['kategori_id',              '=',  kategoriId]]               : []),
    ];

    try {
        const [kabGroups, katGroups, allKabupaten, jenisJalanGroups, waktuGroups] = await Promise.all([
            ctx.orm.call('petadigi.lalu_lintas', 'read_group',
                [baseDomain, ['kabupaten_id'],   ['kabupaten_id']],   { lazy: false }),
            ctx.orm.call('petadigi.lalu_lintas', 'read_group',
                [baseDomain, ['kategori_id'],    ['kategori_id']],    { lazy: false }),
            ctx.orm.searchRead('petadigi.kabupaten', [], ['id', 'name'], { order: 'name asc' }),
            ctx.orm.call('petadigi.lalu_lintas', 'read_group',
                [baseDomain, ['jenis_jalan_id'], ['jenis_jalan_id']], { lazy: false }),
            ctx.orm.call('petadigi.lalu_lintas', 'read_group',
                [baseDomain, ['id'],             ['tanggal_kejadian:hour']], { lazy: false }),
        ]);

        // Bar — semua kabupaten termasuk yang 0, sort desc
        const kabCountMap = {};
        kabGroups.forEach(g => {
            if (!g.kabupaten_id) return;
            kabCountMap[g.kabupaten_id[0]] = g.__count || 0;
        });
        const kabList = allKabupaten.map(k => ({ name: k.name, val: kabCountMap[k.id] || 0 }));
        kabList.sort((a, b) => b.val - a.val);
        _renderLalinBarChart(ctx, kabList.map(k => k.name), kabList.map(k => k.val));

        // Donut — per kategori
        const donutData = katGroups
            .filter(g => g.kategori_id)
            .map(g => ({ name: g.kategori_id[1], value: g.__count || 0 }))
            .sort((a, b) => b.value - a.value);

        const titleEl = ctx.chartLalinDonutTitleRef?.el;
        if (titleEl) {
            const loc = ctx.drillKecamatanId
                ? 'Wilayah Kecamatan Terpilih'
                : ctx.drillKabupatenId || kabupatenId
                    ? 'Kabupaten Terpilih'
                    : 'Semua Wilayah';
            titleEl.innerHTML = `<i class="fa fa-pie-chart"></i> Lalu Lintas Berdasarkan Kategori (${loc})`;
        }
        _renderLalinDonutChart(ctx, donutData);

        // Pie — per jenis jalan
        const jenisJalanData = jenisJalanGroups
            .filter(g => g.jenis_jalan_id)
            .map(g => ({ name: g.jenis_jalan_id[1], value: g.__count || 0 }))
            .sort((a, b) => b.value - a.value);
        _renderLalinJenisJalanChart(ctx, jenisJalanData);

        // Area line — rentang waktu kejadian (slot 3 jam)
        const waktuData = _processLalinHourGroups(waktuGroups);
        _renderLalinWaktuChart(ctx, TIME_LABELS, waktuData);

    } catch (e) {
        console.error('Gagal memuat grafik lalu lintas:', e);
    }
}
