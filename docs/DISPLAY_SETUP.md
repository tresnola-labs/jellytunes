# Configuración de Display Virtual para Testing de Electron

## Resumen Ejecutivo

**Problema:** TicoQA opera en un entorno headless (sin display gráfico) que impide ejecutar aplicaciones Electron y realizar capturas de pantalla visuales para testing.

**Solución:** Electron **requiere un display** para funcionar. No tiene modo headless real como Chromium. Las opciones son:
- **macOS:** BetterDummy (software) o Dummy Plug (hardware)
- **Linux:** Xvfb (X Virtual Framebuffer)
- **Docker:** Imágenes preparadas con Xvfb

---

## Opción 1: Xvfb (Linux/Servidores)

### Descripción
Xvfb (X Virtual Framebuffer) es un display server que ejecuta operaciones gráficas en memoria sin mostrar pantalla física. Es la solución estándar para CI/CD en Linux.

### Instalación en Linux/Ubuntu/Debian

```bash
# Instalar paquetes necesarios
sudo apt-get update
sudo apt-get install -y xvfb fluxbox x11-utils

# Opcional: herramientas adicionales
sudo apt-get install -y x11-apps x11-xserver-utils
```

### Instalación en macOS (XQuartz)

```bash
# macOS no tiene Xvfb nativo, requiere XQuartz (X11)
brew install --cask xquartz

# Requiere logout/login después de instalación
# Xvfb se incluye con XQuartz
```

### Configuración Básica

```bash
# 1. Iniciar Xvfb en display :99
Xvfb :99 -screen 0 1920x1080x24 &

# 2. Exportar variable DISPLAY
export DISPLAY=:99

# 3. Opcional: Iniciar window manager ligero
fluxbox -display :99 &

# 4. Ejecutar tests
pnpm test:bdd
```

### Script de Inicio (start-xvfb.sh)

```bash
#!/bin/bash
# start-xvfb.sh - Script para iniciar display virtual

DISPLAY_NUM=99
SCREEN_SIZE="1920x1080x24"

# Verificar si Xvfb ya está corriendo
if pgrep -x "Xvfb" > /dev/null; then
    echo "Xvfb ya está corriendo"
    exit 0
fi

# Iniciar Xvfb
Xvfb :$DISPLAY_NUM -screen 0 $SCREEN_SIZE -ac &
XVFB_PID=$!

# Esperar a que Xvfb inicie
sleep 2

# Iniciar fluxbox (window manager ligero) - opcional pero recomendado
fluxbox -display :$DISPLAY_NUM &
FLUXBOX_PID=$!

echo "Xvfb iniciado en display :$DISPLAY_NUM (PID: $XVFB_PID)"
echo "Fluxbox iniciado (PID: $FLUXBOX_PID)"

# Exportar para sesiones futuras
echo "export DISPLAY=:$DISPLAY_NUM"
```

### Script de Tests con Xvfb (run-tests-xvfb.sh)

```bash
#!/bin/bash
# run-tests-xvfb.sh - Ejecutar tests con display virtual

set -e

export DISPLAY=:99

# Iniciar Xvfb si no está corriendo
if ! pgrep -x "Xvfb" > /dev/null; then
    Xvfb :99 -screen 0 1920x1080x24 -ac &
    sleep 2
fi

# Compilar y ejecutar tests
cd /path/to/jellytunes
pnpm build
pnpm test:bdd:ci

# Cleanup opcional
# pkill -x Xvfb
```

### Herramienta xvfb-run

Alternativa más simple usando `xvfb-run`:

```bash
# Instalar
sudo apt-get install xvfb

# Uso directo
xvfb-run -a --server-args="-screen 0 1920x1080x24" pnpm test:bdd

# Con auto-detección (Linux solo)
xvfb-maybe pnpm test:bdd
# xvfb-maybe ejecuta con xvfb en Linux, directo en macOS/Windows
```

---

## Opción 2: BetterDummy (macOS - Software)

### Descripción
BetterDummy crea displays virtuales "dummy" en macOS sin necesidad de hardware físico. Es ideal para Macs headless (Mac Mini, Mac Studio) donde no hay monitor conectado.

### Instalación

```bash
# Descargar desde GitHub releases
# https://github.com/waydabber/BetterDummy/releases

# O con Homebrew (si está disponible)
brew install --cask betterdummy
```

