const express = require("express");
const cors    = require("cors");
const { MercadoPagoConfig, Preference } = require("mercadopago");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Mercado Pago client ───────────────────────────────────────
// El Access Token se lee desde variables de entorno (nunca en el código)
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// ── Middlewares ───────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  // Reemplazá con tu dominio real cuando lo tengas
  // Ejemplo: "https://estiloartesanal.netlify.app"
  origin: process.env.FRONTEND_URL || "*",
}));

// ── Ruta de prueba ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Backend estiloartesanal.emma funcionando 🌿" });
});

// ── Crear preference de Mercado Pago ─────────────────────────
// El HTML llama a: POST /crear-preferencia
// Body esperado: { producto, precio, nombre, email, telefono, nota }
app.post("/crear-preferencia", async (req, res) => {
  const { producto, precio, nombre, email, telefono, nota } = req.body;

  // Validación mínima
  if (!producto || !precio || !nombre || !email) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  try {
    const preference = new Preference(client);

    const body = {
      items: [
        {
          title:       producto,
          quantity:    1,
          unit_price:  Number(precio),   // precio en pesos argentinos (sin $)
          currency_id: "ARS",
        },
      ],
      payer: {
        name:  nombre,
        email: email,
        phone: telefono ? { number: telefono } : undefined,
      },
      // Nota del comprador como descripción adicional
      additional_info: nota || "",

      // ── URLs de retorno ──────────────────────────────────────
      // Reemplazá con tus URLs reales cuando tengas el dominio
      back_urls: {
        success: `${process.env.FRONTEND_URL || "http://localhost:5500"}/confirmacion.html?status=approved`,
        failure: `${process.env.FRONTEND_URL || "http://localhost:5500"}/confirmacion.html?status=rejected`,
        pending: `${process.env.FRONTEND_URL || "http://localhost:5500"}/confirmacion.html?status=pending`,
      },
      auto_return: "approved",   // redirige automático si el pago se aprueba

      // Notificación de pago (webhook) — opcional pero recomendado
      // notification_url: `${process.env.RENDER_URL}/webhook`,

      // Datos del negocio que aparecen en el checkout de MP
      statement_descriptor: "ESTILO ARTESANAL",
    };

    const result = await preference.create({ body });

    // Devolvemos el init_point (URL de pago) al frontend
    res.json({
      init_point:      result.init_point,       // producción
      sandbox_init_point: result.sandbox_init_point, // pruebas
      preference_id:   result.id,
    });

  } catch (err) {
    console.error("Error Mercado Pago:", err);
    res.status(500).json({ error: "No se pudo crear la preferencia de pago." });
  }
});

// ── Webhook (notificaciones de MP) — OPCIONAL ─────────────────
// Mercado Pago avisa acá cuando un pago cambia de estado
app.post("/webhook", (req, res) => {
  const { type, data } = req.body;
  console.log("Webhook MP:", type, data?.id);
  // Acá podés guardar en base de datos, enviar email, etc.
  res.sendStatus(200);
});

// ── Arrancar servidor ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
