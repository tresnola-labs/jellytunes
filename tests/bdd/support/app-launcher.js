"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchApp = launchApp;
exports.getMainWindow = getMainWindow;
exports.closeApp = closeApp;
exports.restartApp = restartApp;
const playwright_1 = require("playwright");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let electronApp = null;
// Función para encontrar el ejecutable de Electron
function getElectronPath() {
    // Go up from tests/bdd/support/ to project root: ../../../.. = 4 levels
    const projectPath = path.resolve(__dirname, '../../../../');
    // Check for packaged app first
    const macAppPath = path.join(projectPath, 'release/mac/Jellysync.app/Contents/MacOS/Jellysync');
    if (fs.existsSync(macAppPath)) {
        return macAppPath;
    }
    // Check for electron in node_modules
    const electronBin = path.join(projectPath, 'node_modules/.bin/electron');
    if (fs.existsSync(electronBin)) {
        return electronBin;
    }
    return 'electron';
}
async function launchApp() {
    // Go up from tests/bdd/support/ to project root: ../../../.. = 4 levels
    const projectPath = path.resolve(__dirname, '../../../../');
    const electronPath = getElectronPath();
    const isPackaged = electronPath.includes('Jellysync.app');
    let args = [];
    let cwd = projectPath;
    if (isPackaged) {
        // For packaged app, don't pass args - it will use its own
        cwd = path.dirname(electronPath);
    }
    else {
        // For dev, run the dist
        args = [path.join(projectPath, 'dist/main/index.js')];
    }
    electronApp = await playwright_1._electron.launch({
        executablePath: electronPath !== 'electron' ? electronPath : undefined,
        args: args.length > 0 ? args : undefined,
        cwd: cwd,
        env: {
            ...process.env,
            NODE_ENV: 'test',
        },
    });
    return electronApp;
}
async function getMainWindow(app) {
    // Wait for first window (60 seconds for CI environments)
    const window = await app.waitForEvent('window', { timeout: 60000 });
    // Wait for DOM to be ready
    await window.waitForLoadState('domcontentloaded');
    return window;
}
async function closeApp(app) {
    if (app) {
        await app.close();
    }
}
async function restartApp() {
    if (electronApp) {
        await electronApp.close();
    }
    const newApp = await launchApp();
    const page = await getMainWindow(newApp);
    return { app: newApp, page };
}
