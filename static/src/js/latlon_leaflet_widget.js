/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component, onWillUpdateProps, onMounted, useRef } from "@odoo/owl";
import { standardFieldProps } from "@web/views/fields/standard_field_props";

export class LatLongMapPicker extends Component {
    static template = "petadigi.LatLongMapPicker";
    static props = {
        ...standardFieldProps,
        longitude_field: { type: String, optional: true },
    };

    setup() {
        this.mapRef = useRef("mapDiv");

        onMounted(() => this.initMap());

        onWillUpdateProps(nextProps => {
            const nextLat = nextProps.value;
            const nextLng = nextProps.record.data[this.longitudeField];
            const curLat = this.props.value;
            const curLng = this.props.record.data[this.longitudeField];
            const readonlyChanged = nextProps.readonly !== this.props.readonly;

            // Jika readonly berubah (masuk/keluar edit mode), re-init map
            // agar draggable marker ikut terupdate
            if (readonlyChanged) {
                setTimeout(() => this.initMap(), 0);
                return;
            }

            if (nextLat !== curLat || nextLng !== curLng) {
                this._updateMarker(nextLat, nextLng, !nextProps.readonly);
            }
        });
    }

    get longitudeField() {
        // options dari XML view ada di props.options, bukan props langsung
        return this.props.options?.longitude_field || this.props.longitude_field || "longitude";
    }

    get latitude() {
        return this.props.value || 0;
    }

    get longitude() {
        return this.props.record.data[this.longitudeField] || 0;
    }

    /**
     * Update atau buat marker baru.
     * Berbeda dengan _moveMarker lama yang hanya update posisi jika marker sudah ada,
     * fungsi ini juga membuat marker baru jika belum ada (kasus: data sudah ada
     * tapi marker belum sempat dibuat saat onMounted).
     */
    _updateMarker(lat, lng, draggable = false) {
        if (!this.map || !lat || !lng) return;

        if (!this.marker) {
            this._addMarker(lat, lng, draggable);
        } else {
            this.marker.setLatLng([lat, lng]);
            this.map.setView([lat, lng]);
        }
    }

    _addMarker(lat, lng, draggable = false) {
        this.marker = L.marker([lat, lng], { draggable }).addTo(this.map);
        this.map.setView([lat, lng]);

        if (draggable) {
            this.marker.on("dragend", (e) => {
                const { lat, lng } = e.target.getLatLng();
                this._updateValues(lat, lng);
            });
        }
    }

    _updateValues(lat, lng) {
        this.props.record.update({
            [this.props.name]: lat,
            [this.longitudeField]: lng,
        });
    }

    initMap() {
        const container = this.mapRef.el;
        if (!container || !window.L) return;

        // Fix icon path — Odoo asset bundler merusak auto-detection path Leaflet
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconUrl: "/petadigi/static/lib/leaflet/images/marker-icon.png",
            iconRetinaUrl: "/petadigi/static/lib/leaflet/images/marker-icon.png",
            shadowUrl: "/petadigi/static/lib/leaflet/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });

        // Destroy existing map instance jika ada (cegah error re-render)
        if (this._leafletMap) {
            this._leafletMap.remove();
            this._leafletMap = null;
            this.marker = null;
        }

        container.innerHTML = "";

        const hasCoords = this.latitude && this.longitude;
        const centerLat = hasCoords ? this.latitude : -2.2;
        const centerLng = hasCoords ? this.longitude : 104.5;
        const zoom = hasCoords ? 13 : 6;

        this._leafletMap = L.map(container).setView([centerLat, centerLng], zoom);
        this.map = this._leafletMap;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
        }).addTo(this.map);

        if (hasCoords) {
            this._addMarker(this.latitude, this.longitude, !this.props.readonly);
        }

        if (!this.props.readonly) {
            this.map.on("click", (e) => {
                const { lat, lng } = e.latlng;
                if (!this.marker) {
                    this._addMarker(lat, lng, true);
                } else {
                    this.marker.setLatLng([lat, lng]);
                }
                this._updateValues(lat, lng);
            });
        }
    }
}

registry.category("fields").add("latlong_map_picker", {
    component: LatLongMapPicker,
});
