/** @odoo-module **/
import { listView } from "@web/views/list/list_view";
import { ListController } from "@web/views/list/list_controller";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

export class KriminalitasListController extends ListController {
    setup() {
        super.setup();
        this.actionService = useService("action");
    }

    async openImportWizard() {
        await this.actionService.doAction({
            type: "ir.actions.act_window",
            name: "Import Dokumen LP",
            res_model: "petadigi.import.lp.wizard",
            view_mode: "form",
            target: "new",
        });
    }
}

// Tidak perlu set custom template - gunakan template web.ListController yang sudah di-extend
const kriminalitasListView = {
    ...listView,
    Controller: KriminalitasListController,
};

registry.category("views").add("kriminalitas_list", kriminalitasListView);
