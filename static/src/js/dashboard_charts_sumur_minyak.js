/** @odoo-module **/

// sumur_minyak tidak punya kategori, sumber_dokumen_id, atau tanggal_kejadian.
// Domain hanya pakai kabupaten_id, state, dan drill-down context.

// ─── Bar chart: total per kabupaten ──────────────────────────────────────────
function _renderSumurBarChart(ctx, names, values) {
    const el = ctx.chartSumurBarRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsSumurBar) ctx._echartsSumurBar.dispose();
    ctx._echartsSumurBar = echarts.init(el);
    ctx._echartsSumurBar.setOption({
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: params => {
                const p = params[0];
                return `${p.name}<br/><b>Total Sumur: ${p.value.toLocaleString('id-ID')}</b>`;
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
            splitLine: { lineStyle: { color: '#f5ece4', type: 'dashed' } },
        },
        series: [{
            type: 'bar',
            data: values,
            barMaxWidth: 36,
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#E59866' },
                    { offset: 1, color: '#A04000' },
                ]),
                borderRadius: [4, 4, 0, 0],
            },
            emphasis: { itemStyle: { color: '#7E5109' } },
        }],
    });
}

// ─── Donut chart: per kategori ────────────────────────────────────────────────
const KATEGORI_COLORS = ['#A04000','#CA6F1E','#D4AC0D','#1E8BC3','#8E44AD','#27AE60','#E74C3C','#2C3E50','#16A085','#F39C12'];

