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

// ─── Data Table ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export async function updateLokasiTable(ctx, mode, page) {
    const rowEl  = ctx.tableLokasiRowRef?.el;
    const bodyEl = ctx.tableLokasiBodyRef?.el;
    if (!rowEl) return;

    if (mode !== 'lokasi') { rowEl.style.display = 'none'; return; }
    rowEl.style.display = 'flex';

    ctx._lokasiTablePage = (page !== undefined) ? page : 1;
    const offset = (ctx._lokasiTablePage - 1) * PAGE_SIZE;

    // lokasi_penting tidak punya sumber_dokumen_id / tanggal_kejadian
    const kategoriId  = parseInt(ctx.filterKategori?.el?.value)  || null;
    const kabupatenId = parseInt(ctx.filterKabupaten?.el?.value) || null;
    const stateValue  = ctx.filterState?.el?.value        || '';

    const drillDomain = ctx.drillKecamatanId
        ? [['kecamatan_id', '=', ctx.drillKecamatanId]]
        : ctx.drillKabupatenId ? [['kabupaten_id', '=', ctx.drillKabupatenId]] : [];

    const domain = [
        ...drillDomain,
        ...(kabupatenId ? [['kabupaten_id', '=', kabupatenId]] : []),
        ...(stateValue  ? [['state',        '=', stateValue]]  : []),
        ...(kategoriId  ? [['kategori_id',  '=', kategoriId]]  : []),
    ];

    bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#bbb;font-size:13px;">Memuat data...</div>`;

    try {
        const [records, total] = await Promise.all([
            ctx.orm.searchRead('petadigi.lokasi_penting', domain,
                ['id', 'code', 'nama_lokasi', 'alamat_lengkap',
                 'kabupaten_id', 'kecamatan_id', 'kategori_id', 'state'],
                { order: 'name asc', limit: PAGE_SIZE, offset }),
            ctx.orm.searchCount('petadigi.lokasi_penting', domain),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const curPage    = ctx._lokasiTablePage;
        const fromRow    = total > 0 ? offset + 1 : 0;
        const toRow      = Math.min(offset + PAGE_SIZE, total);

        const rows = records.map((r, i) => {
            const kab    = Array.isArray(r.kabupaten_id) ? r.kabupaten_id[1] : '-';
            const kec    = Array.isArray(r.kecamatan_id) ? r.kecamatan_id[1] : '-';
            const kat    = Array.isArray(r.kategori_id)  ? r.kategori_id[1]  : '-';
            const alamat = r.alamat_lengkap
                ? (r.alamat_lengkap.length > 50 ? r.alamat_lengkap.slice(0, 50) + '…' : r.alamat_lengkap)
                : '-';
            const cls = r.state === 'AKTIF' ? '--green' : '--gray';
            return `
                <tr class="petadigi-table-row" data-id="${r.id}" style="cursor:pointer;">
                    <td class="petadigi-td">${offset + i + 1}</td>
                    <td class="petadigi-td petadigi-td--mono">${r.code || '-'}</td>
                    <td class="petadigi-td">${r.nama_lokasi || '-'}</td>
                    <td class="petadigi-td petadigi-td--wrap" title="${(r.alamat_lengkap || '').replace(/"/g, '&quot;')}">${alamat}</td>
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
                        <th class="petadigi-th">Nama Lokasi</th>
                        <th class="petadigi-th">Alamat</th>
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
                ctx.action.doAction({ type: 'ir.actions.act_window', res_model: 'petadigi.lokasi_penting',
                    res_id: id, views: [[false, 'form']], target: 'current' });
            });
        });
        bodyEl.querySelector('[data-action="prev"]')?.addEventListener('click', () => updateLokasiTable(ctx, mode, curPage - 1));
        bodyEl.querySelector('[data-action="next"]')?.addEventListener('click', () => updateLokasiTable(ctx, mode, curPage + 1));

    } catch (e) {
        console.error('Lokasi table load error:', e);
        bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#e74c3c;font-size:13px;">Gagal memuat data</div>`;
    }
}
