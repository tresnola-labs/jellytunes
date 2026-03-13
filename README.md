# Jellysync

Sincronizador de música Jellyfin → dispositivos MP3/FLAC

[![BDD Tests](https://github.com/edgarquasarz/jellysync/actions/workflows/bdd-tests.yml/badge.svg)](https://github.com/edgarquasarz/jellysync/actions/workflows/bdd-tests.yml)

## Desarrollo

```bash
pnpm install
pnpm dev
```

## Tests BDD

```bash
# Ejecutar tests
pnpm test:bdd

# Desarrollo con UI visible
pnpm test:bdd:dev

# CI (headless)
pnpm test:bdd:ci

# Ver reporte HTML
pnpm test:bdd:report
```

## Configuración ignored

```
node_modules/
dist/
release/
*.log
test-*
```
