/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { LatLongMapPicker } from "./latlon_leaflet_widget";
import { LALIN_COLORS, getLalinColor } from "./dashboard_layer_lalin";
import { useState, useEffect, onWillUnmount } from "@odoo/owl";

/**
 * Widget peta Lokasi Strong Point dengan choropleth lalu lintas.
 * Mendukung drill-down kabupaten → kecamatan → desa via dropdown filter.
 * Akses polres: semua dropdown aktif.
 * Akses polsek: kabupaten fixed, kecamatan dari polsek tersebut.
 * Default range tanggal: 30 hari terakhir.
 */
class LatLongMapPickerLalin extends LatLongMapPicker {
    static template = "petadigi.LatLongMapPickerLalin";

    setup() {
        super.setup();

        this.orm = useService("orm");

        const today = new Date();
        const d30   = new Date(today);
        d30.setDate(d30.getDate() - 30);
        const fmt = d => d.toISOString().slice(0, 10);

        this.lalinDate = useState({ from: fmt(d30), to: fmt(today) });
        this.lalinLoad = useState({ loading: false });

        // Geo filter state
        this.geoFilter = useState({ kabupatenId: null, kecamatanId: null, desaId: null });

        // Options untuk dropdown
        this.geoOptions = useState({
            isPolsek:           false,
            fixedKabupatenName: '',
            kabupatens:         [],
            kecamatans:         [],
            desas:              [],
            ready:              false,
        });

        this._lalinLayer    = null;
        this._lalinLegend   = null;
        this._lalinCallId   = 0;
        this._initialFitDone = false;

        // Inisialisasi geo filter berdasarkan record (sekali saat mount)
        useEffect(() => { this._initGeoFilters(); }, () => []);

        // Reload choropleth saat tanggal atau geo filter berubah
        useEffect(
            () => { if (this.map && this.geoOptions.ready) this._loadLalinLayer(); },
            () => [
                this.lalinDate.from, this.lalinDate.to,
                this.geoFilter.kabupatenId, this.geoFilter.kecamatanId, this.geoFilter.desaId,
            ]
        );

        onWillUnmount(() => {
            if (this._lalinLayer && this.map) this.map.removeLayer(this._lalinLayer);
            if (this._lalinLegend)            this._lalinLegend.remove();
        });
    }

    // ── Ambil integer ID dari nilai field Many2one ──────────────────────────
    _m2oId(val) {
        if (!val) return null;
        if (Array.isArray(val))            return val[0]  || null;
        if (typeof val === 'object')       return val.id  || val.resId || null;
        if (typeof val === 'number')       return val;
        return null;
    }

    // ── Init geo filter: baca polres/polsek dari record saat ini ───────────
    async _initGeoFilters() {
        try {
            const data     = this.props.record.data;
            const polsekId = this._m2oId(data.polsek_id);
            const polresId = this._m2oId(data.polres_id);

            if (polsekId) {
                // Polsek: ambil kecamatan sekaligus dengan kabupaten_id-nya (polsek tidak punya field kabupaten langsung)
                const kecamatans = await this.orm.searchRead(
                    'petadigi.kecamatan', [['polsek_id', '=', polsekId]],
                    ['id', 'name', 'kabupaten_id'], { order: 'name asc' }
                );

                // Ambil kabupaten dari kecamatan pertama (semua kecamatan satu polsek = satu kabupaten)
                const kabData = kecamatans[0]?.kabupaten_id;
                const kabId   = Array.isArray(kabData) ? kabData[0] : (kabData || null);
                const kabName = Array.isArray(kabData) ? kabData[1] : '';

                this.geoOptions.isPolsek           = true;
                this.geoOptions.fixedKabupatenName  = kabName;
                this.geoOptions.kecamatans          = kecamatans.map(k => ({ id: k.id, name: k.name }));
                this.geoFilter.kabupatenId          = kabId;

            } else if (polresId) {
                // Polres: tampilkan semua kabupaten dalam polres
                const kabupatens = await this.orm.searchRead(
                    'petadigi.kabupaten', [['polres_id', '=', polresId]],
                    ['id', 'name'], { order: 'name asc' }
                );
                this.geoOptions.kabupatens = kabupatens;
            }

            this.geoOptions.ready = true;
            if (this.map) this._loadLalinLayer();

        } catch (e) {
            console.error('[LalinMapPicker._initGeoFilters]', e);
            this.geoOptions.ready = true;
        }
    }

