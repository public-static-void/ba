/**
 * this module contains classes of forecasts.
 */

exports.Mos = class Mos {
    constructor(mosId, pppp, ttt, ff, dd, rrl1c, r101) {
        this.mosId = mosId;
        this.pppp = pppp;
        this.ttt = ttt;
        this.ff = ff;
        this.dd = dd;
        this.rrl1c = rrl1c;
        this.r101 = r101;
    } // endfun
    getValues() {
        return {
            pppp: this.pppp,
            ttt: this.ttt,
            ff: this.ff,
            dd: this.dd,
            rrl1c: this.rrl1c,
            r101: this.r101
        }
    } // endfun
    getId() {
        return this.mosId;
    } // endfun
} // endclass