/**
 * this module contains classes of measurements.
 */

exports.OneMinRR = class OneMinRR {
    constructor(dwdId, rs) {
        this.dwdId = dwdId;
        this.rs = rs;
    } // endfun
    getValues() {
        return { rs: this.rs }
    } // endfun
    getId() {
        return this.dwdId;
    } // endfun
} // endclass

exports.TenMinRR = class TenMinRR {
    constructor(dwdId, rws) {
        this.dwdId = dwdId;
        this.rws = rws;
    } // endfun
    getValues() {
        return { rws: this.rws }
    } // endfun
    getId() {
        return this.dwdId;
    } // endfun
} // endclass

exports.TenMinFF = class TenMinFF {
    constructor(dwdId, ff, dd) {
        this.dwdId = dwdId;
        this.ff = ff;
        this.dd = dd;
    } // endfun
    getValues() {
        return {
            ff: this.ff,
            dd: this.dd
        }
    } // endfun
    getId() {
        return this.dwdId;
    } // endfun
} // endclass

exports.TenMinTU = class TenMinTU {
    constructor(dwdId, pp, tt) {
        this.dwdId = dwdId;
        this.pp = pp;
        this.tt = tt;
    } // endfun
    getValues() {
        return {
            pp: this.pp,
            tt: this.tt
        }
    } // endfun
    getId() {
        return this.dwdId;
    } // endfun
} // endclass

