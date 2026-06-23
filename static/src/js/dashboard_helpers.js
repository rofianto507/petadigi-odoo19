/** @odoo-module **/

// ─────────────────────────────────────────────────────────────────────────────
// DATE FORMAT
// ─────────────────────────────────────────────────────────────────────────────

const _BULAN_SINGKAT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function _parseUtc(s) {
    if (!s) return null;
    const iso = s.trim().length <= 10
        ? `${s}T00:00:00Z`
        : `${s.replace(' ', 'T')}Z`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Format tanggal dari database (UTC) → "30 Jun 2026" (local timezone).
 */
export function fmtTanggal(s) {
    const d = _parseUtc(s);
    if (!d) return s || '-';
    return `${d.getDate()} ${_BULAN_SINGKAT[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format tanggal + jam dari database (UTC) → "21 Juni 2026 14:45" (local timezone).
 */
export function fmtTanggalJam(s) {
    const d = _parseUtc(s);
    if (!d) return s || '-';
    const hh  = String(d.getHours()).padStart(2, '0');
    const mm  = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${_BULAN_SINGKAT[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER INIT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Isi dropdown filter Tahun & Kabupaten.
 * @param {DashboardMap} ctx - instance komponen utama
 */
export async function initFilters(ctx) {
    // Dropdown Tahun — diambil dari field tahun pada model sumber_dokumen
    const tahunEl = ctx.filterTahun.el;
    if (tahunEl) {
        try {
            const groups = await ctx.orm.call(
                'petadigi.sumber_dokumen',
                'read_group',
                [[], ['tahun'], ['tahun']],
                { lazy: false }
            );
            const tahunList = groups
                .map(g => g.tahun)
                .filter(Boolean)
                .sort()
                .reverse();
            tahunList.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                tahunEl.appendChild(opt);
            });
            // Default ke tahun saat ini jika tersedia
            const currentYear = String(new Date().getFullYear());
            if (tahunList.includes(currentYear)) {
                tahunEl.value = currentYear;
            }
        } catch (_) {}
    }

    // Dropdown Kabupaten
    const kabEl = ctx.filterKabupaten.el;
    if (kabEl) {
        try {
            const kabs = await ctx.orm.searchRead('petadigi.kabupaten', [], ['id', 'name']);
            kabs.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k.id;
                opt.textContent = k.name;
                kabEl.appendChild(opt);
            });
        } catch (_) {}
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BACK BUTTON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tambahkan tombol kembali di sudut kiri atas peta.
 * @param {DashboardMap} ctx
 * @param {'kabupaten'|'kecamatan'} targetLevel
 * @param {object|null} backCtx - data konteks untuk kembali ke level sebelumnya
 */
export function addBackButton(ctx, targetLevel, backCtx, onBack) {
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
                if (typeof onBack === 'function') await onBack();
            });
            return btn;
        },
        onRemove: () => {}
    });

    ctx.backButton = new BackControl({ position: 'topleft' });
    ctx.backButton.addTo(ctx.map);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMING SOON CONTROL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tampilkan layer kabupaten sebagai background + banner "Segera Hadir".
 * @param {DashboardMap} ctx
 * @param {string} label - nama mode
 * @param {string} color - warna aksen
 */
export async function loadModeComingSoon(ctx, label, color) {
    // Background layer kabupaten
    try {
        const records = await ctx.orm.searchRead(
            'petadigi.kabupaten', [], ['name', 'geometry']
        );
        const features = records.filter(r => r.geometry).map(r => {
            try {
                return { type: "Feature", geometry: JSON.parse(r.geometry), properties: { name: r.name } };
            } catch (_) { return null; }
        }).filter(Boolean);

        const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
            style: () => ({
                color: color || '#888888',
                weight: 1.5,
                opacity: 0.6,
                fillColor: '#cccccc',
                fillOpacity: 0.2,
            }),
            onEachFeature: (feature, layer) => {
                layer.on('add', () => {
                    const bounds = layer.getBounds();
                    const lbl = L.marker(bounds.getCenter(), {
                        icon: L.divIcon({
                            className: 'kabupaten-label',
                            html: `<span>${feature.properties.name}</span>`,
                            iconSize: null,
                        }),
                        interactive: false,
                        zIndexOffset: -100,
                    });
                    lbl._polygonBounds = bounds;
                    ctx.kabupatenLabelGroup.addLayer(lbl);
                });
            }
        });
        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx.map.fitBounds(geoLayer.getBounds());
    } catch (e) {
        console.error(e);
    }

    // Banner coming soon
    const ComingSoonControl = L.Control.extend({
        onAdd: () => {
            const div = L.DomUtil.create('div', 'petadigi-coming-soon');
            div.innerHTML = `
                <i class="fa fa-wrench"></i>
                <strong>${label}</strong>
                <span>Segera hadir</span>
            `;
            div.style.borderLeft = `4px solid ${color}`;
            return div;
        },
        onRemove: () => {}
    });
    ctx.comingSoonControl = new ComingSoonControl({ position: 'topright' });
    ctx.comingSoonControl.addTo(ctx.map);
}
