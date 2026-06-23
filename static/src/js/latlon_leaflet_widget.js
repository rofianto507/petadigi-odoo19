/** @odoo-module **/

import { registry } from "@web/core/registry";
import { standardFieldProps } from "@web/views/fields/standard_field_props";
import { Component, onWillUnmount, useRef, useEffect } from "@odoo/owl";

export class LatLongMapPicker extends Component {
    static template = "petadigi.LatLongMapPicker";
    static props = { ...standardFieldProps };

    setup() {
        this.mapContainer = useRef("mapDiv");
        this.map          = null;
        this.marker       = null;
        this.lokasiMarker = null;
        this.distanceLine = null;
        this.infoControl  = null;
        this._dragging    = false;

        const fields = this.props.record.fields || {};
        this.latField  = 'latitude' in fields ? 'latitude' : 'lat';
        this.lngField  = 'longitude' in fields ? 'longitude' : 'lng';
        this.hasLokasi = 'lokasi_lat' in fields && 'lokasi_lng' in fields;

        // Marker warna pakai SVG — tidak butuh icon default Leaflet

        useEffect(
            () => this.renderOrUpdateMap(),
            () => [
                this.props.record.data[this.latField],
                this.props.record.data[this.lngField],
                this.props.readonly,
            ]
        );

        if (this.hasLokasi) {
            useEffect(
                () => this._updateLokasiMarker(),
                () => [
                    this.props.record.data.lokasi_lat,
                    this.props.record.data.lokasi_lng,
                    this.props.record.data.lokasi_nama,
                ]
            );
            useEffect(
                () => this._updateDistanceLine(),
                () => [
                    this.props.record.data[this.latField],
                    this.props.record.data[this.lngField],
                    this.props.record.data.lokasi_lat,
                    this.props.record.data.lokasi_lng,
                ]
            );
        }

        onWillUnmount(() => {
            if (this.map) { this.map.remove(); this.map = null; }
        });
    }

    // ── Info card overlay (pojok kiri bawah) ─────────────────────────────────
    _createInfoControl() {
        const InfoCard = L.Control.extend({
            options: { position: 'bottomleft' },
            onAdd() {
                const div = L.DomUtil.create('div', 'sp-map-info-card');
                div.style.display = 'none';
                L.DomEvent.disableClickPropagation(div);
                return div;
            },
        });
        this.infoControl = new InfoCard().addTo(this.map);
    }

    _syncInfoCard() {
        if (!this.infoControl || !this.map) return;
        const el     = this.infoControl.getContainer();
        const data   = this.props.record.data;
        const nama   = data.lokasi_nama;
        const lokLat = data.lokasi_lat;
        const lokLng = data.lokasi_lng;
        const spLat  = data[this.latField];
        const spLng  = data[this.lngField];

        if (nama && lokLat && lokLng) {
            const distHtml = (spLat && spLng)
                ? '<div class="sp-map-info-dist">'
                  + '&#8596; ' + this._formatDist(
                      L.latLng(lokLat, lokLng).distanceTo(L.latLng(spLat, spLng))
                  )
                  + ' dari titik strong point</div>'
                : '';
            el.innerHTML =
                '<div class="sp-map-info-icon"><i class="fa fa-map-pin"></i></div>'
                + '<div class="sp-map-info-body">'
                +   '<div class="sp-map-info-name">' + nama + '</div>'
                +   distHtml
                + '</div>';
            el.style.display = 'flex';
        } else {
            el.style.display = 'none';
        }
    }

    // ── Icon marker dari file PNG (color = nama warna, misal 'red', 'green') ──
    _pinIcon(color) {
        return L.icon({
            iconUrl:      `/petadigi/static/lib/leaflet/images/marker-icon-${color}.png`,
            shadowUrl:    '/petadigi/static/lib/leaflet/images/marker-shadow.png',
            iconSize:     [25, 41],
            iconAnchor:   [12, 41],
            popupAnchor:  [1, -34],
            shadowSize:   [41, 41],
            shadowAnchor: [12, 41],
        });
    }

    // ── Format jarak ─────────────────────────────────────────────────────────
    _formatDist(meters) {
        return meters >= 1000
            ? (meters / 1000).toFixed(2) + ' km'
            : Math.round(meters) + ' m';
    }

