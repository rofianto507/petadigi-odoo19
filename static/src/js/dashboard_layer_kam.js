/** @odoo-module **/

/**
 * Peta Kasus Menonjol (KAM)
 * Choropleth per kabupaten/kecamatan/desa — warna berdasarkan jumlah kasus.
 */

// ── Skala warna (sama dengan kriminalitas, threshold disesuaikan volume KAM) ──
const KAM_COLORS = [
    { min: 51, max: Infinity, color: '#922b21', label: '> 50 Kasus'      },
    { min: 21, max: 50,       color: '#e74c3c', label: '21 – 50 Kasus'   },
    { min: 11, max: 20,       color: '#e67e22', label: '11 – 20 Kasus'   },
    { min:  1, max: 10,       color: '#f1c40f', label: '1 – 10 Kasus'    },
    { min:  0, max:  0,       color: '#abebc6', label: 'Tidak Ada Kasus' },
];

function getKamColor(jumlah) {
    for (const tier of KAM_COLORS) {
        if (jumlah >= tier.min) return tier.color;
    }
    return '#d5f5e3';
}

// ── Legend ───────────────────────────────────────────────────────────────────
export function addKamLegend(ctx) {
    if (ctx.kamLegend) { ctx.kamLegend.remove(); ctx.kamLegend = null; }
    const KamLegend = L.Control.extend({
        onAdd() {
            const div = L.DomUtil.create('div', 'petadigi-legend petadigi-legend--kam');
            div.innerHTML = `
                <div class="petadigi-legend-title">
                    <i class="fa fa-shield"></i> Legenda Kasus Menonjol
                </div>
                <ul class="petadigi-legend-list">
                    ${KAM_COLORS.map(t => `
                        <li>
                            <span class="petadigi-legend-swatch" style="background:${t.color};"></span>
                            <span class="petadigi-legend-label">${t.label}</span>
                        </li>
                    `).join('')}
                </ul>`;
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        },
        onRemove() {}
    });
    ctx.kamLegend = new KamLegend({ position: 'bottomright' });
    ctx.kamLegend.addTo(ctx.map);
}

export function removeKamLegend(ctx) {
    if (ctx.kamLegend) { ctx.kamLegend.remove(); ctx.kamLegend = null; }
}

// ── Helpers filter ───────────────────────────────────────────────────────────
function _getActiveFilters(ctx) {
    return {
        tahun:       ctx.filterTahun?.el?.value       || '',
        kabupatenId: ctx.filterKabupaten?.el?.value   ? parseInt(ctx.filterKabupaten.el.value)  : null,
        dateFrom:    ctx.activeDateFrom                || '',
        dateTo:      ctx.activeDateTo                  || '',
        kategoriId:  ctx.filterKategori?.el?.value    ? parseInt(ctx.filterKategori.el.value)   : null,
        stateValue:  ctx.filterState?.el?.value       || '',
    };
}

function _buildDomain(filters, extraDomain = []) {
    const domain = [...extraDomain];
    if (filters.tahun)      domain.push(['sumber_dokumen_id.tahun', '=',  filters.tahun]);
    if (filters.dateFrom)   domain.push(['tanggal_kejadian',        '>=', filters.dateFrom + ' 00:00:00']);
    if (filters.dateTo)     domain.push(['tanggal_kejadian',        '<=', filters.dateTo   + ' 23:59:59']);
    if (filters.kategoriId) domain.push(['kategori_id',             '=',  filters.kategoriId]);
    if (filters.stateValue) domain.push(['state',                   '=',  filters.stateValue]);
    return domain;
}

function _periodeLabel(filters) {
    const parts = [];
    if (filters.tahun)    parts.push(`Tahun ${filters.tahun}`);
    if (filters.dateFrom) parts.push(`dari ${filters.dateFrom}`);
    if (filters.dateTo)   parts.push(`s/d ${filters.dateTo}`);
    return parts.length ? parts.join(', ') : 'Semua Periode';
}

// ── Parse read_group results ─────────────────────────────────────────────────
function _buildKasusMap(groups) {
    const m = {};
    for (const g of groups) {
        if (!g.kabupaten_id) continue;
        const id = Array.isArray(g.kabupaten_id) ? g.kabupaten_id[0] : g.kabupaten_id;
        m[id] = g.__count || 0;
    }
    return m;
}

