/** @odoo-module **/

/**
 * Peta Lokasi Penting
 * Choropleth per kabupaten/kecamatan/desa — warna ungu berdasarkan jumlah lokasi.
 */

// ── Skala warna ungu (berbeda dari semua peta lain) ──────────────────────────
const LOKASI_COLORS = [
    { min: 51, max: Infinity, color: '#4a235a', label: '> 50 Lokasi'    },
    { min: 21, max: 50,       color: '#7d3c98', label: '21 – 50 Lokasi' },
    { min: 11, max: 20,       color: '#a569bd', label: '11 – 20 Lokasi' },
    { min:  1, max: 10,       color: '#d2b4de', label: '1 – 10 Lokasi'  },
    { min:  0, max:  0,       color: '#f4ecf7', label: 'Tidak Ada Lokasi' },
];

function getLokasiColor(jumlah) {
    for (const tier of LOKASI_COLORS) {
        if (jumlah >= tier.min) return tier.color;
    }
    return '#f4ecf7';
}

// ── Legend ───────────────────────────────────────────────────────────────────
export function addLokasiLegend(ctx) {
    if (ctx.lokasiLegend) { ctx.lokasiLegend.remove(); ctx.lokasiLegend = null; }
    const LokasiLegend = L.Control.extend({
        onAdd() {
            const div = L.DomUtil.create('div', 'petadigi-legend petadigi-legend--lokasi');
            div.innerHTML = `
                <div class="petadigi-legend-title">
                    <i class="fa fa-map-marker"></i> Legenda Lokasi Penting
                </div>
                <ul class="petadigi-legend-list">
                    ${LOKASI_COLORS.map(t => `
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
    ctx.lokasiLegend = new LokasiLegend({ position: 'bottomright' });
    ctx.lokasiLegend.addTo(ctx.map);
}

export function removeLokasiLegend(ctx) {
    if (ctx.lokasiLegend) { ctx.lokasiLegend.remove(); ctx.lokasiLegend = null; }
}

// ── Helpers filter ───────────────────────────────────────────────────────────
// lokasi_penting tidak punya tanggal_kejadian / sumber_dokumen_id
function _getActiveFilters(ctx) {
    return {
        kabupatenId: ctx.filterKabupaten?.el?.value ? parseInt(ctx.filterKabupaten.el.value) : null,
        kategoriId:  ctx.filterKategori?.el?.value  ? parseInt(ctx.filterKategori.el.value)  : null,
        stateValue:  ctx.filterState?.el?.value     || '',
    };
}

function _buildDomain(filters, extraDomain = []) {
    const domain = [...extraDomain];
    if (filters.kategoriId) domain.push(['kategori_id', '=', filters.kategoriId]);
    if (filters.stateValue) domain.push(['state',       '=', filters.stateValue]);
    return domain;
}

function _buildKasusMap(groups, field) {
    const m = {};
    for (const g of groups) {
        if (!g[field]) continue;
        const id = Array.isArray(g[field]) ? g[field][0] : g[field];
        m[id] = g.__count || 0;
    }
    return m;
}

// ── Marker ───────────────────────────────────────────────────────────────────
async function _loadLokasiMarkers(ctx, domain) {
    ctx.markerLayerGroup.clearLayers();

    // Ambil icon dari setiap kategori lokasi
    const categories = await ctx.orm.searchRead('petadigi.kategori_lokasi', [], ['id', 'icon']);
    const categoryIconMap = {};
    for (const cat of categories) {
        categoryIconMap[cat.id] = cat.icon || 'fa-map-marker';
    }

    const records = await ctx.orm.searchRead(
        'petadigi.lokasi_penting',
        [['latitude', '!=', 0], ['longitude', '!=', 0], ...domain],
        ['id', 'code', 'nama_lokasi', 'latitude', 'longitude',
         'kategori_id', 'alamat_lengkap', 'hp_kontak', 'keterangan', 'state'],
    );

    records.forEach(r => {
        const stateColor = r.state === 'AKTIF' ? '#27ae60' : '#c0392b';
        const stateLabel = r.state === 'AKTIF' ? 'Aktif' : 'Non Aktif';
        const kategori   = Array.isArray(r.kategori_id) ? r.kategori_id[1] : '-';
        const alamat     = r.alamat_lengkap ? r.alamat_lengkap.slice(0, 60) + (r.alamat_lengkap.length > 60 ? '…' : '') : '-';
        const keterangan = r.keterangan ? r.keterangan.slice(0, 60) + (r.keterangan.length > 60 ? '…' : '') : '-';

        const katId  = Array.isArray(r.kategori_id) ? r.kategori_id[0] : null;
        const faIcon = (katId && categoryIconMap[katId]) ? categoryIconMap[katId] : 'fa-map-marker';

        const icon = L.divIcon({
            className: '',
            html: `<div class="petadigi-bencana-marker" style="border-color:${stateColor};">
                       <i class="fa ${faIcon}" style="color:${stateColor};"></i>
                   </div>`,
            iconSize:   [24, 24],
            iconAnchor: [12, 12],
        });

        const marker = L.marker([r.latitude, r.longitude], { icon });
        marker.bindPopup(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#6c3483;">
                    <i class="fa ${faIcon}"></i>
                    <strong>${r.code}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-building"></i> Nama</td><td><strong>${r.nama_lokasi || '-'}</strong></td></tr>
                        <tr><td><i class="fa fa-list"></i> Kategori</td><td><strong>${kategori}</strong></td></tr>
                        <tr><td><i class="fa fa-map"></i> Alamat</td><td><strong>${alamat}</strong></td></tr>
                        <tr><td><i class="fa fa-phone"></i> Kontak</td><td><strong>${r.hp_kontak || '-'}</strong></td></tr>
                        <tr><td><i class="fa fa-info-circle"></i> Keterangan</td><td><strong>${keterangan}</strong></td></tr>
                        <tr><td><i class="fa fa-flag"></i> Status</td><td><strong style="color:${stateColor};">${stateLabel}</strong></td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#6c3483;" id="btn-detail-lokasi-${r.id}">
                        <i class="fa fa-external-link"></i> Lihat Detail
                    </button>
                </div>
            </div>
        `, { maxWidth: 300, className: 'petadigi-leaflet-popup' });

        marker.on('popupopen', () => {
            setTimeout(() => {
                const btn = document.getElementById(`btn-detail-lokasi-${r.id}`);
                if (btn) btn.addEventListener('click', () => ctx.action.doAction({
                    type: 'ir.actions.act_window',
                    res_model: 'petadigi.lokasi_penting',
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
export async function loadModeLokasi(ctx) {
    const ver = ctx._modeVersion;
    addLokasiLegend(ctx);
    ctx.currentLevel = 'kabupaten';

    const filters    = _getActiveFilters(ctx);
    const baseDomain = filters.kabupatenId ? [['kabupaten_id', '=', filters.kabupatenId]] : [];

    try {
        const kabDomain = filters.kabupatenId ? [['id', '=', filters.kabupatenId]] : [];
        const [groups, records] = await Promise.all([
            ctx.orm.call(
                'petadigi.lokasi_penting',
                'read_group',
                [_buildDomain(filters, baseDomain), ['kabupaten_id'], ['kabupaten_id']],
                { lazy: false }
            ),
            ctx.orm.searchRead(
                'petadigi.kabupaten',
                kabDomain,
                ['id', 'code', 'name', 'type', 'kecamatan_ids', 'geometry'],
            ),
        ]);
        const kasusMap = _buildKasusMap(groups, 'kabupaten_id');

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
                            jumlah_lokasi: jumlah,
                            color: getLokasiColor(jumlah),
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
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.45 }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const bounds = layer.getBounds();
                    const label = L.marker(bounds.getCenter(), {
                        icon: L.divIcon({ className: 'kabupaten-label', html: `<span>${props.name}</span>`, iconSize: null }),
                        interactive: false, zIndexOffset: -100,
                    });
                    label._polygonBounds = bounds;
                    ctx.kabupatenLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.65 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.45 }); });
                layer.on('click',     e  => _showLokasiKabupatenPopup(ctx, e, props, layer, filters));
            }
        });

        if (ctx._modeVersion !== ver) return;
        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx.map.fitBounds(geoLayer.getBounds());
        await _loadLokasiMarkers(ctx, _buildDomain(filters, baseDomain));
    } catch (error) {
        console.error('Gagal memuat data lokasi penting:', error);
    }
}

// ── Popup Kabupaten ──────────────────────────────────────────────────────────
function _showLokasiKabupatenPopup(ctx, e, props, layer, filters) {
    const tipeLabel   = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
    const lokasiLabel = props.jumlah_lokasi > 0
        ? `<strong style="color:${props.color === '#f4ecf7' ? '#7d3c98' : props.color};">${props.jumlah_lokasi.toLocaleString('id-ID')} Lokasi</strong>`
        : `<strong style="color:#999;">Tidak Ada Lokasi</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#6c3483;">
                    <i class="fa fa-map-marker"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-list"></i> Kecamatan</td><td><strong>${props.jumlah_kecamatan} Kecamatan</strong></td></tr>
                        <tr><td><i class="fa fa-map-marker" style="color:#8e44ad;"></i> Lokasi</td><td>${lokasiLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#6c3483;" id="btn-lokasi-kec-${props.id}">
                        <i class="fa fa-search-plus"></i> Lihat Detail Kecamatan
                    </button>
                </div>
            </div>
        `);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-lokasi-kec-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._updateBreadcrumb(`<i class="fa fa-map-marker"></i> Peta Lokasi Penting`);
                    ctx._appendBreadcrumb(`<i class="fa fa-map-marker"></i> ${tipeLabel} ${props.name}`);
                    drillDownLokasiKecamatan(ctx, props, layer, filters);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — KECAMATAN
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownLokasiKecamatan(ctx, kabProps, kabLayer, filters) {
    ctx.currentLevel = 'kecamatan';
    ctx.kabupatenLayerGroup.clearLayers();
    ctx.kabupatenLabelGroup.clearLayers();
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();

    ctx.map.fitBounds(kabLayer.getBounds(), { padding: [40, 40] });

    try {
        const domain = _buildDomain(filters, [['kabupaten_id', '=', kabProps.id]]);
        const [groups, records] = await Promise.all([
            ctx.orm.call(
                'petadigi.lokasi_penting',
                'read_group',
                [domain, ['kecamatan_id'], ['kecamatan_id']],
                { lazy: false }
            ),
            ctx.orm.searchRead(
                'petadigi.kecamatan',
                [['kabupaten_id', '=', kabProps.id]],
                ['id', 'code', 'name', 'desa_ids', 'geometry'],
            ),
        ]);
        const kasusMap = _buildKasusMap(groups, 'kecamatan_id');

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
                            jumlah_lokasi: jumlah,
                            color: getLokasiColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kecamatan: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) {
            await loadModeLokasi(ctx);
            return;
        }

        const geoLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.45 }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const bounds = layer.getBounds();
                    const label = L.marker(bounds.getCenter(), {
                        icon: L.divIcon({ className: 'kabupaten-label', html: `<span>${props.name}</span>`, iconSize: null }),
                        interactive: false, zIndexOffset: -100,
                    });
                    label._polygonBounds = bounds;
                    ctx.kecamatanLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.65 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.45 }); });
                layer.on('click',     e  => _showLokasiKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer));
            }
        });

        ctx.kecamatanLayerGroup.addLayer(geoLayer);
        await _loadLokasiMarkers(ctx, _buildDomain(filters, [['kabupaten_id', '=', kabProps.id]]));
        _addLokasiBackButton(ctx, 'kabupaten', { kabProps, kabLayer, filters });

        ctx.drillKabupatenId = kabProps.id;
        ctx.drillKecamatanId = null;
        if (ctx.filterKabupaten?.el) ctx.filterKabupaten.el.value = String(kabProps.id);
        ctx._updateFilterSummary(ctx.currentMode);
        ctx._updateKpiCards(ctx.currentMode);
        ctx._updateCharts(ctx.currentMode);
    } catch (error) {
        console.error('Gagal memuat data kecamatan lokasi:', error);
    }
}

// ── Popup Kecamatan ──────────────────────────────────────────────────────────
function _showLokasiKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer) {
    const lokasiLabel = props.jumlah_lokasi > 0
        ? `<strong style="color:${props.color === '#f4ecf7' ? '#7d3c98' : props.color};">${props.jumlah_lokasi.toLocaleString('id-ID')} Lokasi</strong>`
        : `<strong style="color:#999;">Tidak Ada Lokasi</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#7d3c98;">
                    <i class="fa fa-map"></i>
                    <strong>Kec. ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-home"></i> Desa/Kel.</td><td><strong>${props.jumlah_desa} Desa/Kelurahan</strong></td></tr>
                        <tr><td><i class="fa fa-map-marker" style="color:#8e44ad;"></i> Lokasi</td><td>${lokasiLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#7d3c98;" id="btn-lokasi-desa-${props.id}">
                        <i class="fa fa-search-plus"></i> Lihat Detail Desa/Kelurahan
                    </button>
                </div>
            </div>
        `);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-lokasi-desa-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
                    drillDownLokasiKelurahan(ctx, props, layer, filters, kabProps, kabLayer);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — DESA/KELURAHAN
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownLokasiKelurahan(ctx, kecProps, kecLayer, filters, kabProps, kabLayer) {
    ctx.currentLevel = 'desa';
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();
    ctx.desaLayerGroup.clearLayers();
    ctx.desaLabelGroup.clearLayers();

    ctx.map.fitBounds(kecLayer.getBounds(), { padding: [40, 40] });

    try {
        const domain = _buildDomain(filters, [['kecamatan_id', '=', kecProps.id]]);
        const [groups, records] = await Promise.all([
            ctx.orm.call(
                'petadigi.lokasi_penting',
                'read_group',
                [domain, ['desa_id'], ['desa_id']],
                { lazy: false }
            ),
            ctx.orm.searchRead(
                'petadigi.desa',
                [['kecamatan_id', '=', kecProps.id]],
                ['id', 'code', 'name', 'type', 'geometry'],
            ),
        ]);
        const kasusMap = _buildKasusMap(groups, 'desa_id');

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
                            jumlah_lokasi: jumlah,
                            color: getLokasiColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry desa: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) {
            drillDownLokasiKecamatan(ctx, kabProps, kabLayer, filters);
            return;
        }

        const geoLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.45 }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const bounds = layer.getBounds();
                    const label = L.marker(bounds.getCenter(), {
                        icon: L.divIcon({ className: 'kabupaten-label', html: `<span>${props.name}</span>`, iconSize: null }),
                        interactive: false, zIndexOffset: -100,
                    });
                    label._polygonBounds = bounds;
                    ctx.desaLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.65 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.45 }); });
                layer.on('click',     e  => _showLokasiDesaPopup(ctx, e, props));
            }
        });

        ctx.desaLayerGroup.addLayer(geoLayer);
        await _loadLokasiMarkers(ctx, _buildDomain(filters, [['kecamatan_id', '=', kecProps.id]]));
        _addLokasiBackButton(ctx, 'kecamatan', { kecProps, kecLayer, filters, kabProps, kabLayer });

        ctx.drillKecamatanId = kecProps.id;
        ctx._updateKpiCards(ctx.currentMode);
        ctx._updateCharts(ctx.currentMode);
    } catch (error) {
        console.error('Gagal memuat data desa lokasi:', error);
    }
}

// ── Popup Desa ───────────────────────────────────────────────────────────────
function _showLokasiDesaPopup(ctx, e, props) {
    const tipeLabel   = props.type === 'KELURAHAN' ? 'Kelurahan' : 'Desa';
    const lokasiLabel = props.jumlah_lokasi > 0
        ? `<strong style="color:${props.color === '#f4ecf7' ? '#7d3c98' : props.color};">${props.jumlah_lokasi.toLocaleString('id-ID')} Lokasi</strong>`
        : `<strong style="color:#999;">Tidak Ada Lokasi</strong>`;

    L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#6c3483;">
                    <i class="fa fa-home"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-tag"></i> Tipe</td><td><strong>${tipeLabel}</strong></td></tr>
                        <tr><td><i class="fa fa-map-marker" style="color:#8e44ad;"></i> Lokasi</td><td>${lokasiLabel}</td></tr>
                    </table>
                </div>
            </div>
        `)
        .openOn(ctx.map);
}

// ── Back Button ──────────────────────────────────────────────────────────────
function _addLokasiBackButton(ctx, targetLevel, backCtx) {
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
                    ctx._updateBreadcrumb(`<i class="fa fa-map-marker"></i> Peta Lokasi Penting`);
                    ctx._updateFilterSummary(ctx.currentMode);
                    await loadModeLokasi(ctx);
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
                    await drillDownLokasiKecamatan(ctx, backCtx.kabProps, backCtx.kabLayer, backCtx.filters);
                }
            });
            return btn;
        },
        onRemove: () => {}
    });

    ctx.backButton = new BackControl({ position: 'topleft' });
    ctx.backButton.addTo(ctx.map);
}
