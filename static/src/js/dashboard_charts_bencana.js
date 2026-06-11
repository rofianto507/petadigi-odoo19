/** @odoo-module **/

import { fmtTanggal } from "./dashboard_helpers";

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

// ─── Data Table ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export async function updateBencanaTable(ctx, mode, page) {
    const rowEl  = ctx.tableBencanaRowRef?.el;
    const bodyEl = ctx.tableBencanaBodyRef?.el;
    if (!rowEl) return;

    if (mode !== 'bencana') { rowEl.style.display = 'none'; return; }
    rowEl.style.display = 'flex';

    ctx._bencanaTablePage = (page !== undefined) ? page : 1;
    const offset = (ctx._bencanaTablePage - 1) * PAGE_SIZE;

    const tahun       = ctx.filterTahun?.el?.value       || '';
    const dateFrom    = ctx.activeDateFrom                || '';
    const dateTo      = ctx.activeDateTo                  || '';
    const kategoriId  = parseInt(ctx.filterKategori?.el?.value)  || null;
    const kabupatenId = parseInt(ctx.filterKabupaten?.el?.value) || null;
    const stateValue  = ctx.filterState?.el?.value        || '';

    const drillDomain = ctx.drillKecamatanId
        ? [['kecamatan_id', '=', ctx.drillKecamatanId]]
        : ctx.drillKabupatenId ? [['kabupaten_id', '=', ctx.drillKabupatenId]] : [];

    const domain = [
        ...drillDomain,
        ...(kabupatenId ? [['kabupaten_id',            '=',  kabupatenId]]            : []),
        ...(stateValue  ? [['state',                   '=',  stateValue]]             : []),
        ...(tahun       ? [['sumber_dokumen_id.tahun', '=',  tahun]]                  : []),
        ...(dateFrom    ? [['tanggal_kejadian',        '>=', dateFrom + ' 00:00:00']] : []),
        ...(dateTo      ? [['tanggal_kejadian',        '<=', dateTo   + ' 23:59:59']] : []),
        ...(kategoriId  ? [['kategori_id',             '=',  kategoriId]]             : []),
    ];

    bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#bbb;font-size:13px;">Memuat data...</div>`;

    try {
        const [records, total] = await Promise.all([
            ctx.orm.searchRead('petadigi.bencana', domain,
                ['id', 'code', 'nama_bencana', 'tanggal_kejadian',
                 'kabupaten_id', 'kecamatan_id', 'kategori_id', 'state'],
                { order: 'tanggal_kejadian desc', limit: PAGE_SIZE, offset }),
            ctx.orm.searchCount('petadigi.bencana', domain),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const curPage    = ctx._bencanaTablePage;
        const fromRow    = total > 0 ? offset + 1 : 0;
        const toRow      = Math.min(offset + PAGE_SIZE, total);

        const rows = records.map((r, i) => {
            const kab = Array.isArray(r.kabupaten_id) ? r.kabupaten_id[1] : '-';
            const kec = Array.isArray(r.kecamatan_id) ? r.kecamatan_id[1] : '-';
            const kat = Array.isArray(r.kategori_id)  ? r.kategori_id[1]  : '-';
            const cls = r.state === 'AKTIF' ? '--green' : '--gray';
            return `
                <tr class="petadigi-table-row" data-id="${r.id}" style="cursor:pointer;">
                    <td class="petadigi-td">${offset + i + 1}</td>
                    <td class="petadigi-td petadigi-td--mono">${r.code || '-'}</td>
                    <td class="petadigi-td">${r.nama_bencana || '-'}</td>
                    <td class="petadigi-td" style="white-space:nowrap;">${fmtTanggal(r.tanggal_kejadian)}</td>
                    <td class="petadigi-td">${kab}</td>
                    <td class="petadigi-td">${kec}</td>
                    <td class="petadigi-td">${kat}</td>
                    <td class="petadigi-td"><span class="petadigi-badge petadigi-badge${cls}">${r.state || '-'}</span></td>
                </tr>`;
        }).join('');

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
                        <th class="petadigi-th">Kode</th>
                        <th class="petadigi-th">Nama Bencana</th>
                        <th class="petadigi-th">Tgl Kejadian</th>
                        <th class="petadigi-th">Kabupaten</th>
                        <th class="petadigi-th">Kecamatan</th>
                        <th class="petadigi-th">Kategori</th>
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
                ctx.action.doAction({ type: 'ir.actions.act_window', res_model: 'petadigi.bencana',
                    res_id: id, views: [[false, 'form']], target: 'current' });
            });
        });
        bodyEl.querySelector('[data-action="prev"]')?.addEventListener('click', () => updateBencanaTable(ctx, mode, curPage - 1));
        bodyEl.querySelector('[data-action="next"]')?.addEventListener('click', () => updateBencanaTable(ctx, mode, curPage + 1));

    } catch (e) {
        console.error('Bencana table load error:', e);
        bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#e74c3c;font-size:13px;">Gagal memuat data</div>`;
    }
}
