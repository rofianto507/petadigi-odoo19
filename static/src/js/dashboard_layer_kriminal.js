/** @odoo-module **/

/**
 * Peta Kriminal
 * Choropleth kriminalitas per kabupaten — warna berdasarkan jumlah kasus.
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
    const tahun     = ctx.filterTahun?.el?.value     || '';
    const kabupaten = ctx.filterKabupaten?.el?.value || '';
    return { tahun, kabupatenId: kabupaten ? parseInt(kabupaten) : null };
}

// ── Main loader ──────────────────────────────────────────────────────────────
export async function loadModeKriminal(ctx) {
    // Tampilkan legenda
    addKriminalLegend(ctx);

    const { tahun, kabupatenId } = _getActiveFilters(ctx);

    try {
        // 1. Ambil data kriminalitas — group by kabupaten_id
        const domain = [];
        if (tahun) {
            domain.push(['tanggal_kejadian', '>=', `${tahun}-01-01 00:00:00`]);
            domain.push(['tanggal_kejadian', '<=', `${tahun}-12-31 23:59:59`]);
        }
        if (kabupatenId) {
            domain.push(['kabupaten_id', '=', kabupatenId]);
        }

        const groups = await ctx.orm.readGroup(
            'petadigi.kriminalitas',
            domain,
            ['kabupaten_id'],
            ['kabupaten_id'],
        );

        // Buat map: kabupaten_id → jumlah kasus
        const kasusMap = {};
        for (const g of groups) {
            if (g.kabupaten_id) {
                const kabId = Array.isArray(g.kabupaten_id) ? g.kabupaten_id[0] : g.kabupaten_id;
                kasusMap[kabId] = g.kabupaten_id_count;
            }
        }

        // 2. Ambil geometry semua kabupaten
        const kabDomain = kabupatenId ? [['id', '=', kabupatenId]] : [];
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
                            id: r.id,
                            code: r.code,
                            name: r.name,
                            type: r.type,
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

        // 3. Render choropleth
        const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
            style: (feature) => ({
                color: '#555555',
                weight: 1.5,
                opacity: 1,
                fillColor: feature.properties.color,
                fillOpacity: 0.75,
            }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                // Label nama kabupaten di tengah
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

                // Hover effect
                layer.on('mouseover', () => {
                    layer.setStyle({ weight: 2.5, fillOpacity: 0.9 });
                    layer.bringToFront();
                });
                layer.on('mouseout', () => {
                    layer.setStyle({ weight: 1.5, fillOpacity: 0.75 });
                });

                // Popup
                layer.on('click', (e) => _showKriminalPopup(ctx, e, props, tahun));
            }
        });

        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx.map.fitBounds(geoLayer.getBounds());

    } catch (error) {
        console.error("Gagal memuat data kriminalitas:", error);
    }
}

// ── Popup ────────────────────────────────────────────────────────────────────
function _showKriminalPopup(ctx, e, props, tahun) {
    const tipeLabel   = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
    const tahunLabel  = tahun ? `Tahun ${tahun}` : 'Semua Tahun';
    const kasusLabel  = props.jumlah_kasus > 0
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
                    <tr>
                        <td><i class="fa fa-barcode"></i> Kode</td>
                        <td><strong>${props.code}</strong></td>
                    </tr>
                    <tr>
                        <td><i class="fa fa-calendar"></i> Periode</td>
                        <td><strong>${tahunLabel}</strong></td>
                    </tr>
                    <tr>
                        <td><i class="fa fa-list"></i> Kecamatan</td>
                        <td><strong>${props.jumlah_kecamatan} Kecamatan</strong></td>
                    </tr>
                    <tr>
                        <td><i class="fa fa-exclamation-circle" style="color:#e74c3c;"></i> Kasus</td>
                        <td>${kasusLabel}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;

    L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(ctx.map);
}
