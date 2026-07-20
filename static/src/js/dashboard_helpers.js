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
// WIB DATE → UTC DATETIME (for Odoo domain filters)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert WIB date string "YYYY-MM-DD" to UTC datetime string for Odoo domain.
 * WIB 00:00:00 = UTC 17:00:00 previous day.
 */
export function wibDateStartUtc(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00+07:00').toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Convert WIB date string "YYYY-MM-DD" to UTC datetime string for Odoo domain.
 * WIB 23:59:59 = UTC 16:59:59 same day.
 */
export function wibDateEndUtc(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr + 'T23:59:59+07:00').toISOString().slice(0, 19).replace('T', ' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER INIT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Isi dropdown filter Tahun & Polres.
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

    // Dropdown Polres — dengan logika berbasis role
    const polresEl = ctx.filterPolres?.el;
    if (polresEl && !ctx._isPolsekUser) {
        try {
            const polresList = await ctx.orm.searchRead(
                'petadigi.polres', [], ['id', 'name'], { order: 'name asc' });
            polresList.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                polresEl.appendChild(opt);
            });
        } catch (_) {}

        // Polres user: lock ke polres milik user, admin/subdit: default semua
        if (ctx._isPolresUser && ctx._userPolresId) {
            polresEl.value    = String(ctx._userPolresId);
            polresEl.disabled = true;
        }
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
// KABUPATEN SUMMARY MARKERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Render satu bubble marker per kabupaten di level overview.
 * Count diambil dari feature.properties[countProp] — sudah ada dari read_group choropleth,
 * tidak perlu fetch ulang. Klik langsung drill-down ke kecamatan.
 *
 * @param {DashboardMap} ctx
 * @param {L.GeoJSON}    geoLayer      - layer GeoJSON kabupaten yang sudah dirender
 * @param {object}       filters       - objek filter aktif
 * @param {string}       countProp     - nama property count di feature.properties (mis. 'jumlah_kasus')
 * @param {string}       mainBreadcrumb - HTML untuk breadcrumb utama
 * @param {string}       appendIcon    - FontAwesome class untuk append breadcrumb (mis. 'fa-map-marker')
 * @param {Function}     drillDownFn   - fungsi drill-down (ctx, props, polygonLayer, filters)
 */
// Base renderer: satu bubble per polygon, callback penuh dari caller.
// Dipakai oleh renderKabupatenSummaryMarkers (level kabupaten) maupun
// level kecamatan di masing-masing layer.
export function renderSummaryMarkers(ctx, geoLayer, countProp, onClickFn) {
    ctx.markerLayerGroup.clearLayers();
    ctx.summaryMarkerGroup.clearLayers();

    geoLayer.eachLayer(polygonLayer => {
        const props = polygonLayer.feature.properties;
        const count = props[countProp] || 0;
        if (!count) return;

        const center = polygonLayer.getBounds().getCenter();
        let size, cls;
        if      (count < 10)   { size = 34; cls = 'sm'; }
        else if (count < 100)  { size = 42; cls = 'md'; }
        else if (count < 1000) { size = 50; cls = 'lg'; }
        else                   { size = 58; cls = 'xl'; }
        const label = count >= 1000
            ? (count >= 10000 ? Math.floor(count / 1000) + 'K+' : (count / 1000).toFixed(1) + 'K')
            : count;

        const icon = L.divIcon({
            html: `<div class="petadigi-cluster-icon petadigi-cluster-icon--${cls}" style="width:${size}px;height:${size}px;">${label}</div>`,
            className: '',
            iconSize:   L.point(size, size),
            iconAnchor: L.point(size / 2, size / 2),
        });

        const marker = L.marker([center.lat, center.lng], { icon, interactive: true });
        marker.on('click', () => { ctx.map.closePopup(); onClickFn(props, polygonLayer); });
        ctx.summaryMarkerGroup.addLayer(marker);
    });
}

export function renderKabupatenSummaryMarkers(ctx, geoLayer, filters, countProp, mainBreadcrumb, appendIcon, drillDownFn) {
    renderSummaryMarkers(ctx, geoLayer, countProp, (props, polygonLayer) => {
        const tipeLabel = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
        ctx._updateBreadcrumb(mainBreadcrumb);
        ctx._appendBreadcrumb(`<i class="fa ${appendIcon}"></i> ${tipeLabel} ${props.name}`);
        drillDownFn(ctx, props, polygonLayer, filters);
    });
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
