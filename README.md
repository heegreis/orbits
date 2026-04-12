# Orbits (orbits)

ZeroClaw multiple sessions interface

## Install the dependencies

```bash
yarn
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```

### Lint the files

```bash
yarn lint
```

### Format the files

```bash
yarn format
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

## Deploy the Orbits UI with `Dockerfile`

The root `Dockerfile` builds the Quasar SPA and serves it with `nginx`.
It also proxies selected ZeroClaw gateway routes so the UI and gateway can be accessed under the same origin.

### Build the Docker image locally

```bash
docker build -t orbits-ui .
```

### Run the image locally

By default the UI container proxies gateway traffic to `http://127.0.0.1:42617`.

```bash
docker run --rm -p 80:80 \
  -e GATEWAY_URL=http://127.0.0.1:42617 \
  orbits-ui
```

### Run with a remote or separate ZeroClaw gateway

If the gateway is running on another host or container, set `GATEWAY_URL` to that address.

```bash
docker run --rm -p 80:80 \
  -e GATEWAY_URL=https://your-gateway.example.com \
  orbits-ui
```

### Supported proxied paths

The UI container proxies the following route prefixes to the configured gateway URL:

- `/api`
- `/ws`
- `/admin`
- `/health`
- `/metrics`
- `/pair`
- `/webhook`
- `/whatsapp`
- `/linq`
- `/wati`
- `/nextcloud-talk`
- `/hooks`

### GitHub Actions release workflow

A workflow has been added at `.github/workflows/orbits-static-release.yml` to build the UI and push the Docker image to GitHub Container Registry.
