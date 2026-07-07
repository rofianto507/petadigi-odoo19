/** @odoo-module **/

// sumur_minyak tidak punya kategori, sumber_dokumen_id, atau tanggal_kejadian.
// Domain hanya pakai kabupaten_id, state, dan drill-down context.

// ─── Combo chart: bar (total sumur) + line (total minyak) per kabupaten ───────
function _renderSumurBarChart(ctx, names, counts, minyakVals) {
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
                return params.map(p =>
                    `${p.marker} ${p.seriesName}: <b>${Number(p.value).toLocaleString('id-ID', { maximumFractionDigits: 2 })}</b>`
                ).join('<br/>');
            },
        },
        legend: {
            data: ['Total Sumur', 'Total Minyak'],
            bottom: 0,
            left: 'center',
            textStyle: { fontSize: 10, color: '#555' },
            icon: 'roundRect',
            itemWidth: 10,
            itemHeight: 10,
        },
        grid: { left: 10, right: 50, top: 10, bottom: 70, containLabel: true },
        xAxis: {
            type: 'category',
            data: names,
            axisLabel: { rotate: 40, fontSize: 10, color: '#666', interval: 0 },
            axisLine: { lineStyle: { color: '#d0d7de' } },
            axisTick: { show: false },
        },
        yAxis: [
            {
                type: 'value',
                name: 'Sumur',
                nameTextStyle: { fontSize: 9, color: '#A04000' },
                axisLabel: { fontSize: 9, color: '#A04000' },
                splitLine: { lineStyle: { color: '#f5ece4', type: 'dashed' } },
            },
            {
                type: 'value',
                name: 'Minyak',
                nameTextStyle: { fontSize: 9, color: '#1a6b9a' },
                axisLabel: { fontSize: 9, color: '#1a6b9a' },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: 'Total Sumur',
                type: 'bar',
                yAxisIndex: 0,
                data: counts,
                barMaxWidth: 32,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#E59866' },
                        { offset: 1, color: '#A04000' },
                    ]),
                    borderRadius: [4, 4, 0, 0],
                },
                emphasis: { itemStyle: { color: '#7E5109' } },
            },
            {
                name: 'Total Minyak',
                type: 'line',
                yAxisIndex: 1,
                data: minyakVals,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                lineStyle: { color: '#1a6b9a', width: 2 },
                itemStyle: { color: '#1a6b9a' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(26,107,154,0.18)' },
                        { offset: 1, color: 'rgba(26,107,154,0.01)' },
                    ]),
                },
            },
        ],
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
            formatter: p => `${p.name}: ${Number(p.value).toLocaleString('id-ID', { maximumFractionDigits: 2 })} (${p.percent}%)`,
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
                [baseDomain, ['kabupaten_id', 'total_minyak:sum'], ['kabupaten_id']], { lazy: false }),
            ctx.orm.searchRead('petadigi.kabupaten', [], ['id', 'name'], { order: 'name asc' }),
            ctx.orm.call('petadigi.sumur_minyak', 'read_group',
                [baseDomain, ['kategori_id', 'total_minyak:sum'], ['kategori_id']], { lazy: false }),
        ]);

        // Combo bar+line — semua kabupaten termasuk yang 0, sort desc by count
        const kabCountMap = {}, kabMinyakMap = {};
        kabGroups.forEach(g => {
            if (!g.kabupaten_id) return;
            kabCountMap[g.kabupaten_id[0]] = g.__count || 0;
            kabMinyakMap[g.kabupaten_id[0]] = g.total_minyak || 0;
        });
        const kabList = allKabupaten.map(k => ({
            name: k.name,
            val: kabCountMap[k.id] || 0,
            minyak: kabMinyakMap[k.id] || 0,
        }));
        kabList.sort((a, b) => b.val - a.val);
        if (ctx._modeVersion !== ver) return;
        _renderSumurBarChart(ctx,
            kabList.map(k => k.name),
            kabList.map(k => k.val),
            kabList.map(k => k.minyak),
        );

        // Donut — per kategori berdasarkan total minyak
        const donutData = kategoriGroups.map(g => ({
            name:  Array.isArray(g.kategori_id) ? g.kategori_id[1] : 'Tanpa Kategori',
            value: g.total_minyak || 0,
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
                 'kategori_id', 'kategori_kode',
                 'minyak_produksi', 'minyak_masuk', 'minyak_tersedia', 'minyak_keluar', 'minyak_ditolak',
                 'state'],
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
            const fmt      = v => (v ? v.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-');
            let minyakCell = '-';
            if (r.kategori_kode === 'sumur_masyarakat')
                minyakCell = `P: ${fmt(r.minyak_produksi)} / K: ${fmt(r.minyak_keluar)}`;
            else if (r.kategori_kode === 'bku')
                minyakCell = `M: ${fmt(r.minyak_masuk)} / T: ${fmt(r.minyak_tersedia)} / K: ${fmt(r.minyak_keluar)}`;
            else if (r.kategori_kode === 'k3s')
                minyakCell = `M: ${fmt(r.minyak_masuk)} / D: ${fmt(r.minyak_ditolak)}`;
            return `
                <tr class="petadigi-table-row" data-id="${r.id}" style="cursor:pointer;">
                    <td class="petadigi-td">${offset + i + 1}</td>
                    <td class="petadigi-td petadigi-td--mono">${r.code || '-'}</td>
                    <td class="petadigi-td">${r.name || '-'}</td>
                    <td class="petadigi-td">${desa}</td>
                    <td class="petadigi-td">${kec}</td>
                    <td class="petadigi-td">${kab}</td>
                    <td class="petadigi-td">${kategori}</td>
                    <td class="petadigi-td">${minyakCell}</td>
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
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:10px;color:#888;background:#fdf6ee;border:1px solid #f0d9b5;border-radius:4px;padding:2px 8px;white-space:nowrap;">
                        <b style="color:#A04000;">P</b>=Produksi &nbsp;
                        <b style="color:#A04000;">M</b>=Masuk &nbsp;
                        <b style="color:#A04000;">T</b>=Tersedia &nbsp;
                        <b style="color:#A04000;">K</b>=Keluar &nbsp;
                        <b style="color:#A04000;">D</b>=Ditolak
                    </span>
                    <div class="petadigi-table-pagination">
                        <button class="petadigi-page-btn" data-action="prev" ${curPage <= 1 ? 'disabled' : ''}><i class="fa fa-chevron-left"></i></button>
                        <span class="petadigi-page-info">Hal. ${curPage} / ${totalPages}</span>
                        <button class="petadigi-page-btn" data-action="next" ${curPage >= totalPages ? 'disabled' : ''}><i class="fa fa-chevron-right"></i></button>
                    </div>
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
                        <th class="petadigi-th">Volume Minyak</th>
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