    // ── Garis lurus antara dua marker (tanpa label di tengah) ────────────────
    _updateDistanceLine() {
        if (!this.map || !window.L) return;

        const data   = this.props.record.data;
        const spLat  = data[this.latField];
        const spLng  = data[this.lngField];
        const lokLat = data.lokasi_lat;
        const lokLng = data.lokasi_lng;

        if (spLat && spLng && lokLat && lokLng) {
            const spPt  = L.latLng(spLat, spLng);
            const lokPt = L.latLng(lokLat, lokLng);
            const pts   = [spPt, lokPt];

            if (!this.distanceLine) {
                this.distanceLine = L.polyline(pts, {
                    color: '#71639e', weight: 2,
                    dashArray: '8, 5', opacity: 0.75, interactive: false,
                }).addTo(this.map);
            } else {
                this.distanceLine.setLatLngs(pts);
            }

            // Update info card + auto-zoom (kecuali saat drag)
            this._syncInfoCard();
            if (!this._dragging) {
                this.map.fitBounds(L.latLngBounds([spPt, lokPt]), {
                    padding: [60, 60], maxZoom: 15, animate: true,
                });
            }
        } else {
            if (this.distanceLine) {
                this.map.removeLayer(this.distanceLine);
                this.distanceLine = null;
            }
            this._syncInfoCard();
        }
    }

    // ── Marker lokasi referensi + popup ──────────────────────────────────────
    _updateLokasiMarker() {
        if (!this.map || !window.L) return;
        const data = this.props.record.data;
        const lat  = data.lokasi_lat;
        const lng  = data.lokasi_lng;
        const nama = data.lokasi_nama || 'Lokasi Strong Point';

        if (lat && lng) {
            const popupHtml = '<div style="font-size:12px;min-width:140px;">'
                + '<i class="fa fa-map-pin" style="color:#71639e;margin-right:4px;"></i>'
                + '<b>' + nama + '</b>'
                + '<br><small style="color:#666;">' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</small>'
                + '</div>';

            if (!this.lokasiMarker) {
                this.lokasiMarker = L.marker([lat, lng], {
                    icon: this._pinIcon('green'), zIndexOffset: 200,
                }).addTo(this.map).bindPopup(popupHtml);
            } else {
                this.lokasiMarker.setLatLng([lat, lng]);
                this.lokasiMarker.getPopup().setContent(popupHtml);
            }
        } else {
            if (this.lokasiMarker) {
                this.map.removeLayer(this.lokasiMarker);
                this.lokasiMarker = null;
            }
        }
        this._syncInfoCard();
    }

    // ── Init / update peta + marker utama ────────────────────────────────────
    renderOrUpdateMap() {
        if (!this.mapContainer.el || !window.L) return;

        const data      = this.props.record.data;
        const hasCoords = data[this.latField] && data[this.lngField];
        const lat  = hasCoords ? data[this.latField] : -2.2;
        const lng  = hasCoords ? data[this.lngField] : 104.5;
        const zoom = hasCoords ? 13 : 6;

        if (!this.map) {
            this.map = L.map(this.mapContainer.el).setView([lat, lng], zoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
            }).addTo(this.map);

            this._createInfoControl();

            this.marker = L.marker([lat, lng], {
                icon: this._pinIcon('red'),
                draggable: !this.props.readonly,
            }).addTo(this.map);

            if (!this.props.readonly) {
                this.marker.on('dragstart', () => { this._dragging = true; });
                this.marker.on('dragend', () => {
                    this._dragging = false;
                    this.updateCoordinates(this.marker.getLatLng());
                    this._updateDistanceLine();
                });
                this.map.on('click', (ev) => {
                    this.marker.setLatLng(ev.latlng);
                    this.updateCoordinates(ev.latlng);
                });
            }

            setTimeout(() => {
                if (!this.map) return;
                this.map.invalidateSize();
                if (this.hasLokasi) {
                    this._updateLokasiMarker();
                    this._updateDistanceLine();
                }
            }, 150);
        } else {
            this.marker.setLatLng([lat, lng]);
            this.marker.dragging[this.props.readonly ? 'disable' : 'enable']();
        }
    }

    updateCoordinates(pos) {
        this.props.record.update({
            [this.latField]: pos.lat,
            [this.lngField]: pos.lng,
        });
    }
}

registry.category("fields").add("latlong_map_picker", {
    component: LatLongMapPicker,
    displayName: "Map Picker",
    supportedTypes: ["float"],
});