### Configuración

1. **Crear Dummy Display:**
   - Abrir BetterDummy
   - Menú → Create New Dummy
   - Seleccionar aspect ratio (16:9 recomendado)
   - Elegir resolución (1920x1080 o superior)

2. **Configurar como Principal:**
   - System Preferences → Displays
   - Verás "Dummy 16:9" como display virtual
   - Activar "Mirror" si es necesario
   - Configurar como "Optimize for" el dummy

### Ventajas
- ✅ Sin hardware físico
- ✅ Funciona en macOS native
- ✅ Soporta HiDPI/Retina
- ✅ Reanuda configuración tras reinicio
- ✅ Gratuito (open source)

### Desventajas
- ⚠️ Requiere sesión de usuario activa (GUI)
- ⚠️ No funciona en arranque headless puro
- ⚠️ Consume recursos de GPU virtual

### Script de Automatización (macOS)

```bash
#!/bin/bash
# setup-headless-mac.sh

# BetterDummy debe estar instalado y configurado previamente
# Este script asume que el dummy ya existe

# Verificar que hay un display activo
if ! system_profiler SPDisplaysDataType | grep -q "Display"; then
    echo "ERROR: No hay display activo"
    echo "Instala BetterDummy y crea un dummy display"
    exit 1
fi

# Ejecutar tests
cd /path/to/jellytunes
pnpm build
pnpm test:bdd
```

---

## Opción 3: HDMI Dummy Plug (macOS/Linux - Hardware)

### Descripción
Adaptador físico HDMI que emula un monitor conectado. Es plug-and-play y funciona en cualquier sistema consalida HDMI.

### Modelos Recomendados

| Modelo | Resolución | Precio | Compatibilidad |
|--------|-----------|--------|----------------|
| DTECH HDMI Dummy | 4K | ~$15 | Universal |
| FUERAN 4K HDR | 4K HDR | ~$20 | Universal |
| fit-Headless | 1080p | ~$10 | Universal |

### Configuración

```bash
# Conectar el dummy plug al puerto HDMI
# El sistema detectará automáticamente un "monitor"
# No requiere configuración adicional

# Verificar display detectado
system_profiler SPDisplaysDataType  # macOS
xrandr                              # Linux
```

### Ventajas
- ✅ Plug & Play
- ✅ Sin software adicional
- ✅ Funciona en arranque
- ✅ Resolución garantizada

### Desventajas
- ⚠️ Coste (#15-20)
- ⚠️ Puerto HDMI ocupado
- ⚠️ Puede causar problemas con GPU si múltiples

---

## Opción 4: Docker con Soporte Gráfico

### Dockerfile para Testing Electron

```dockerfile
# Dockerfile.test
FROM node:20-slim

# Instalar dependencias de display
RUN apt-get update && apt-get install -y \
    xvfb \
    fluxbox \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libatspi2.0-0 \
    libuuid1 \
    libsecret-1-0 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de proyecto
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

# Build
RUN pnpm build

# Script de entrada
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
```

### docker-entrypoint.sh

```bash
#!/bin/bash
# docker-entrypoint.sh

# Iniciar Xvfb
export DISPLAY=:99
Xvfb :99 -screen 0 1920x1080x24 -ac &
sleep 2

# Iniciar fluxbox
fluxbox -display :99 &

# Ejecutar comando
exec "$@"
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  jellytunes-test:
    build:
      context: .
      dockerfile: Dockerfile.test
    volumes:
      - ./tests/bdd/screenshots:/app/tests/bdd/screenshots
      - ./tests/bdd/reports:/app/tests/bdd/reports
    command: pnpm test:bdd:ci
    environment:
      - DISPLAY=:99
```

### Ejecutar Container

```bash
# Construir imagen
docker build -t jellytunes-test -f Dockerfile.test .

# Ejecutar tests
docker run --rm \
    -v $(pwd)/tests/bdd/screenshots:/app/tests/bdd/screenshots \
    -v $(pwd)/tests/bdd/reports:/app/tests/bdd/reports \
    jellytunes-test \
    pnpm test:bdd:ci

# O con docker-compose
docker-compose up --rm jellytunes-test
```

---

## Opción 5: Playwright con Headed Mode (no headless)

### Importante
Playwright **NO** puede ejecutar Electron en modo headless real. Electron siempre necesita un display. Esta "opción" es para desarrollo local con UI visible.

### playwright.config.ts para Desarrollo Local

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/bdd/features',
  
  // Runs yprojects (Electron no usa browser)
  projects: [
    {
      name: 'electron',
      use: {
        // Para desarrollo - requiere display
        headless: false,
        
        // Opciones de Electron
        launchOptions: {
          slowMo: 100, // Slow down para debugging
        },
      },
    },
  ],
});
```

### app-launcher.ts con Detección de Entorno

```typescript
import { _electron as electron, ElectronApplication } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

