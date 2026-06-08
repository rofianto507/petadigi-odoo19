/** @odoo-module **/

/**
 * Peta Kriminal
 * Choropleth kriminalitas per kabupaten/kecamatan — warna berdasarkan jumlah kasus.
 */

// ── Skala warna berdasarkan jumlah kasus ────────────────────────────────────
export const KRIMINAL_COLORS = [
    { min: 2001, max: Infinity, color: '#922b21', label: '> 2.000 Kasus' },
    { min: 1001, max: 2000,    color: '#e74c3c', label: '> 1.000 Kasus' },
    { min:  501, max: 1000,    color: '#e67e22', label: '> 500 Kasus'   },
    { min:    1, max:  500,    color: '#f1c40f', label: '>= 1 Kasus'    },
    { min:    0, max:    0,    color: '#abebc6', label: 'Tidak Ada Kasus' },
];

export function getKriminalColor(jumlah) {
    for (const tier of KRIMINAL_COLORS) {
        if (jumlah >= tier.min) return tier.color;
    }
    return '#abebc6';
}

// ── Legend Control ───────────────────────────────────────────────────────────
export function addKriminalLegend(ctx) {
    if (ctx.kriminalLegend) {
        ctx.kriminalLegend.remove();
        ctx.kriminalLegend = null;
    }

    const KriminalLegend = L.Control.extend({
        onAdd() {
            const div = L.DomUtil.create('div', 'petadigi-legend petadigi-legend--kriminal');
            div.innerHTML = `
                <div class="petadigi-legend-title">
                    <i class="fa fa-exclamation-triangle"></i> Legenda Kriminalitas
                </div>
                <ul class="petadigi-legend-list">
                    ${KRIMINAL_COLORS.map(tier => `
                        <li>
                            <span class="petadigi-legend-swatch" style="background:${tier.color};"></span>
                            <span class="petadigi-legend-label">${tier.label}</span>
                        </li>
                    `).join('')}
                </ul>
            `;
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        },
        onRemove() {}
    });

    ctx.kriminalLegend = new KriminalLegend({ position: 'bottomright' });
    ctx.kriminalLegend.addTo(ctx.map);
}

export function removeKriminalLegend(ctx) {
    if (ctx.kriminalLegend) {
        ctx.kriminalLegend.remove();
        ctx.kriminalLegend = null;
    }
}

// ── Helpers: baca nilai filter aktif ────────────────────────────────────────
function _getActiveFilters(ctx) {
    return {
        tahun:        ctx.filterTahun?.el?.value        || '',
        kabupatenId:  ctx.filterKabupaten?.el?.value    ? parseInt(ctx.filterKabupaten.el.value)    : null,
        dateFrom:     ctx.activeDateFrom                 || '',
        dateTo:       ctx.activeDateTo                   || '',
        kategoriId:   ctx.filterKategori?.el?.value     ? parseInt(ctx.filterKategori.el.value)     : null,
        subKategoriId:ctx.filterSubKategori?.el?.value  ? parseInt(ctx.filterSubKategori.el.value)  : null,
    };
}

// ── Helper: build domain dari objek filters ──────────────────────────────────
function _buildDomain(filters, extraDomain = []) {
    const domain = [...extraDomain];
    if (filters.tahun)        domain.push(['sumber_dokumen_id.tahun', '=',  filters.tahun]);
    if (filters.dateFrom)     domain.push(['tanggal_kejadian',        '>=', filters.dateFrom + ' 00:00:00']);
    if (filters.dateTo)       domain.push(['tanggal_kejadian',        '<=', filters.dateTo   + ' 23:59:59']);
    if (filters.kategoriId)   domain.push(['kategori_id',             '=',  filters.kategoriId]);
    if (filters.subKategoriId)domain.push(['sub_kategori_id',         '=',  filters.subKategoriId]);
    return domain;
}

