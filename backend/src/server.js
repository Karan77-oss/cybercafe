"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const db_1 = require("./db");
const timers_1 = require("./timers");
const PORT = process.env.PORT || 4000;
app_1.default.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        await (0, db_1.initDatabase)();
    }
    catch (err) {
        console.error('[Server] Database sync error:', err.message);
    }
    (0, timers_1.startBackgroundTimers)();
});