export async function launchApp(headless?: boolean): Promise<ElectronApplication> {
  const projectPath = path.resolve(__dirname, '../../../');
  const electronPath = getElectronPath();  
  const isPackaged = electronPath.includes('JellyTunes.app');
  
  // Detectar si hay display disponible
  const hasDisplay = process.env.DISPLAY || process.env.WAYLAND_DISPLAY;
  
  // En headless, verificar que Xvfb está corriendo
  if (!hasDisplay && process.env.CI) {
    throw new Error(
      'No hay display disponible. ' +
      'Inicia Xvfb: Xvfb :99 -screen 0 1920x1080x24 & export DISPLAY=:99'
    );
  }
  
  let args: string[] = [];
  if (!isPackaged) {
    args = [path.join(projectPath, 'dist/main/index.js')];
  }
  
  const app = await electron.launch({
    executablePath: electronPath !== 'electron' ? electronPath : undefined,
    args: args.length > 0 ? args : undefined,
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });
  
  return app;
}
```

---

## Integración con Tests Actuales de JellyTunes

### Modificación de cucumber.js

```javascript
const config = {
  default: {
    format: ['progress', 'html:./tests/bdd/reports/cucumber-report.html'],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    paths: ['tests/bdd/features/**/*.feature'],
    require: ['tests/bdd/dist/steps/**/*.js', 'tests/bdd/dist/support/**/*.js'],
    publishQuiet: true,
    worldParameters: {
      headless: true,  // Valor por defecto
    },
  },
  
  // Perfil para CI con Xvfb
  ci: {
    format: ['json:./tests/bdd/reports/cucumber-report.json'],
    worldParameters: {
      headless: true,
      // Xvfb debe estar corriendo con DISPLAY=:99
    },
  },
  
  // Perfil para desarrollo local (con display)
  dev: {
    worldParameters: {
      headless: false,
      slowMo: 100,
    },
  },};
module.exports = config;
```

### Script de Package.jsonpara CI

```json
{
  "scripts": {
    "test:bdd:ci": "xvfb-run -a --server-args=\"-screen 0 1920x1080x24\" pnpm test:bdd",
    "test:bdd:docker": "docker-compose up --rm jellytunes-test"
  }
}
```

---

## Capturas de Pantalla con Xvfb

### Verificar que Xvfb Permite Screenshots

```typescript
// En hooks.ts
import { Before, After, Status } from '@cucumber/cucumber';
import { ICustomWorld } from './world';

After(async function (this: ICustomWorld, scenario) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    const screenshot = await this.page.screenshot({
      path: `./tests/bdd/screenshots/${scenario.pickle.name.replace(/\s+/g, '_')}.png`,
      fullPage: true,
    });
    this.attach(screenshot, 'image/png');
  }
});
```

**Importante:** Xvfb renderiza en memoria, los screenshots funcionan correctamente.

### DevTools con Xvfb

Para acceder a DevTools remotamente:

```typescript
// En app-launcher.ts
const app = await electron.launch({
  executablePath: electronPath,
  args: [...args, '--remote-debugging-port=9222'],
});

