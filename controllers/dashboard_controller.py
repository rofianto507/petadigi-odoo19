from odoo import http
from odoo.http import request
import json

class DashboardController(http.Controller):

    @http.route('/petadigi/kabupaten/geojson', type='json', auth='user')
    def get_kabupaten_geojson(self):
        kabupaten_list = request.env['petadigi.kabupaten'].sudo().search([])
        features = []
        for kab in kabupaten_list:
            if not kab.geometry:
                continue
            try:
                geom = json.loads(kab.geometry)
                features.append({
                    "type": "Feature",
                    "geometry": geom,
                    "properties": {
                        "id": kab.id,
                        "name": kab.name,
                    }
                })
            except Exception:
                continue
        return {
            "type": "FeatureCollection",
            "features": features
        }