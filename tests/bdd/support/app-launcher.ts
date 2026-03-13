import { _electron as electron, ElectronApplication, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

let electronApp: ElectronApplication | null = null;

// Función para encontrar el ejecutable de Electron
function getElectronPath(): string {
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

export async function launchApp(): Promise<ElectronApplication> {
  // Go up from tests/bdd/support/ to project root: ../../../.. = 4 levels
  const projectPath = path.resolve(__dirname, '../../../../');
  const electronPath = getElectronPath();
  
  const isPackaged = electronPath.includes('Jellysync.app');
  
  let args: string[] = [];
  let cwd = projectPath;
  
  if (isPackaged) {
    // For packaged app, don't pass args - it will use its own
    cwd = path.dirname(electronPath);
  } else {
    // For dev, run the dist
    args = [path.join(projectPath, 'dist/main/index.js')];
  }
  
  electronApp = await electron.launch({
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

export async function getMainWindow(app: ElectronApplication): Promise<Page> {
  // Wait for first window (60 seconds for CI environments)
  const window = await app.waitForEvent('window', { timeout: 60000 });
  
  // Wait for DOM to be ready
  await window.waitForLoadState('domcontentloaded');
  
  return window;
}

export async function closeApp(app: ElectronApplication): Promise<void> {
  if (app) {
    await app.close();
  }
}

export async function restartApp(): Promise<{ app: ElectronApplication; page: Page }> {
  if (electronApp) {
    await electronApp.close();
  }
  const newApp = await launchApp();
  const page = await getMainWindow(newApp);
  return { app: newApp, page };
}