function _buildKecamatanKasusMap(groups) {
    const m = {};
    for (const g of groups) {
        if (!g.kecamatan_id) continue;
        const id = Array.isArray(g.kecamatan_id) ? g.kecamatan_id[0] : g.kecamatan_id;
        m[id] = g.__count || 0;
    }
    return m;
}

function _buildDesaKasusMap(groups) {
    const m = {};
    for (const g of groups) {
        if (!g.desa_id) continue;
        const id = Array.isArray(g.desa_id) ? g.desa_id[0] : g.desa_id;
        m[id] = g.__count || 0;
    }
    return m;
}

// ── Marker ───────────────────────────────────────────────────────────────────
async function _loadKamMarkers(ctx, domain) {
    ctx.markerLayerGroup.clearLayers();

    // Ambil icon dari setiap kategori kamtibmas
    const categories = await ctx.orm.searchRead('petadigi.kategori_kamtibmas', [], ['id', 'icon']);
    const categoryIconMap = {};
    for (const cat of categories) {
        categoryIconMap[cat.id] = cat.icon || 'fa-exclamation-circle';
    }

    const records = await ctx.orm.searchRead(
        'petadigi.kasus_menonjol',
        [['latitude', '!=', 0], ['longitude', '!=', 0], ...domain],
        ['id', 'no_lp', 'latitude', 'longitude', 'jenis_tkp_id',
         'kategori_id', 'modus_operandi_id', 'tersangka', 'state', 'tanggal_kejadian'],
    );

    records.forEach(r => {
        const statusColor    = r.state === 'SELESAI' ? '#27ae60' : '#e67e22';
        const statusLabel    = r.state === 'SELESAI' ? 'Selesai' : 'Proses';
        const kategori       = Array.isArray(r.kategori_id)        ? r.kategori_id[1]        : '-';
        const jenisTkp       = Array.isArray(r.jenis_tkp_id)       ? r.jenis_tkp_id[1]       : '-';
        const modusOperandi  = Array.isArray(r.modus_operandi_id)  ? r.modus_operandi_id[1]  : '-';
        const tersangka      = r.tersangka ? r.tersangka.slice(0, 60) + (r.tersangka.length > 60 ? '…' : '') : '-';
        const tglStr         = r.tanggal_kejadian;
        const tglKejadian    = tglStr
            ? new Date(tglStr.replace(' ', 'T') + 'Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
            : '-';

        const katId  = Array.isArray(r.kategori_id) ? r.kategori_id[0] : null;
        const faIcon = (katId && categoryIconMap[katId]) ? categoryIconMap[katId] : 'fa-exclamation-circle';

        const icon = L.divIcon({
            className: '',
            html: `<div class="petadigi-kam-marker" style="border-color:${statusColor};">
                       <i class="fa ${faIcon}" style="color:${statusColor};"></i>
                   </div>`,
            iconSize:   [24, 24],
            iconAnchor: [12, 12],
        });

        const marker = L.marker([r.latitude, r.longitude], { icon });
        marker.bindPopup(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#1a5276;">
                    <i class="fa ${faIcon}"></i>
                    <strong>${r.no_lp}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-calendar"></i> Tanggal</td><td><strong>${tglKejadian}</strong></td></tr>
                        <tr><td><i class="fa fa-map-marker"></i> Jenis TKP</td><td><strong>${jenisTkp}</strong></td></tr>
                        <tr><td><i class="fa fa-tag"></i> Kategori</td><td><strong>${kategori}</strong></td></tr>
                        <tr><td><i class="fa fa-random"></i> Modus</td><td><strong>${modusOperandi}</strong></td></tr>
                        <tr><td><i class="fa fa-user"></i> Tersangka</td><td><strong>${tersangka}</strong></td></tr>
                        <tr><td><i class="fa fa-flag"></i> Status</td><td><strong style="color:${statusColor};">${statusLabel}</strong></td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#1a5276;" id="btn-detail-kam-${r.id}">
                        <i class="fa fa-external-link"></i> Lihat Detail
                    </button>
                </div>
            </div>
        `, { maxWidth: 300, className: 'petadigi-leaflet-popup' });

        marker.on('popupopen', () => {
            setTimeout(() => {
                const btn = document.getElementById(`btn-detail-kam-${r.id}`);
                if (btn) btn.addEventListener('click', () => ctx.action.doAction({
                    type: 'ir.actions.act_window',
                    res_model: 'petadigi.kasus_menonjol',
                    res_id: r.id,
                    views: [[false, 'form']],
                    target: 'current',
                }));
            }, 0);
        });

        ctx.markerLayerGroup.addLayer(marker);
    });
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — KABUPATEN
// ════════════════════════════════════════════════════════════════════════════
export async function loadModeKam(ctx) {
    addKamLegend(ctx);
    ctx.currentLevel = 'kabupaten';

    const filters    = _getActiveFilters(ctx);
    const baseDomain = filters.kabupatenId ? [['kabupaten_id', '=', filters.kabupatenId]] : [];

    try {
        const groups = await ctx.orm.call(
            'petadigi.kasus_menonjol',
            'read_group',
            [_buildDomain(filters, baseDomain), ['kabupaten_id'], ['kabupaten_id']],
            { lazy: false }
        );
        const kasusMap = _buildKasusMap(groups);

        const kabDomain = filters.kabupatenId ? [['id', '=', filters.kabupatenId]] : [];
        const records   = await ctx.orm.searchRead(
            'petadigi.kabupaten',
            kabDomain,
            ['id', 'code', 'name', 'type', 'kecamatan_ids', 'geometry'],
        );

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah = kasusMap[r.id] || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name, type: r.type,
                            jumlah_kecamatan: r.kecamatan_ids ? r.kecamatan_ids.length : 0,
                            jumlah_kasus: jumlah,
                            color: getKamColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kabupaten: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) return;

        const geoLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.75 }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const label = L.marker(layer.getBounds().getCenter(), {
                        icon: L.divIcon({ className: 'kabupaten-label', html: `<span>${props.name}</span>`, iconSize: null }),
                        interactive: false, zIndexOffset: 100,
                    });
                    ctx.kabupatenLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.9 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.75 }); });
                layer.on('click',     e  => _showKamKabupatenPopup(ctx, e, props, layer, filters));
            }
        });

        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx.map.fitBounds(geoLayer.getBounds());
        await _loadKamMarkers(ctx, _buildDomain(filters, baseDomain));
    } catch (error) {
        console.error('Gagal memuat data kasus menonjol:', error);
    }
}

// ── Popup Kabupaten ──────────────────────────────────────────────────────────
function _showKamKabupatenPopup(ctx, e, props, layer, filters) {
    const tipeLabel  = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
    const kasusLabel = props.jumlah_kasus > 0
        ? `<strong style="color:${props.color};">${props.jumlah_kasus.toLocaleString('id-ID')} Kasus</strong>`
        : `<strong style="color:#27ae60;">Tidak Ada Kasus</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#1a5276;">
                    <i class="fa fa-shield"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-calendar"></i> Periode</td><td><strong>${_periodeLabel(filters)}</strong></td></tr>
                        <tr><td><i class="fa fa-list"></i> Kecamatan</td><td><strong>${props.jumlah_kecamatan} Kecamatan</strong></td></tr>
                        <tr><td><i class="fa fa-exclamation-circle" style="color:#2471a3;"></i> Kasus</td><td>${kasusLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#1a5276;" id="btn-kam-kec-${props.id}">
                        <i class="fa fa-search-plus"></i> Lihat Detail Kecamatan
                    </button>
                </div>
            </div>
        `);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-kam-kec-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._updateBreadcrumb(`<i class="fa fa-shield"></i> Peta Kasus Menonjol`);
                    ctx._appendBreadcrumb(`<i class="fa fa-map-marker"></i> ${tipeLabel} ${props.name}`);
                    drillDownKamKecamatan(ctx, props, layer, filters);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — KECAMATAN
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownKamKecamatan(ctx, kabProps, kabLayer, filters) {
    ctx.currentLevel = 'kecamatan';
    ctx.kabupatenLayerGroup.clearLayers();
    ctx.kabupatenLabelGroup.clearLayers();
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();

    ctx.map.fitBounds(kabLayer.getBounds(), { padding: [40, 40] });

    try {
        const domain = _buildDomain(filters, [['kabupaten_id', '=', kabProps.id]]);
        const groups = await ctx.orm.call(
            'petadigi.kasus_menonjol',
            'read_group',
            [domain, ['kecamatan_id'], ['kecamatan_id']],
            { lazy: false }
        );
        const kasusMap = _buildKecamatanKasusMap(groups);

        const records = await ctx.orm.searchRead(
            'petadigi.kecamatan',
            [['kabupaten_id', '=', kabProps.id]],
            ['id', 'code', 'name', 'desa_ids', 'geometry'],
        );

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah = kasusMap[r.id] || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name,
                            jumlah_desa: r.desa_ids ? r.desa_ids.length : 0,
                            jumlah_kasus: jumlah,
                            color: getKamColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kecamatan: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) {
            await loadModeKam(ctx);
            return;
        }

        const geoLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.75 }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const label = L.marker(layer.getBounds().getCenter(), {
                        icon: L.divIcon({ className: 'kabupaten-label', html: `<span>${props.name}</span>`, iconSize: null }),
                        interactive: false, zIndexOffset: 100,
                    });
                    ctx.kecamatanLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.9 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.75 }); });
                layer.on('click',     e  => _showKamKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer));
            }
        });

        ctx.kecamatanLayerGroup.addLayer(geoLayer);
        await _loadKamMarkers(ctx, _buildDomain(filters, [['kabupaten_id', '=', kabProps.id]]));
        _addKamBackButton(ctx, 'kabupaten', { kabProps, kabLayer, filters });

        // Sinkronkan dropdown kabupaten + KPI + grafik ke scope kabupaten yang dipilih
        ctx.drillKabupatenId = kabProps.id;
        ctx.drillKecamatanId = null;
        if (ctx.filterKabupaten?.el) ctx.filterKabupaten.el.value = String(kabProps.id);
        ctx._updateFilterSummary(ctx.currentMode);
        ctx._updateKpiCards(ctx.currentMode);
        ctx._updateCharts(ctx.currentMode);
    } catch (error) {
        console.error('Gagal memuat data kecamatan KAM:', error);
    }
}

// ── Popup Kecamatan ──────────────────────────────────────────────────────────
function _showKamKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer) {
    const kasusLabel = props.jumlah_kasus > 0
        ? `<strong style="color:${props.color};">${props.jumlah_kasus.toLocaleString('id-ID')} Kasus</strong>`
        : `<strong style="color:#27ae60;">Tidak Ada Kasus</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#2471a3;">
                    <i class="fa fa-map"></i>
                    <strong>Kec. ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-calendar"></i> Periode</td><td><strong>${_periodeLabel(filters)}</strong></td></tr>
                        <tr><td><i class="fa fa-home"></i> Desa/Kel.</td><td><strong>${props.jumlah_desa} Desa/Kelurahan</strong></td></tr>
                        <tr><td><i class="fa fa-exclamation-circle" style="color:#2471a3;"></i> Kasus</td><td>${kasusLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#2471a3;" id="btn-kam-desa-${props.id}">
                        <i class="fa fa-search-plus"></i> Lihat Detail Desa/Kelurahan
                    </button>
                </div>
            </div>
        `);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-kam-desa-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
                    drillDownKamDesa(ctx, props, layer, filters, kabProps, kabLayer);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — DESA
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownKamDesa(ctx, kecProps, kecLayer, filters, kabProps, kabLayer) {
    ctx.currentLevel = 'desa';
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();
    ctx.desaLayerGroup.clearLayers();
    ctx.desaLabelGroup.clearLayers();

    ctx.map.fitBounds(kecLayer.getBounds(), { padding: [40, 40] });

    try {
        const domain = _buildDomain(filters, [['kecamatan_id', '=', kecProps.id]]);
        const groups = await ctx.orm.call(
            'petadigi.kasus_menonjol',
            'read_group',
            [domain, ['desa_id'], ['desa_id']],
            { lazy: false }
        );
        const kasusMap = _buildDesaKasusMap(groups);

        const records = await ctx.orm.searchRead(
            'petadigi.desa',
            [['kecamatan_id', '=', kecProps.id]],
            ['id', 'code', 'name', 'type', 'geometry'],
        );

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah = kasusMap[r.id] || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name, type: r.type,
                            jumlah_kasus: jumlah,
                            color: getKamColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry desa: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) {
            drillDownKamKecamatan(ctx, kabProps, kabLayer, filters);
            return;
        }

        const geoLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.75 }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const label = L.marker(layer.getBounds().getCenter(), {
                        icon: L.divIcon({ className: 'kabupaten-label', html: `<span>${props.name}</span>`, iconSize: null }),
                        interactive: false, zIndexOffset: 100,
                    });
                    ctx.desaLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.9 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.75 }); });
                layer.on('click',     e  => _showKamDesaPopup(ctx, e, props, filters));
            }
        });

        ctx.desaLayerGroup.addLayer(geoLayer);
        await _loadKamMarkers(ctx, _buildDomain(filters, [['kecamatan_id', '=', kecProps.id]]));
        _addKamBackButton(ctx, 'kecamatan', { kecProps, kecLayer, filters, kabProps, kabLayer });

        // Sinkronkan KPI dan grafik ke scope kecamatan yang dipilih
        ctx.drillKecamatanId = kecProps.id;
        ctx._updateKpiCards(ctx.currentMode);
        ctx._updateCharts(ctx.currentMode);
    } catch (error) {
        console.error('Gagal memuat data desa KAM:', error);
    }
}

// ── Popup Desa ───────────────────────────────────────────────────────────────
function _showKamDesaPopup(ctx, e, props, filters) {
    const tipeLabel  = props.type === 'KELURAHAN' ? 'Kelurahan' : 'Desa';
    const kasusLabel = props.jumlah_kasus > 0
        ? `<strong style="color:${props.color};">${props.jumlah_kasus.toLocaleString('id-ID')} Kasus</strong>`
        : `<strong style="color:#27ae60;">Tidak Ada Kasus</strong>`;

    L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#1a5276;">
                    <i class="fa fa-home"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-tag"></i> Tipe</td><td><strong>${tipeLabel}</strong></td></tr>
                        <tr><td><i class="fa fa-calendar"></i> Periode</td><td><strong>${_periodeLabel(filters)}</strong></td></tr>
                        <tr><td><i class="fa fa-exclamation-circle" style="color:#2471a3;"></i> Kasus</td><td>${kasusLabel}</td></tr>
                    </table>
                </div>
            </div>
        `)
        .openOn(ctx.map);
}

// ── Back Button ──────────────────────────────────────────────────────────────
function _addKamBackButton(ctx, targetLevel, backCtx) {
    if (ctx.backButton) { ctx.backButton.remove(); ctx.backButton = null; }

    const labelMap = {
        kabupaten: 'Kembali ke Peta Kabupaten',
        kecamatan: 'Kembali ke Peta Kecamatan',
    };

    const BackControl = L.Control.extend({
        onAdd: () => {
            const btn = L.DomUtil.create('button', 'petadigi-btn-back');
            btn.innerHTML = `<i class="fa fa-arrow-left"></i> ${labelMap[targetLevel] || 'Kembali'}`;
            L.DomEvent.on(btn, 'click', async (ev) => {
                L.DomEvent.stopPropagation(ev);
                ctx.map.closePopup();
                if (ctx.backButton) { ctx.backButton.remove(); ctx.backButton = null; }

                if (targetLevel === 'kabupaten') {
                    ctx.kecamatanLayerGroup.clearLayers();
                    ctx.kecamatanLabelGroup.clearLayers();
                    ctx.drillKabupatenId = null;
                    ctx.drillKecamatanId = null;
                    if (ctx.filterKabupaten?.el) ctx.filterKabupaten.el.value = '';
                    ctx._updateBreadcrumb(`<i class="fa fa-shield"></i> Peta Kasus Menonjol`);
                    ctx._updateFilterSummary(ctx.currentMode);
                    await loadModeKam(ctx);
                    ctx._updateKpiCards(ctx.currentMode);
                    ctx._updateCharts(ctx.currentMode);
                } else if (targetLevel === 'kecamatan' && backCtx) {
                    ctx.desaLayerGroup.clearLayers();
                    ctx.desaLabelGroup.clearLayers();
                    ctx.drillKecamatanId = null;
                    const items = ctx.breadcrumbRef.el.querySelectorAll('.petadigi-breadcrumb-item');
                    if (items.length > 1) {
                        items[items.length - 1].previousSibling?.remove();
                        items[items.length - 1].remove();
                    }
                    await drillDownKamKecamatan(ctx, backCtx.kabProps, backCtx.kabLayer, backCtx.filters);
                }
            });
            return btn;
        },
        onRemove: () => {}
    });

    ctx.backButton = new BackControl({ position: 'topleft' });
    ctx.backButton.addTo(ctx.map);
}
