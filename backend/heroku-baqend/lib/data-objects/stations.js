/**
 * this module contains classes of stations.
 */

exports.Station = class Station {
    constructor(dwdId, mosId, name, geoLon, geoLat) {
        this.dwdId = dwdId;
        this.mosId = mosId;
        this.name = name;
        this.geoLon = geoLon;
        this.geoLat = geoLat;
    } // endfun
    getMeta() {
        return {
            dwd_id: this.dwdId,
            mos_id: this.mosId,
            name: this.name,
            geo_lon: this.geoLon,
            geo_lat: this.geoLat
        }
    } // endfun
}