    // ── Event handlers dropdown ─────────────────────────────────────────────
    async onKabupatenChange(ev) {
        const kabId = ev.target.value ? parseInt(ev.target.value) : null;
        this.geoFilter.kabupatenId = kabId;
        this.geoFilter.kecamatanId = null;
        this.geoFilter.desaId      = null;
        this.geoOptions.kecamatans = [];
        this.geoOptions.desas      = [];

        if (kabId) {
            const kecamatans = await this.orm.searchRead(
                'petadigi.kecamatan', [['kabupaten_id', '=', kabId]],
                ['id', 'name'], { order: 'name asc' }
            );
            this.geoOptions.kecamatans = kecamatans;
        }
    }

    async onKecamatanChange(ev) {
        const kecId = ev.target.value ? parseInt(ev.target.value) : null;
        this.geoFilter.kecamatanId = kecId;
        this.geoFilter.desaId      = null;
        this.geoOptions.desas      = [];

        if (kecId) {
            const desas = await this.orm.searchRead(
                'petadigi.desa', [['kecamatan_id', '=', kecId]],
                ['id', 'name'], { order: 'name asc' }
            );
            this.geoOptions.desas = desas;
        }
    }

    onDesaChange(ev) {
        this.geoFilter.desaId = ev.target.value ? parseInt(ev.target.value) : null;
    }

    onDateFromChange(ev) { this.lalinDate.from = ev.target.value; }
    onDateToChange(ev)   { this.lalinDate.to   = ev.target.value; }

    // ── Override: load lalin layer setelah map pertama dibuat ──────────────
    renderOrUpdateMap() {
        const wasInit = !!this.map;
        super.renderOrUpdateMap();
        if (!wasInit && this.map) {
            setTimeout(() => { if (this.geoOptions.ready) this._loadLalinLayer(); }, 300);
        }
    }

    // ── Tentukan level dan query berdasarkan geo filter ─────────────────────
    _resolveQuery() {
        const { kabupatenId, kecamatanId } = this.geoFilter;
        const dateDomain = [];
        if (this.lalinDate.from) dateDomain.push(['tanggal_kejadian', '>=', this.lalinDate.from + ' 00:00:00']);
        if (this.lalinDate.to)   dateDomain.push(['tanggal_kejadian', '<=', this.lalinDate.to   + ' 23:59:59']);

        if (kecamatanId) {
            return {
                level:       'Desa',
                geoModel:    'petadigi.desa',
                geoDomain:   [['kecamatan_id', '=', kecamatanId]],
                groupField:  'desa_id',
                lalinDomain: [...dateDomain, ['kecamatan_id', '=', kecamatanId]],
            };
        } else if (kabupatenId) {
            return {
                level:       'Kecamatan',
                geoModel:    'petadigi.kecamatan',
                geoDomain:   [['kabupaten_id', '=', kabupatenId]],
                groupField:  'kecamatan_id',
                lalinDomain: [...dateDomain, ['kabupaten_id', '=', kabupatenId]],
            };
        } else {
            return {
                level:       'Kabupaten',
                geoModel:    'petadigi.kabupaten',
                geoDomain:   [],
                groupField:  'kabupaten_id',
                lalinDomain: [...dateDomain],
            };
        }
    }

