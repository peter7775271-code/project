# TikZ Render Service (Docker)

This service renders TikZ to PNG using LaTeX in a Docker container.

## 1) Start the service

```bash
docker compose up -d --build
```

The service listens on http://localhost:5005

Health check:
- GET http://localhost:5005/health

## 2) Configure your app

Set this environment variable for your Next.js app:

```
TIKZ_RENDER_URL=http://localhost:5005/render
```

When set, [src/app/api/render-tikz/route.ts](src/app/api/render-tikz/route.ts) will proxy requests to the Docker service.

## 3) Request format

POST /render

```json
{
  "tikzCode": "\\begin{tikzpicture}...\\end{tikzpicture}"
}
```

Response:

```json
{
  "success": true,
  "type": "png",
  "dataUrl": "data:image/png;base64,..."
}
```
