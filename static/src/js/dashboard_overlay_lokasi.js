/** @odoo-module **/

/**
 * Overlay Lokasi Penting — tampilkan marker lokasi di atas peta manapun.
 * Panel checkbox di sudut kiri bawah. Pilihan kategori persisten antar drill-down.
 */

const OVERLAY_COLOR = '#6c3483';

// ── Init Panel ────────────────────────────────────────────────────────────────
export async function initLokasiOverlay(ctx) {
    // Snapshot versi saat ini — dipakai untuk mendeteksi mode switch di tengah fetch
    const ver = ctx._modeVersion;

    if (ctx.lokasiOverlayControl) {
        ctx.lokasiOverlayControl.remove();
        ctx.lokasiOverlayControl = null;
    }
    if (!ctx.lokasiOverlaySelected) ctx.lokasiOverlaySelected = new Set();

    let categories;
    try {
        categories = await ctx.orm.searchRead(
            'petadigi.kategori_lokasi', [], ['id', 'name', 'icon'],
            { order: 'name asc' }
        );
    } catch (e) {
        console.error('Gagal load kategori lokasi overlay:', e);
        return;
    }

    // Jika mode sudah berganti selama fetch, batalkan — jangan buat panel duplikat
    if (ctx._modeVersion !== ver) return;

    if (!categories.length) return;

    const OverlayControl = L.Control.extend({
        onAdd() {
            const container = L.DomUtil.create('div', 'petadigi-lokasi-overlay');
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            // Header (klikable untuk collapse/expand)
            const header = L.DomUtil.create('div', 'petadigi-lokasi-overlay-header', container);
            header.innerHTML = `
                <i class="fa fa-map-marker"></i>
                <span>Lokasi Penting</span>
                <i class="fa fa-chevron-up petadigi-overlay-toggle-icon"></i>
            `;

            // Body berisi checkbox
            const body = L.DomUtil.create('div', 'petadigi-lokasi-overlay-body', container);

            categories.forEach(cat => {
                const label = L.DomUtil.create('label', 'petadigi-lokasi-overlay-item', body);
                const faIcon = cat.icon || 'fa-map-marker';
                label.innerHTML = `
                    <input type="checkbox" value="${cat.id}" ${ctx.lokasiOverlaySelected.has(cat.id) ? 'checked' : ''}>
                    <i class="fa ${faIcon}" style="color:${OVERLAY_COLOR}; width:14px; text-align:center; flex-shrink:0;"></i>
                    <span title="${cat.name}">${cat.name}</span>
                `;

                const cb = label.querySelector('input');
                L.DomEvent.on(cb, 'change', async () => {
                    if (cb.checked) ctx.lokasiOverlaySelected.add(cat.id);
                    else ctx.lokasiOverlaySelected.delete(cat.id);
                    await updateLokasiOverlayMarkers(ctx);
                });
            });

            // Toggle collapse
            L.DomEvent.on(header, 'click', () => {
                const isCollapsed = body.style.display === 'none';
                body.style.display = isCollapsed ? '' : 'none';
                const toggleIcon = header.querySelector('.petadigi-overlay-toggle-icon');
                if (toggleIcon) {
                    toggleIcon.className = isCollapsed
                        ? 'fa fa-chevron-up petadigi-overlay-toggle-icon'
                        : 'fa fa-chevron-down petadigi-overlay-toggle-icon';
                }
            });

            return container;
        },
        onRemove() {}
    });

    ctx.lokasiOverlayControl = new OverlayControl({ position: 'bottomleft' });
    ctx.lokasiOverlayControl.addTo(ctx.map);

    // Jika ada pilihan tersimpan, tampilkan markersnya
    if (ctx.lokasiOverlaySelected.size > 0) {
        await updateLokasiOverlayMarkers(ctx);
    }
}

