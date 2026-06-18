/** @odoo-module **/

import { registry } from "@web/core/registry";
import { standardFieldProps } from "@web/views/fields/standard_field_props";
import { Component, useState, useRef, onWillUpdateProps } from "@odoo/owl";

export class ImagePopupField extends Component {
    static template = "petadigi.ImagePopupField";
    static props = { ...standardFieldProps };

    setup() {
        this.state = useState({ showPopup: false, previewSrc: null });
        this.fileInputRef = useRef("fileInput");

        // Reset preview ketika berpindah ke record lain
        onWillUpdateProps((nextProps) => {
            if (nextProps.record.resId !== this.props.record.resId) {
                this.state.previewSrc = null;
            }
        });
    }

    get imageSrc() {
        // Preview lokal (baru saja dipilih, belum disimpan) didahulukan
        if (this.state.previewSrc) return this.state.previewSrc;

        const { record, name } = this.props;
        const value = record.data[name];
        if (!value || !record.resId) return null;
        return `/web/image/${record.resModel}/${record.resId}/${name}`;
    }

    get isEditable() {
        return !this.props.readonly;
    }

    triggerUpload() {
        this.fileInputRef.el.click();
    }

    onFileChange(ev) {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            // Tampilkan preview langsung tanpa menunggu server
            this.state.previewSrc = dataUrl;
            // Simpan base64 ke record (tanpa prefix data URI)
            this.props.record.update({ [this.props.name]: dataUrl.split(",")[1] });
        };
        reader.readAsDataURL(file);
        // Reset input agar file yang sama bisa dipilih lagi
        ev.target.value = "";
    }

    clearImage() {
        this.state.previewSrc = null;
        this.props.record.update({ [this.props.name]: false });
    }

    openPopup() {
        this.state.showPopup = true;
    }

    closePopup() {
        this.state.showPopup = false;
    }
}

registry.category("fields").add("image_popup", {
    component: ImagePopupField,
    supportedTypes: ["binary"],
});
