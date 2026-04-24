/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Component,onWillUpdateProps, onWillStart, onMounted } from "@odoo/owl";
import { standardFieldProps, useInputField } from "@web/views/fields/standard_field_props";

export class LatLongMapPicker extends Component {
    static template = "petadigi.LatLongMapPicker";
    static props = {
        ...standardFieldProps,
        latitude: Number,
        longitude: Number,
        readonly: Boolean,
        // fieldName: String, // opsional
    };

    setup() {
        this.input = useInputField(this.props);
        onWillStart(async () => {
            await Promise.all([
                this._loadLeafletAssets()
            ]);
        });
        onMounted(() => this.initMap());
        onWillUpdateProps(nextProps => {
            // Update marker jika value lat/lon berubah dari luar (input manual)
            if (
                nextProps.latitude !== this.props.latitude ||
                nextProps.longitude !== this.props.longitude
            ) {
                this._moveMarker(nextProps.latitude, nextProps.longitude);
            }
        });
    }
    _moveMarker(lat, lng) {
        if (this.marker && lat && lng) {
            this.marker.setLatLng([lat, lng]);
            this.map.setView([lat, lng]); // opsional, agar map ikut center
        }
    }
    async _loadLeafletAssets() {
        if (!window.L) {
            // Load local static asset only once (Odoo asset path)
            await this._loadScript('/petadigi/static/lib/leaflet/leaflet.js');
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = '/petadigi/static/lib/leaflet/leaflet.css';
            document.head.appendChild(cssLink);
        }
    }
    _loadScript(url) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    initMap() {
        const container = this.refs.mapDiv;
        if (!container || window.L === undefined) return;

        // clear previous
        container.innerHTML = "";
        this.map = L.map(container).setView(
            [
                this.props.latitude || -2.2,  // fallback to somewhere in Indonesia
                this.props.longitude || 104.5
            ],
            6
        );
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: "© OpenStreetMap"
        }).addTo(this.map);

        if (this.props.latitude && this.props.longitude) {
            this.marker = L.marker([this.props.latitude, this.props.longitude], {draggable: !this.props.readonly}).addTo(this.map);
        }

        // click to set marker and update value
        if (!this.props.readonly) {
            this.map.on('click', e => {
                const {lat, lng} = e.latlng;
                if (!this.marker) {
                    this.marker = L.marker([lat, lng], {draggable: true}).addTo(this.map);
                } else {
                    this.marker.setLatLng([lat, lng]);
                }
                this.input.update({latitude: lat, longitude: lng});
            });
            if (this.marker) {
                this.marker.on('dragend', (e) => {
                    const {lat, lng} = e.target.getLatLng();
                    this.input.update({latitude: lat, longitude: lng});
                });
            }
        }
    }
}
registry.category("fields").add("latlong_map_picker", LatLongMapPicker);