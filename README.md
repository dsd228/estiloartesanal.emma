# Backend Mercado Pago — estiloartesanal.emma
## Guía de deploy en Render (paso a paso)

---

## ¿Qué hace este servidor?

Tu HTML no puede hablar directamente con Mercado Pago porque el
Access Token es secreto. Este servidor actúa de intermediario:

```
HTML (comprador) → Servidor Render → Mercado Pago → URL de pago
```

---

## PASO 1 — Subir el código a GitHub

1. Creá una cuenta en https://github.com si no tenés
2. Hacé click en **"New repository"**
3. Nombre: `estiloartesanal-backend`
4. Dejalo en **privado** (Private) ← importante
5. Subí estos 4 archivos:
   - `server.js`
   - `package.json`
   - `.gitignore`
   - `.env.example` (el .env real NUNCA se sube)

---

## PASO 2 — Crear el servicio en Render

1. Entrá a https://render.com y creá una cuenta (gratis)
2. Click en **"New +"** → **"Web Service"**
3. Conectá tu cuenta de GitHub y elegí el repo `estiloartesanal-backend`
4. Completá así:

| Campo | Valor |
|---|---|
| Name | `estiloartesanal-backend` |
| Environment | `Node` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Instance Type | **Free** |

5. Click en **"Advanced"** → **"Add Environment Variable"**

---

## PASO 3 — Agregar las variables de entorno en Render

⚠️ Acá es donde ponés tus credenciales REALES de MP (nunca en el código)

| Key | Value |
|---|---|
| `MP_ACCESS_TOKEN` | Tu Access Token (empieza con `APP_USR-`) |
| `FRONTEND_URL` | URL donde está tu HTML (ej: `https://tudominio.com`) |

6. Click en **"Create Web Service"**
7. Render va a instalar todo y arrancar el servidor
8. Te da una URL del tipo: `https://estiloartesanal-backend.onrender.com`

---

## PASO 4 — Conectar el HTML con tu servidor

Abrí `estiloartesanal.html` y buscá esta línea cerca del final:

```javascript
const BACKEND_URL = "https://estiloartesanal-backend.onrender.com";
```

Reemplazá con la URL exacta que te dio Render.

---

## PASO 5 — Probar con credenciales de prueba

Antes de usar el Access Token real, probá con las credenciales TEST:

1. En Render, cambiá `MP_ACCESS_TOKEN` por el que empieza con `TEST-`
2. En el HTML, cambiá esta línea:
   ```javascript
   const urlPago = data.init_point;
   ```
   por:
   ```javascript
   const urlPago = data.sandbox_init_point;
   ```
3. Usá las tarjetas de prueba de MP:
   - Tarjeta: `5031 7557 3453 0604`
   - Vencimiento: cualquier fecha futura
   - CVV: `123`
   - Nombre: `APRO` (para que el pago se apruebe)

---

## PASO 6 — Pasar a producción

Cuando todo funcione con TEST:

1. En Render → Environment Variables → cambiá `MP_ACCESS_TOKEN` al real (`APP_USR-...`)
2. En el HTML volvé a `data.init_point` (sin sandbox)
3. ✅ Listo para recibir pagos reales

---

## Notas importantes

- **Plan Free de Render**: el servidor "duerme" tras 15 min sin uso.
  El primer click puede tardar ~30 segundos en despertar.
  Para evitarlo, podés actualizar al plan Starter ($7/mes).

- **CORS**: si ves errores de CORS, asegurate de que `FRONTEND_URL`
  en Render tenga la URL exacta de tu sitio (sin barra al final).

- **¿Dudas?** Escribile a @estiloartesanal.emma por Instagram 😄

---

## Estructura del proyecto

```
estiloartesanal-backend/
├── server.js          ← el servidor Express
├── package.json       ← dependencias
├── .gitignore         ← excluye node_modules y .env
└── .env.example       ← plantilla de variables (no subir .env real)
```
