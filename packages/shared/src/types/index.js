"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViolationType = exports.RoundStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["SUPERADMIN"] = "SUPERADMIN";
    Role["EVENT_ORGANIZER"] = "EVENT_ORGANIZER";
    Role["PARTICIPANT_TEAM"] = "PARTICIPANT_TEAM";
})(Role || (exports.Role = Role = {}));
var RoundStatus;
(function (RoundStatus) {
    RoundStatus["CREATED"] = "CREATED";
    RoundStatus["LOBBY_OPEN"] = "LOBBY_OPEN";
    RoundStatus["LOBBY_LOCKED"] = "LOBBY_LOCKED";
    RoundStatus["ROUND_ACTIVE"] = "ROUND_ACTIVE";
    RoundStatus["ROUND_PAUSED"] = "ROUND_PAUSED";
    RoundStatus["ROUND_ENDED"] = "ROUND_ENDED";
    RoundStatus["SCORING_COMPLETE"] = "SCORING_COMPLETE";
    RoundStatus["RESULTS_PUBLISHED"] = "RESULTS_PUBLISHED";
})(RoundStatus || (exports.RoundStatus = RoundStatus = {}));
var ViolationType;
(function (ViolationType) {
    ViolationType["TAB_SWITCH"] = "TAB_SWITCH";
    ViolationType["WINDOW_BLUR"] = "WINDOW_BLUR";
    ViolationType["FULLSCREEN_EXIT"] = "FULLSCREEN_EXIT";
    ViolationType["KEYBOARD_SHORTCUT"] = "KEYBOARD_SHORTCUT";
    ViolationType["CONTEXT_MENU"] = "CONTEXT_MENU";
    ViolationType["NETWORK_DISCONNECT"] = "NETWORK_DISCONNECT";
})(ViolationType || (exports.ViolationType = ViolationType = {}));
//# sourceMappingURL=index.js.map