function _renderSumurDonutChart(ctx, data) {
    const el = ctx.chartSumurDonutRef?.el;
    if (!el || typeof echarts === 'undefined') return;
    if (ctx._echartsSumurDonut) ctx._echartsSumurDonut.dispose();
    ctx._echartsSumurDonut = echarts.init(el);
    ctx._echartsSumurDonut.setOption({
        tooltip: {
            trigger: 'item',
            backgroundColor: '#fff',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            textStyle: { color: '#2c3e50', fontSize: 12 },
            formatter: '{b}: {c} ({d}%)',
        },
        legend: {
            orient: 'horizontal',
            bottom: 4,
            left: 'center',
            textStyle: { fontSize: 10, color: '#555' },
            icon: 'circle',
            itemWidth: 9,
            itemHeight: 9,
        },
        color: KATEGORI_COLORS,
        series: [{
            type: 'pie',
            radius: ['38%', '62%'],
            center: ['50%', '46%'],
            data,
            label: { show: false },
            itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
            emphasis: { itemStyle: { shadowBlur: 8, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' } },
        }],
    });
}

// ─── Exported ─────────────────────────────────────────────────────────────────

export function disposeSumurCharts(ctx) {
    if (ctx._echartsSumurBar)   { ctx._echartsSumurBar.dispose();   ctx._echartsSumurBar   = null; }
    if (ctx._echartsSumurDonut) { ctx._echartsSumurDonut.dispose(); ctx._echartsSumurDonut = null; }
}

export async function updateSumurCharts(ctx, mode) {
    const ver = ctx._modeVersion;
    const row = ctx.chartSumurRowRef?.el;
    if (!row) return;

    if (mode !== 'sumur') {
        if (ctx.currentMode !== 'sumur') { row.style.display = 'none'; disposeSumurCharts(ctx); }
        return;
    }
    row.style.display = 'flex';

    const kabupatenId = parseInt(ctx.filterKabupaten?.el?.value)     || null;
    const stateValue  = ctx.filterState?.el?.value                   || '';
    const kategoriId  = parseInt(ctx.filterKategoriSumur?.el?.value) || null;

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
        const [kabGroups, allKabupaten, kategoriGroups] = await Promise.all([
            ctx.orm.call('petadigi.sumur_minyak', 'read_group',
                [baseDomain, ['kabupaten_id'], ['kabupaten_id']], { lazy: false }),
            ctx.orm.searchRead('petadigi.kabupaten', [], ['id', 'name'], { order: 'name asc' }),
            ctx.orm.call('petadigi.sumur_minyak', 'read_group',
                [baseDomain, ['kategori_id'], ['kategori_id']], { lazy: false }),
        ]);

        // Bar — semua kabupaten termasuk yang 0, sort desc
        const kabCountMap = {};
        kabGroups.forEach(g => {
            if (!g.kabupaten_id) return;
            kabCountMap[g.kabupaten_id[0]] = g.__count || 0;
        });
        const kabList = allKabupaten.map(k => ({ name: k.name, val: kabCountMap[k.id] || 0 }));
        kabList.sort((a, b) => b.val - a.val);
        if (ctx._modeVersion !== ver) return;
        _renderSumurBarChart(ctx, kabList.map(k => k.name), kabList.map(k => k.val));

        // Donut — per kategori
        const donutData = kategoriGroups.map(g => ({
            name:  Array.isArray(g.kategori_id) ? g.kategori_id[1] : 'Tanpa Kategori',
            value: g.__count || 0,
        })).filter(d => d.value > 0);

        _renderSumurDonutChart(ctx, donutData.length ? donutData : [
            { name: 'Belum ada data', value: 0 },
        ]);

    } catch (e) {
        console.error('Gagal memuat grafik sumur minyak:', e);
    }
}

// ─── Data Table ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export async function updateSumurTable(ctx, mode, page) {
    const ver    = ctx._modeVersion;
    const rowEl  = ctx.tableSumurRowRef?.el;
    const bodyEl = ctx.tableSumurBodyRef?.el;
    if (!rowEl || !bodyEl) return;

    if (mode !== 'sumur') { if (ctx.currentMode !== 'sumur') rowEl.style.display = 'none'; return; }
    rowEl.style.display = 'flex';

    ctx._sumurTablePage = (page !== undefined) ? page : 1;
    const offset = (ctx._sumurTablePage - 1) * PAGE_SIZE;

    const kabupatenId  = parseInt(ctx.filterKabupaten?.el?.value)       || null;
    const stateValue   = ctx.filterState?.el?.value                     || '';
    const kategoriId   = parseInt(ctx.filterKategoriSumur?.el?.value)   || null;

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
            ctx.orm.searchRead('petadigi.sumur_minyak', domain,
                ['id', 'code', 'name', 'desa_id', 'kecamatan_id', 'kabupaten_id',
                 'jumlah_minyak', 'kategori_id', 'state'],
                { order: 'name asc', limit: PAGE_SIZE, offset }),
            ctx.orm.searchCount('petadigi.sumur_minyak', domain),
        ]);

        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const curPage    = ctx._sumurTablePage;
        const fromRow    = total > 0 ? offset + 1 : 0;
        const toRow      = Math.min(offset + PAGE_SIZE, total);

        const rows = records.map((r, i) => {
            const kab      = Array.isArray(r.kabupaten_id) ? r.kabupaten_id[1] : '-';
            const kec      = Array.isArray(r.kecamatan_id) ? r.kecamatan_id[1] : '-';
            const desa     = Array.isArray(r.desa_id)      ? r.desa_id[1]      : '-';
            const kategori = Array.isArray(r.kategori_id)  ? r.kategori_id[1]  : '-';
            const cls      = r.state === 'AKTIF' ? '--green' : '--gray';
            return `
                <tr class="petadigi-table-row" data-id="${r.id}" style="cursor:pointer;">
                    <td class="petadigi-td">${offset + i + 1}</td>
                    <td class="petadigi-td petadigi-td--mono">${r.code || '-'}</td>
                    <td class="petadigi-td">${r.name || '-'}</td>
                    <td class="petadigi-td">${desa}</td>
                    <td class="petadigi-td">${kec}</td>
                    <td class="petadigi-td">${kab}</td>
                    <td class="petadigi-td">${kategori}</td>
                    <td class="petadigi-td">${r.jumlah_minyak ? r.jumlah_minyak.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
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
                        <th class="petadigi-th">Kode</th>
                        <th class="petadigi-th">Nama Sumur</th>
                        <th class="petadigi-th">Desa</th>
                        <th class="petadigi-th">Kecamatan</th>
                        <th class="petadigi-th">Kabupaten</th>
                        <th class="petadigi-th">Kategori</th>
                        <th class="petadigi-th">Jml. Minyak Produksi/Masuk</th>
                        <th class="petadigi-th">Status</th>
                    </tr></thead>
                    <tbody>
                        ${rows || `<tr><td colspan="9" style="text-align:center;padding:24px;color:#bbb;font-size:13px;">Tidak ada data</td></tr>`}
                    </tbody>
                </table>
            </div>`;

        bodyEl.querySelectorAll('.petadigi-table-row').forEach(tr => {
            tr.addEventListener('click', () => {
                const id = parseInt(tr.dataset.id);
                if (!id) return;
                ctx.action.doAction({ type: 'ir.actions.act_window', res_model: 'petadigi.sumur_minyak',
                    res_id: id, views: [[false, 'form']], target: 'current' });
            });
        });
        bodyEl.querySelector('[data-action="prev"]')?.addEventListener('click', () => updateSumurTable(ctx, mode, curPage - 1));
        bodyEl.querySelector('[data-action="next"]')?.addEventListener('click', () => updateSumurTable(ctx, mode, curPage + 1));

    } catch (e) {
        console.error('Sumur table load error:', e);
        bodyEl.innerHTML = `<div style="text-align:center;padding:24px;color:#e74c3c;font-size:13px;">Gagal memuat data</div>`;
    }
}