    // ── Render choropleth ───────────────────────────────────────────────────
    async _loadLalinLayer() {
        if (!this.map || !window.L) return;

        // Guard: hanya pemanggilan terakhir yang boleh apply hasilnya
        const callId = ++this._lalinCallId;

        this.lalinLoad.loading = true;

        if (this._lalinLayer)  { this.map.removeLayer(this._lalinLayer);  this._lalinLayer = null; }
        if (this._lalinLegend) { this._lalinLegend.remove(); this._lalinLegend = null; }

        const { level, geoModel, geoDomain, groupField, lalinDomain } = this._resolveQuery();

        try {
            const [groups, geoRecords] = await Promise.all([
                this.orm.call('petadigi.lalu_lintas', 'read_group',
                    [lalinDomain, [groupField], [groupField]], { lazy: false }),
                this.orm.searchRead(geoModel, geoDomain, ['id', 'name', 'geometry']),
            ]);

            // Jika ada pemanggilan lebih baru, batalkan hasil ini
            if (callId !== this._lalinCallId || !this.map) { this.lalinLoad.loading = false; return; }

            const countMap = {};
            for (const g of groups) {
                if (!g[groupField]) continue;
                const id = Array.isArray(g[groupField]) ? g[groupField][0] : g[groupField];
                countMap[id] = g.__count || 0;
            }

            const features = geoRecords
                .filter(r => r.geometry && r.geometry.trim())
                .map(r => {
                    try {
                        const jumlah = countMap[r.id] || 0;
                        return {
                            type: 'Feature',
                            geometry: JSON.parse(r.geometry),
                            properties: { id: r.id, name: r.name, jumlah, color: getLalinColor(jumlah) },
                        };
                    } catch { return null; }
                })
                .filter(Boolean);

            if (!features.length || !this.map) { this.lalinLoad.loading = false; return; }

            this._lalinLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
                style: f => ({
                    color: '#666', weight: 1, opacity: 0.8,
                    fillColor: f.properties.color, fillOpacity: 0.35,
                }),
                onEachFeature: (feature, layer) => {
                    const p = feature.properties;
                    layer.bindTooltip(
                        `<b>${p.name}</b><br>${p.jumlah.toLocaleString('id-ID')} Kejadian Lalin`,
                        { sticky: true, className: 'sp-lalin-tooltip' }
                    );
                    layer.on('mouseover', () => layer.setStyle({ weight: 2, fillOpacity: 0.55 }));
                    layer.on('mouseout',  () => layer.setStyle({ weight: 1, fillOpacity: 0.35 }));
                },
            }).addTo(this.map);

            // L.Marker tidak punya bringToFront — hanya L.Path yang punya, jadi guard dulu
            if (this.marker       && typeof this.marker.bringToFront       === 'function') this.marker.bringToFront();
            if (this.lokasiMarker && typeof this.lokasiMarker.bringToFront === 'function') this.lokasiMarker.bringToFront();

            // Pertama kali load: fit map ke area aktif
            if (!this._initialFitDone) {
                this._initialFitDone = true;
                const bounds = this._lalinLayer.getBounds();
                if (bounds.isValid()) {
                    this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });

                    // Record baru (lat/lng = 0): auto-set marker di tengah area aktif
                    const data     = this.props.record.data;
                    const hasCoords = data[this.latField] && data[this.lngField];
                    if (!hasCoords && this.marker) {
                        const center = bounds.getCenter();
                        this.marker.setLatLng(center);
                        this.props.record.update({
                            [this.latField]: center.lat,
                            [this.lngField]: center.lng,
                        });
                    }
                }
            }

            // Legend
            const COLORS = LALIN_COLORS;
            const levelLabel = level;
            const LalinLegend = L.Control.extend({
                onAdd() {
                    const div = L.DomUtil.create('div', 'sp-lalin-legend');
                    div.innerHTML =
                        `<div class="sp-lalin-legend-title"><i class="fa fa-car"></i> Lalin per ${levelLabel}</div>`
                        + COLORS.map(t =>
                            `<div class="sp-lalin-legend-row">
                                <span class="sp-lalin-legend-swatch" style="background:${t.color};"></span>
                                <span>${t.label}</span>
                            </div>`
                        ).join('');
                    L.DomEvent.disableClickPropagation(div);
                    L.DomEvent.disableScrollPropagation(div);
                    return div;
                },
                onRemove() {},
            });
            this._lalinLegend = new LalinLegend({ position: 'bottomright' }).addTo(this.map);

        } catch (e) {
            console.error('[LalinMapPicker]', e);
        }

        this.lalinLoad.loading = false;
    }
}

registry.category("fields").add("latlong_map_picker_lalin", {
    component: LatLongMapPickerLalin,
    displayName: "Map Picker (Lalu Lintas Layer)",
    supportedTypes: ["float"],
});