// Acceder a DevToolsvia Chrome
// chrome://inspect_CONNECT#devices
// O usar CDP (Chrome DevTools Protocol)
```

---

## Comparativa de Opciones

| Opción | SO | Complejidad | Coste | Screenshots | DevTools | Recomendación |
|--------|-------|-------------|-------|-------------|----------|---------------|
| **Xvfb** | Linux | Media | Gratis | ✅ Sí | ✅ Remote | **Mejor para CI/CD Linux** |
| **BetterDummy** | macOS | Baja | Gratis | ✅ Sí | ✅ Normal | **Mejor para Mac headless** |
| **Dummy Plug** | Todos | Muy baja | ~$15 | ✅ Sí | ✅ Normal | **Más simple universal** |
| **Docker + Xvfb** | Todos | Alta | Gratis | ✅ Sí | ✅ Remote | **Mejor aislamiento** |
| **Headed local** | Todos | N/A | N/A | ✅ Sí | ✅ Normal | **Solo desarrollo** |

---

## Recomendación por Entorno

### Para TicoQA (macOSactual: MbPr0-2012-h34dl3ss)

**Opción recomendada: BetterDummy o Dummy Plug**

```bash
# Opción A: BetterDummy (gratuito)
# 1. Descargar de: https://github.com/waydabber/BetterDummy/releases
# 2. Instalar y crear dummy display
# 3. Ejecutar tests normalmente

# Opción B: Dummy Plug (hardware)
# 1. Comprar HDMI dummy plug (~$15)
# 2. Conectar al puerto HDMI
# 3. Ejecutar tests normalmente
```

### Para CI/CD (GitHub Actions, Jenkins, etc.)

**Opción recomendada: Xvfb o Docker**

```yaml
# GitHub Actions ejemplo
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          sudo apt-get install -y xvfb fluxbox
          npm install -g pnpm
          pnpm install
      
      - name: Run tests with Xvfb
        run: |
          xvfb-run -a --server-args="-screen 0 1920x1080x24" \
            pnpm test:bdd:ci---### Para Servidor Linux Headless

**Opción recomendada: Xvfb + Script de inicio**

```bash
# Instalar una vez
sudo apt-get install -y xvfb fluxbox

# Crear servicio systemd (opcional)
sudo tee /etc/systemd/system/xvfb.service <<EOF
[Unit]
Description=X Virtual Framebuffer
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/Xvfb :99 -screen 0 1920x1080x24 -ac
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable xvfb
sudo systemctl start xvfb

# Exportar DISPLAY permanentemente
echo 'export DISPLAY=:99' >> ~/.bashrc
```

---

## Troubleshooting

### Error: "Electron failed to launch"

```
Error: Electron failed to launch: No display found
```

**Solución:**
```bash
# Verificar que Xvfb está corriendo
pgrep -x Xvfb && echo "Xvfb running" || Xvfb :99 -screen 0 1920x1080x24 &

# Verificar DISPLAY
echo $DISPLAY
# Debe mostrar :99

# Si no, exportar
export DISPLAY=:99
```

### Error: "Cannot take screenshot"

```
Error: page.screenshot: Unable to capture screenshot
```

**Solución:**
```bash
# Asegurar que fluxbox está corriendo (gestiona ventanas)
fluxbox -display :99 &

# Verificar que la app Electron se lanzó correctamente
# Aumentar timeout en hooks.ts
```

### Error: "App timeout waiting for window"

```
TimeoutError: page.waitForEvent: Timeout waiting for window
```

**Solución:**
```typescript
// Aumentar timeout en app-launcher.ts
const window = await app.waitForEvent('window', { timeout: 30000 }); // 30s
```

### Tests Intermitentes

```javascript
// En cucumber.js, aumentar timeouts
default: {
  timeout: 60000, // 60 segundos por escenario
}
```

---

## Checklist de Implementación

- [ ] Elegir solución según SO y entorno
- [ ] Instalar dependencias (Xvfb/fluxbox o BetterDummy)
- [ ] Configurar variable DISPLAY
- [ ] Modificar scripts de ejecución
- [ ] Verificar screenshots funcionan
- [ ] Configurar CI/CD workflow
- [ ] Documentar en README del proyecto

---

## Referencias

- [Electron docs - Testing on Headless CI](https://www.electronjs.org/docs/latest/tutorial/testing-on-headless-ci)
- [Playwright docs - Electron](https://playwright.dev/docs/api/class-electron)
- [BetterDummy GitHub](https://github.com/waydabber/BetterDummy)
- [Xvfb Wikipedia](https://en.wikipedia.org/wiki/Xvfb)
- [RunningE2E in Docker with Electron](https://blog.dangl.me/archive/running-fully-automated-e2e-tests-in-electron-in-a-docker-container-with-playwright/)

---

*Documento creado para TicoQA - JellyTunes Testing*
*Fecha: 2026-03-13*