// ── Label periode untuk popup ────────────────────────────────────────────────
function _periodeLabel(filters) {
    const parts = [];
    if (filters.tahun)    parts.push(`Tahun ${filters.tahun}`);
    if (filters.dateFrom) parts.push(`dari ${filters.dateFrom}`);
    if (filters.dateTo)   parts.push(`s/d ${filters.dateTo}`);
    return parts.length ? parts.join(', ') : 'Semua Periode';
}

// ── Helper: parse kabupaten_id dari hasil read_group ─────────────────────────
function _buildKasusMap(groups) {
    const kasusMap = {};
    for (const g of groups) {
        if (!g.kabupaten_id) continue;
        const kabId = Array.isArray(g.kabupaten_id) ? g.kabupaten_id[0] : g.kabupaten_id;
        kasusMap[kabId] = g.__count || 0;
    }
    return kasusMap;
}

function _buildKecamatanKasusMap(groups) {
    const kasusMap = {};
    for (const g of groups) {
        if (!g.kecamatan_id) continue;
        const kecId = Array.isArray(g.kecamatan_id) ? g.kecamatan_id[0] : g.kecamatan_id;
        kasusMap[kecId] = g.__count || 0;
    }
    return kasusMap;
}

function _buildDesaKasusMap(groups) {
    const kasusMap = {};
    for (const g of groups) {
        if (!g.desa_id) continue;
        const desaId = Array.isArray(g.desa_id) ? g.desa_id[0] : g.desa_id;
        kasusMap[desaId] = g.__count || 0;
    }
    return kasusMap;
}

