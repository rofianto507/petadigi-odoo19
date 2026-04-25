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

            if (nextLat !== curLat || nextLng !== curLng) {
                this._moveMarker(nextLat, nextLng);
            }
        });
    }

    get longitudeField() {
        return this.props.longitude_field || "longitude";
    }

    get latitude() {
        return this.props.value || 0;
    }

    get longitude() {
        return this.props.record.data[this.longitudeField] || 0;
    }

    _moveMarker(lat, lng) {
        if (this.marker && lat && lng) {
            this.marker.setLatLng([lat, lng]);
            this.map.setView([lat, lng]);
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

        // Destroy existing map instance jika ada (cegah error re-render)
        if (this._leafletMap) {
            this._leafletMap.remove();
            this._leafletMap = null;
            this.marker = null;
        }

        container.innerHTML = "";

        const centerLat = this.latitude || -2.2;
        const centerLng = this.longitude || 104.5;

        this._leafletMap = L.map(container).setView([centerLat, centerLng], 9);
        this.map = this._leafletMap;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
        }).addTo(this.map);

        if (this.latitude && this.longitude) {
            this.marker = L.marker([this.latitude, this.longitude], {
                draggable: !this.props.readonly,
            }).addTo(this.map);
        }

        if (!this.props.readonly) {
            this.map.on("click", (e) => {
                const { lat, lng } = e.latlng;
                if (!this.marker) {
                    this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
                } else {
                    this.marker.setLatLng([lat, lng]);
                }
                this._updateValues(lat, lng);
            });

            if (this.marker) {
                this.marker.on("dragend", (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    this._updateValues(lat, lng);
                });
            }
        }
    }
}

// ✅ Odoo 17+/19: harus pakai format object { component: ... }
registry.category("fields").add("latlong_map_picker", {
    component: LatLongMapPicker,
});