// ── Update Markers ────────────────────────────────────────────────────────────
export async function updateLokasiOverlayMarkers(ctx) {
    if (!ctx.lokasiOverlayLayerGroup) return;
    ctx.lokasiOverlayLayerGroup.clearLayers();

    const selectedIds = [...ctx.lokasiOverlaySelected];
    if (!selectedIds.length) return;

    // Domain: respek drill-down + filter kabupaten aktif
    const domain = [
        ['kategori_id', 'in', selectedIds],
        ['latitude',    '!=', 0],
        ['longitude',   '!=', 0],
    ];
    if (ctx.drillKecamatanId) {
        domain.push(['kecamatan_id', '=', ctx.drillKecamatanId]);
    } else if (ctx.drillKabupatenId) {
        domain.push(['kabupaten_id', '=', ctx.drillKabupatenId]);
    } else {
        const kabVal = ctx.filterKabupaten?.el?.value;
        if (kabVal) domain.push(['kabupaten_id', '=', parseInt(kabVal)]);
    }

    try {
        const cats = await ctx.orm.searchRead(
            'petadigi.kategori_lokasi', [['id', 'in', selectedIds]], ['id', 'icon']
        );
        const catIconMap = {};
        for (const c of cats) catIconMap[c.id] = c.icon || 'fa-map-marker';

        const records = await ctx.orm.searchRead(
            'petadigi.lokasi_penting',
            domain,
            ['id', 'code', 'nama_lokasi', 'latitude', 'longitude',
             'kategori_id', 'alamat_lengkap', 'state'],
        );

        records.forEach(r => {
            const katId     = Array.isArray(r.kategori_id) ? r.kategori_id[0] : null;
            const faIcon    = (katId && catIconMap[katId]) ? catIconMap[katId] : 'fa-map-marker';
            const kategori  = Array.isArray(r.kategori_id) ? r.kategori_id[1] : '-';
            const stateColor = r.state === 'AKTIF' ? '#27ae60' : '#c0392b';
            const stateLabel = r.state === 'AKTIF' ? 'Aktif' : 'Non Aktif';
            const alamat     = r.alamat_lengkap
                ? r.alamat_lengkap.slice(0, 50) + (r.alamat_lengkap.length > 50 ? '…' : '')
                : '-';

            const icon = L.divIcon({
                className: '',
                html: `<div class="petadigi-overlay-marker">
                           <i class="fa ${faIcon}" style="color:${OVERLAY_COLOR};"></i>
                       </div>`,
                iconSize:   [22, 22],
                iconAnchor: [11, 11],
            });

            const marker = L.marker([r.latitude, r.longitude], { icon });
            marker.bindPopup(`
                <div class="petadigi-popup">
                    <div class="petadigi-popup-header" style="background:${OVERLAY_COLOR};">
                        <i class="fa ${faIcon}"></i>
                        <strong>${r.code}</strong>
                    </div>
                    <div class="petadigi-popup-body">
                        <table>
                            <tr><td><i class="fa fa-building"></i> Nama</td><td><strong>${r.nama_lokasi || '-'}</strong></td></tr>
                            <tr><td><i class="fa fa-list"></i> Kategori</td><td><strong>${kategori}</strong></td></tr>
                            <tr><td><i class="fa fa-map"></i> Alamat</td><td><strong>${alamat}</strong></td></tr>
                            <tr><td><i class="fa fa-flag"></i> Status</td>
                                <td><strong style="color:${stateColor};">${stateLabel}</strong></td></tr>
                        </table>
                    </div>
                    <div class="petadigi-popup-footer">
                        <button class="petadigi-btn-detail" style="background:${OVERLAY_COLOR};"
                                id="btn-overlay-lokasi-${r.id}">
                            <i class="fa fa-external-link"></i> Lihat Detail
                        </button>
                    </div>
                </div>
            `, { maxWidth: 280, className: 'petadigi-leaflet-popup' });

            marker.on('popupopen', () => {
                setTimeout(() => {
                    const btn = document.getElementById(`btn-overlay-lokasi-${r.id}`);
                    if (btn) btn.addEventListener('click', () => ctx.action.doAction({
                        type: 'ir.actions.act_window',
                        res_model: 'petadigi.lokasi_penting',
                        res_id: r.id,
                        views: [[false, 'form']],
                        target: 'current',
                    }));
                }, 0);
            });

            ctx.lokasiOverlayLayerGroup.addLayer(marker);
        });
    } catch (e) {
        console.error('Gagal load overlay marker lokasi:', e);
    }
}

// ── Remove Overlay (saat ganti mode) ─────────────────────────────────────────
export function removeLokasiOverlay(ctx) {
    if (ctx.lokasiOverlayControl) {
        ctx.lokasiOverlayControl.remove();
        ctx.lokasiOverlayControl = null;
    }
    if (ctx.lokasiOverlayLayerGroup) {
        ctx.lokasiOverlayLayerGroup.clearLayers();
    }
    // ctx.lokasiOverlaySelected SENGAJA tidak direset — pilihan persisten
}