// ── Helper: load marker titik koordinat kriminalitas ─────────────────────────
async function _loadKriminalMarkers(ctx, domain) {
    const records = await ctx.orm.searchRead(
        'petadigi.kriminalitas',
        [['latitude', '!=', 0], ['longitude', '!=', 0], ...domain],
        ['id', 'no_lp', 'latitude', 'longitude', 'tempat_kejadian',
         'jenis_tkp_id', 'kategori_id', 'sub_kategori_id', 'status_perkara', 'tanggal_kejadian'],
    );

    records.forEach(r => {
        const statusColor  = r.status_perkara === 'SELESAI' ? '#27ae60' : '#e74c3c';
        const statusLabel  = r.status_perkara === 'SELESAI' ? 'Selesai' : 'Proses';
        const kategori     = Array.isArray(r.kategori_id)     ? r.kategori_id[1]     : '-';
        const subKategori  = Array.isArray(r.sub_kategori_id) ? r.sub_kategori_id[1] : '-';
        const jenisTkp     = Array.isArray(r.jenis_tkp_id)    ? r.jenis_tkp_id[1]    : '-';
        const tglKejadian  = r.tanggal_kejadian
            ? new Date(r.tanggal_kejadian).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
            : '-';

        const icon = L.divIcon({
            className: '',
            html: `<div class="petadigi-crime-marker" style="border-color:${statusColor};">
                       <i class="fa fa-exclamation" style="color:${statusColor};"></i>
                   </div>`,
            iconSize:   [24, 24],
            iconAnchor: [12, 12],
        });

        const marker = L.marker([r.latitude, r.longitude], { icon });

        marker.bindPopup(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#922b21;">
                    <i class="fa fa-map-pin"></i>
                    <strong>${r.no_lp}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr>
                            <td><i class="fa fa-calendar"></i> Tanggal</td>
                            <td><strong>${tglKejadian}</strong></td>
                        </tr>
                        <tr>
                            <td><i class="fa fa-map-marker"></i> TKP</td>
                            <td><strong>${r.tempat_kejadian || '-'}</strong></td>
                        </tr>
                        <tr>
                            <td><i class="fa fa-tag"></i> Jenis TKP</td>
                            <td><strong>${jenisTkp}</strong></td>
                        </tr>
                        <tr>
                            <td><i class="fa fa-list"></i> Kategori</td>
                            <td><strong>${kategori}</strong></td>
                        </tr>
                        <tr>
                            <td><i class="fa fa-sitemap"></i> Sub Kategori</td>
                            <td><strong>${subKategori}</strong></td>
                        </tr>
                        <tr>
                            <td><i class="fa fa-flag"></i> Status</td>
                            <td><strong style="color:${statusColor};">${statusLabel}</strong></td>
                        </tr>
                    </table>
                </div>
            </div>
        `, { maxWidth: 280, className: 'petadigi-leaflet-popup' });

        ctx.markerLayerGroup.addLayer(marker);
    });
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — KABUPATEN
// ════════════════════════════════════════════════════════════════════════════
export async function loadModeKriminal(ctx) {
    addKriminalLegend(ctx);
    ctx.currentLevel = 'kabupaten';

    const filters = _getActiveFilters(ctx);
    const baseDomain = filters.kabupatenId ? [['kabupaten_id', '=', filters.kabupatenId]] : [];

    try {
        const groups = await ctx.orm.call(
            'petadigi.kriminalitas',
            'read_group',
            [_buildDomain(filters, baseDomain), ['kabupaten_id'], ['kabupaten_id']],
            { lazy: false }
        );
        const kasusMap = _buildKasusMap(groups);

        const kabDomain = filters.kabupatenId ? [['id', '=', filters.kabupatenId]] : [];
        const records = await ctx.orm.searchRead(
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
                        type: "Feature",
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name, type: r.type,
                            jumlah_kecamatan: r.kecamatan_ids ? r.kecamatan_ids.length : 0,
                            jumlah_kasus: jumlah,
                            color: getKriminalColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kabupaten: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (features.length === 0) return;

        const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
            style: (feature) => ({
                color: '#555555', weight: 1.5, opacity: 1,
                fillColor: feature.properties.color, fillOpacity: 0.75,
            }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const center = layer.getBounds().getCenter();
                    const label = L.marker(center, {
                        icon: L.divIcon({
                            className: 'kabupaten-label',
                            html: `<span>${props.name}</span>`,
                            iconSize: null,
                        }),
                        interactive: false,
                        zIndexOffset: 100,
                    });
                    ctx.kabupatenLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.9 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.75 }); });
                layer.on('click', (e) => _showKriminalKabupatenPopup(ctx, e, props, layer, filters));
            }
        });

        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx.map.fitBounds(geoLayer.getBounds());
        await _loadKriminalMarkers(ctx, _buildDomain(filters, baseDomain));
    } catch (error) {
        console.error("Gagal memuat data kriminalitas:", error);
    }
}

// ── Popup Kabupaten ──────────────────────────────────────────────────────────
function _showKriminalKabupatenPopup(ctx, e, props, layer, filters) {
    const tipeLabel  = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
    const kasusLabel = props.jumlah_kasus > 0
        ? `<strong style="color:${props.color};">${props.jumlah_kasus.toLocaleString('id-ID')} Kasus</strong>`
        : `<strong style="color:#27ae60;">Tidak Ada Kasus</strong>`;

    const popupContent = `
        <div class="petadigi-popup">
            <div class="petadigi-popup-header" style="background:#922b21;">
                <i class="fa fa-exclamation-triangle"></i>
                <strong>${tipeLabel} ${props.name}</strong>
            </div>
            <div class="petadigi-popup-body">
                <table>
                    <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                    <tr><td><i class="fa fa-calendar"></i> Periode</td><td><strong>${_periodeLabel(filters)}</strong></td></tr>
                    <tr><td><i class="fa fa-list"></i> Kecamatan</td><td><strong>${props.jumlah_kecamatan} Kecamatan</strong></td></tr>
                    <tr><td><i class="fa fa-exclamation-circle" style="color:#e74c3c;"></i> Kasus</td><td>${kasusLabel}</td></tr>
                </table>
            </div>
            <div class="petadigi-popup-footer">
                <button class="petadigi-btn-detail" style="background:#922b21;" id="btn-kriminal-kec-${props.id}">
                    <i class="fa fa-search-plus"></i> Lihat Detail Kecamatan
                </button>
            </div>
        </div>
    `;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(popupContent);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-kriminal-kec-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._updateBreadcrumb(`<i class="fa fa-exclamation-triangle"></i> Peta Kriminal`);
                    ctx._appendBreadcrumb(`<i class="fa fa-map-marker"></i> ${tipeLabel} ${props.name}`);
                    drillDownKriminalKecamatan(ctx, props, layer, filters);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — KECAMATAN
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownKriminalKecamatan(ctx, kabProps, kabLayer, filters) {
    ctx.currentLevel = 'kecamatan';
    ctx.kabupatenLayerGroup.clearLayers();
    ctx.kabupatenLabelGroup.clearLayers();
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();

    ctx.map.fitBounds(kabLayer.getBounds(), { padding: [40, 40] });

    try {
        const domain = _buildDomain(filters, [['kabupaten_id', '=', kabProps.id]]);
        const groups = await ctx.orm.call(
            'petadigi.kriminalitas',
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
                        type: "Feature",
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name,
                            jumlah_desa: r.desa_ids ? r.desa_ids.length : 0,
                            jumlah_kasus: jumlah,
                            color: getKriminalColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kecamatan: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (features.length === 0) {
            console.warn('[drillDownKriminalKecamatan] Tidak ada kecamatan dengan geometry.');
            await loadModeKriminal(ctx);
            return;
        }

        const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
            style: (feature) => ({
                color: '#555555', weight: 1.5, opacity: 1,
                fillColor: feature.properties.color, fillOpacity: 0.75,
            }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const center = layer.getBounds().getCenter();
                    const label = L.marker(center, {
                        icon: L.divIcon({
                            className: 'kabupaten-label',
                            html: `<span>${props.name}</span>`,
                            iconSize: null,
                        }),
                        interactive: false,
                        zIndexOffset: 100,
                    });
                    ctx.kecamatanLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.9 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.75 }); });
                layer.on('click', (e) => _showKriminalKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer));
            }
        });

        ctx.kecamatanLayerGroup.addLayer(geoLayer);
        await _loadKriminalMarkers(ctx, _buildDomain(filters, [['kabupaten_id', '=', kabProps.id]]));
        _addKriminalBackButton(ctx, 'kabupaten', { kabProps, kabLayer, filters });

    } catch (error) {
        console.error("Gagal memuat data kecamatan kriminal:", error);
    }
}

// ── Popup Kecamatan ──────────────────────────────────────────────────────────
function _showKriminalKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer) {
    const kasusLabel = props.jumlah_kasus > 0
        ? `<strong style="color:${props.color};">${props.jumlah_kasus.toLocaleString('id-ID')} Kasus</strong>`
        : `<strong style="color:#27ae60;">Tidak Ada Kasus</strong>`;

    const popupContent = `
        <div class="petadigi-popup">
            <div class="petadigi-popup-header" style="background:#c0392b;">
                <i class="fa fa-map"></i>
                <strong>Kec. ${props.name}</strong>
            </div>
            <div class="petadigi-popup-body">
                <table>
                    <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                    <tr><td><i class="fa fa-calendar"></i> Periode</td><td><strong>${_periodeLabel(filters)}</strong></td></tr>
                    <tr><td><i class="fa fa-home"></i> Desa/Kel.</td><td><strong>${props.jumlah_desa} Desa/Kelurahan</strong></td></tr>
                    <tr><td><i class="fa fa-exclamation-circle" style="color:#e74c3c;"></i> Kasus</td><td>${kasusLabel}</td></tr>
                </table>
            </div>
            <div class="petadigi-popup-footer">
                <button class="petadigi-btn-detail" style="background:#c0392b;" id="btn-kriminal-desa-${props.id}">
                    <i class="fa fa-search-plus"></i> Lihat Detail Desa/Kelurahan
                </button>
            </div>
        </div>
    `;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(popupContent);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-kriminal-desa-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
                    drillDownKriminalDesa(ctx, props, layer, filters, kabProps, kabLayer);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — DESA
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownKriminalDesa(ctx, kecProps, kecLayer, filters, kabProps, kabLayer) {
    ctx.currentLevel = 'desa';
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();
    ctx.desaLayerGroup.clearLayers();
    ctx.desaLabelGroup.clearLayers();

    ctx.map.fitBounds(kecLayer.getBounds(), { padding: [40, 40] });

    try {
        const domain = _buildDomain(filters, [['kecamatan_id', '=', kecProps.id]]);
        const groups = await ctx.orm.call(
            'petadigi.kriminalitas',
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
                        type: "Feature",
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name, type: r.type,
                            jumlah_kasus: jumlah,
                            color: getKriminalColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry desa: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (features.length === 0) {
            console.warn('[drillDownKriminalDesa] Tidak ada desa dengan geometry.');
            drillDownKriminalKecamatan(ctx, kabProps, kabLayer, filters);
            return;
        }

        const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
            style: (feature) => ({
                color: '#555555', weight: 1.5, opacity: 1,
                fillColor: feature.properties.color, fillOpacity: 0.75,
            }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const center = layer.getBounds().getCenter();
                    const label = L.marker(center, {
                        icon: L.divIcon({
                            className: 'kabupaten-label',
                            html: `<span>${props.name}</span>`,
                            iconSize: null,
                        }),
                        interactive: false,
                        zIndexOffset: 100,
                    });
                    ctx.desaLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.9 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.75 }); });
                layer.on('click', (e) => _showKriminalDesaPopup(ctx, e, props, filters));
            }
        });

        ctx.desaLayerGroup.addLayer(geoLayer);
        await _loadKriminalMarkers(ctx, _buildDomain(filters, [['kecamatan_id', '=', kecProps.id]]));
        _addKriminalBackButton(ctx, 'kecamatan', { kecProps, kecLayer, filters, kabProps, kabLayer });

    } catch (error) {
        console.error("Gagal memuat data desa kriminal:", error);
    }
}

// ── Popup Desa ───────────────────────────────────────────────────────────────
function _showKriminalDesaPopup(ctx, e, props, filters) {
    const tipeLabel  = props.type === 'KELURAHAN' ? 'Kelurahan' : 'Desa';
    const kasusLabel = props.jumlah_kasus > 0
        ? `<strong style="color:${props.color};">${props.jumlah_kasus.toLocaleString('id-ID')} Kasus</strong>`
        : `<strong style="color:#27ae60;">Tidak Ada Kasus</strong>`;

    const popupContent = `
        <div class="petadigi-popup">
            <div class="petadigi-popup-header" style="background:#922b21;">
                <i class="fa fa-home"></i>
                <strong>${tipeLabel} ${props.name}</strong>
            </div>
            <div class="petadigi-popup-body">
                <table>
                    <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                    <tr><td><i class="fa fa-tag"></i> Tipe</td><td><strong>${tipeLabel}</strong></td></tr>
                    <tr><td><i class="fa fa-calendar"></i> Periode</td><td><strong>${_periodeLabel(filters)}</strong></td></tr>
                    <tr><td><i class="fa fa-exclamation-circle" style="color:#e74c3c;"></i> Kasus</td><td>${kasusLabel}</td></tr>
                </table>
            </div>
        </div>
    `;

    L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(ctx.map);
}

// ── Back Button khusus mode kriminal ─────────────────────────────────────────
function _addKriminalBackButton(ctx, targetLevel, backCtx) {
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
                    ctx._updateBreadcrumb(`<i class="fa fa-exclamation-triangle"></i> Peta Kriminal`);
                    await loadModeKriminal(ctx);

                } else if (targetLevel === 'kecamatan' && backCtx) {
                    ctx.desaLayerGroup.clearLayers();
                    ctx.desaLabelGroup.clearLayers();
                    const items = ctx.breadcrumbRef.el.querySelectorAll('.petadigi-breadcrumb-item');
                    if (items.length > 1) {
                        items[items.length - 1].previousSibling?.remove();
                        items[items.length - 1].remove();
                    }
                    await drillDownKriminalKecamatan(ctx, backCtx.kabProps, backCtx.kabLayer, backCtx.filters);
                }
            });
            return btn;
        },
        onRemove: () => {}
    });

    ctx.backButton = new BackControl({ position: 'topleft' });
    ctx.backButton.addTo(ctx.map);
}
