const express = require("express");
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");
const crypto  = require("crypto");
const multer  = require("multer");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Mercado Pago ──────────────────────────────────────────────
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// ── Multer — subida de imágenes ───────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname, ext)
      .toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g,"-");
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg",".jpeg",".png",".webp",".gif"];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error("Solo se permiten imágenes"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 10 }, // 8MB por archivo, máx 10
});

// ── Middlewares ───────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
}));

// ── STOCK — archivo JSON en disco ────────────────────────────
// En Render el sistema de archivos es efímero, pero para este uso
// alcanza. Para persistencia real usar una DB (MongoDB Atlas free tier).
const STOCK_FILE = path.join(__dirname, "stock.json");

const STOCK_DEFAULT = {
  // jabones
  "jabon-lavanda":     { nombre: "Jardín de Lavanda",       categoria: "jabones",      precio: 4800,  stock: 99, imagen: "assets /images/jardinlavanda.png" },
  "jabon-citrico":     { nombre: "Refrescante",              categoria: "jabones",      precio: 4800,  stock: 99, imagen: "assets /images/refrezcante.png" },
  "jabon-romero":      { nombre: "Manzanilla",               categoria: "jabones",      precio: 4800,  stock: 99, imagen: "assets /images/manzanilla.png" },
  "jabon-avena":       { nombre: "Avena",                    categoria: "jabones",      precio: 4800,  stock: 99, imagen: "assets /images/avena.png" },
  "jabon-avenaseda":   { nombre: "Avena & Seda",             categoria: "jabones",      precio: 4800,  stock: 99, imagen: "assets /images/avenaseda.png" },
  "jabon-avenaseda2":  { nombre: "Avena & Seda II",          categoria: "jabones",      precio: 4800,  stock: 99, imagen: "assets /images/avenaseda2.png" },
  "jabon-karite":      { nombre: "Manteca de Karité",        categoria: "jabones",      precio: 4800,  stock: 99, imagen: "assets /images/mantecadekarite.png" },
  "jabon-detox":       { nombre: "Detox",                    categoria: "jabones",      precio: 4800,  stock: 99, imagen: "assets /images/detox.png" },
  "jabon-petalos":     { nombre: "Pétalos",                  categoria: "jabones",      precio: 4800,  stock: 99, imagen: "assets /images/petalos.png" },
  "jabon-cacao":       { nombre: "Dulce Energía Cacao",      categoria: "jabones",      precio: 4800,  stock: 99, imagen: "assets /images/dulceenergiacacao.png" },
  // sahumadores
  "sahumador-gratitud":{ nombre: "Sahumador Gratitud",       categoria: "sahumadores",  precio: 7000,  stock: 1,  imagen: "assets /images/sahumadorchicogratitud.png" },
  "sahumador-magia":   { nombre: "Sahumador Magia",          categoria: "sahumadores",  precio: 7000,  stock: 1,  imagen: "assets /images/sahumadorgrandemagia.png" },
  "sahumador-luz":     { nombre: "Sahumador Luz",            categoria: "sahumadores",  precio: 9000,  stock: 4,  imagen: "assets /images/sahumadorazulluz.png" },
  "sahumador-salmon":  { nombre: "Sahumador Salmón",         categoria: "sahumadores",  precio: 9000,  stock: 1,  imagen: "assets /images/sahumadorsalmon.png" },
  "sahumador-cielo":   { nombre: "Sahumador Cielo",          categoria: "sahumadores",  precio: 9000,  stock: 1,  imagen: "assets /images/sahumadorluzcielo.png" },
  // ceramica
  "cenicero-esmeralda":{ nombre: "Cenicero Esmeralda",       categoria: "ceramica",     precio: 5000,  stock: 1,  imagen: "assets /images/platocupcacke.png" },
  "cuenco-frutilla":   { nombre: "Cuenco Frutilla",          categoria: "ceramica",     precio: 5000,  stock: 1,  imagen: "assets /images/racimofrutillas.png" },
  "cazuela-locro":     { nombre: "Cazuela Locro",            categoria: "ceramica",     precio: 9000,  stock: 3,  imagen: "assets /images/cuencolocro.png" },
  "taza-juana":        { nombre: "Taza Juana",               categoria: "ceramica",     precio: 7500,  stock: 1,  imagen: "assets /images/tazajuana.png" },
  "taza-campo":        { nombre: "Taza Campo",               categoria: "ceramica",     precio: 7500,  stock: 1,  imagen: "assets /images/tazacampo.png" },
  "taza-mariposa":     { nombre: "Taza Mariposa",            categoria: "ceramica",     precio: 7500,  stock: 1,  imagen: "assets /images/tazamariposa.png" },
  "cuenco-sushi":      { nombre: "Cuenco Sushi",             categoria: "ceramica",     precio: 0,     stock: 1,  imagen: "assets /images/cuencosushi.png" },
  "cuenco-grande":     { nombre: "Cuenco Grande Multicolor", categoria: "ceramica",     precio: 0,     stock: 1,  imagen: "assets /images/cuencograndemulticolor.png" },
  // deco
  "casita-grande":     { nombre: "Casita grande Alegría",    categoria: "deco",         precio: 20000, stock: 1,  imagen: "casitagrandealegria.png" },
  "casita-chica":      { nombre: "Casita chica Hogar",       categoria: "deco",         precio: 15000, stock: 1,  imagen: "casitachicahogar.png" },
  "florero-nube":      { nombre: "Florero Nube",             categoria: "deco",         precio: 5000,  stock: 1,  imagen: "assets /images/floreronube.png" },
  "porta-cepillos":    { nombre: "Porta Cepillos Ámbar",     categoria: "deco",         precio: 5000,  stock: 1,  imagen: "assets /images/portacepillosambar.png" },
  "porta-espiral":     { nombre: "Porta Espiral Margarita",  categoria: "deco",         precio: 8000,  stock: 1,  imagen: "assets /images/portaespiral.png" },
  "floreros":          { nombre: "Floreros",                 categoria: "deco",         precio: 0,     stock: 1,  imagen: "assets /images/floreros.png" },
};

function leerStock() {
  try {
    if (fs.existsSync(STOCK_FILE)) {
      return JSON.parse(fs.readFileSync(STOCK_FILE, "utf8"));
    }
  } catch(e) { console.error("Error leyendo stock:", e); }
  return { ...STOCK_DEFAULT };
}

function guardarStock(data) {
  try { fs.writeFileSync(STOCK_FILE, JSON.stringify(data, null, 2)); }
  catch(e) { console.error("Error guardando stock:", e); }
}

// Inicializar stock si no existe
if (!fs.existsSync(STOCK_FILE)) guardarStock(STOCK_DEFAULT);

// ── SESIONES ADMIN (persistidas en archivo) ──────────────────
const SESSIONS_FILE = path.join(__dirname, "sessions.json");

function leerSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE))
      return new Map(Object.entries(JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"))));
  } catch(e) {}
  return new Map();
}

function guardarSessions(map) {
  try { fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Object.fromEntries(map))); }
  catch(e) {}
}

const sessions = leerSessions();

function crearToken() {
  return crypto.randomBytes(32).toString("hex");
}

function verificarAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  return sessions.has(token);
}

// ── RUTAS PÚBLICAS ────────────────────────────────────────────

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Backend estiloartesanal.emma 🌿" });
});

// GET /stock — devuelve todo el stock (público, para mostrar en la web)
app.get("/stock", (req, res) => {
  res.json(leerStock());
});

// GET /stock/:id — devuelve un producto
app.get("/stock/:id", (req, res) => {
  const stock = leerStock();
  const prod = stock[req.params.id];
  if (!prod) return res.status(404).json({ error: "Producto no encontrado" });
  res.json(prod);
});

// GET /productos.json — catálogo público en formato JSON (para que index.html lo consuma)
app.get("/productos.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  res.json(leerStock());
});

// POST /crear-preferencia — crea preferencia MP y descuenta stock
app.post("/crear-preferencia", async (req, res) => {
  const { producto, precio, nombre, email, telefono, nota, productoId } = req.body;

  if (!producto || !precio || !nombre || !email) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  // Verificar stock si se envió productoId
  if (productoId) {
    const stock = leerStock();
    const item = stock[productoId];
    if (item && item.stock <= 0) {
      return res.status(400).json({ error: "Este producto está agotado." });
    }
  }

  try {
    const preference = new Preference(client);
    const body = {
      items: [{
        title:      producto,
        quantity:   1,
        unit_price: Number(precio),
        currency_id:"ARS",
      }],
      payer: {
        name:  nombre,
        email: email,
        phone: telefono ? { number: telefono } : undefined,
      },
      additional_info: nota || "",
      back_urls: {
        success: `${process.env.FRONTEND_URL || "http://localhost:5500"}/confirmacion.html?status=approved`,
        failure: `${process.env.FRONTEND_URL || "http://localhost:5500"}/confirmacion.html?status=rejected`,
        pending: `${process.env.FRONTEND_URL || "http://localhost:5500"}/confirmacion.html?status=pending`,
      },
      auto_return:          "approved",
      statement_descriptor: "ESTILO ARTESANAL",
      // Guardamos el productoId en metadata para descontar en webhook
      external_reference: productoId || "",
    };

    const result = await preference.create({ body });

    res.json({
      init_point:         result.init_point,
      sandbox_init_point: result.sandbox_init_point,
      preference_id:      result.id,
    });

  } catch (err) {
    console.error("Error MP:", err);
    res.status(500).json({ error: "No se pudo crear la preferencia de pago." });
  }
});

// POST /webhook — MP notifica pagos aprobados → descuenta stock
app.post("/webhook", (req, res) => {
  const { type, data } = req.body;
  console.log("Webhook MP:", type, data?.id);

  if (type === "payment" && data?.id) {
    // Asíncrono — no bloquea la respuesta
    (async () => {
      try {
        const paymentClient = new Payment(client);
        const payment = await paymentClient.get({ id: data.id });

        if (payment.status === "approved") {
          const productoId = payment.external_reference;
          if (productoId) {
            const stock = leerStock();
            if (stock[productoId] && stock[productoId].stock > 0) {
              stock[productoId].stock -= 1;
              guardarStock(stock);
              console.log(`✅ Stock descontado: ${productoId} → ${stock[productoId].stock}`);
            }
          }
        }
      } catch(e) {
        console.error("Error procesando webhook:", e);
      }
    })();
  }

  res.sendStatus(200);
});

// ── RUTAS ADMIN ───────────────────────────────────────────────

// POST /admin/login
app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || "emma2026";

  if (password !== ADMIN_PASS) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }

  const token = crearToken();
  sessions.set(token, { createdAt: Date.now() });

  // Limpiar tokens viejos (> 30 días)
  for (const [t, s] of sessions) {
    if (Date.now() - s.createdAt > 30 * 24 * 60 * 60 * 1000) sessions.delete(t);
  }

  guardarSessions(sessions);
  res.json({ token });
});

// POST /admin/logout
app.post("/admin/logout", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  sessions.delete(token);
  guardarSessions(sessions);
  res.json({ ok: true });
});

// GET /admin/stock — stock completo (requiere auth)
app.get("/admin/stock", (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });
  res.json(leerStock());
});

// PUT /admin/stock/:id — actualizar producto (stock, precio, nombre)
app.put("/admin/stock/:id", (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });

  const stock = leerStock();
  const id    = req.params.id;
  const { nombre, precio, stock: newStock, categoria, imagen, activo } = req.body;

  if (!stock[id]) return res.status(404).json({ error: "Producto no encontrado" });

  if (nombre        !== undefined) stock[id].nombre         = nombre;
  if (precio        !== undefined) stock[id].precio         = Number(precio);
  if (newStock      !== undefined) stock[id].stock          = Number(newStock);
  if (categoria     !== undefined) stock[id].categoria      = categoria;
  if (imagen        !== undefined) stock[id].imagen         = imagen;
  if (activo        !== undefined) stock[id].activo         = activo;
  if (req.body.peso          !== undefined) stock[id].peso          = req.body.peso;
  if (req.body.descripcion   !== undefined) stock[id].descripcion   = req.body.descripcion;
  if (req.body.ingredientes  !== undefined) stock[id].ingredientes  = req.body.ingredientes;
  if (req.body.caracteristicas !== undefined) stock[id].caracteristicas = req.body.caracteristicas;

  guardarStock(stock);
  res.json({ ok: true, producto: stock[id] });
});

// POST /admin/stock — agregar nuevo producto
app.post("/admin/stock", (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });

  const stock = leerStock();
  const { id, nombre, precio, stockNum, categoria, imagen } = req.body;

  if (!id || !nombre) return res.status(400).json({ error: "id y nombre son obligatorios" });
  if (stock[id])       return res.status(400).json({ error: "Ya existe un producto con ese id" });

  stock[id] = {
    nombre,
    categoria: categoria || "jabones",
    precio:    Number(precio) || 0,
    stock:     Number(stockNum) || 1,
    imagen:    imagen || "",
    activo:    true,
  };

  guardarStock(stock);
  res.json({ ok: true, producto: stock[id] });
});

// DELETE /admin/stock/:id — eliminar producto
app.delete("/admin/stock/:id", (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });

  const stock = leerStock();
  if (!stock[req.params.id]) return res.status(404).json({ error: "Producto no encontrado" });

  delete stock[req.params.id];
  guardarStock(stock);
  res.json({ ok: true });
});

// ── RUTAS DE IMÁGENES ─────────────────────────────────────────

// Servir imágenes subidas públicamente
app.use("/uploads", express.static(UPLOADS_DIR));

// POST /admin/upload — subir una o varias imágenes
app.post("/admin/upload", (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });

  upload.array("imagenes", 10)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No se recibieron archivos" });
    }

    const urls = req.files.map(f => ({
      filename: f.filename,
      url: `/uploads/${f.filename}`,
      size: f.size,
    }));

    res.json({ ok: true, archivos: urls });
  });
});

// DELETE /admin/upload/:filename — eliminar imagen
app.delete("/admin/upload/:filename", (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });

  const filename = path.basename(req.params.filename); // seguridad
  const filepath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: "Archivo no encontrado" });
  }

  fs.unlinkSync(filepath);
  res.json({ ok: true });
});

// GET /admin/uploads — listar todas las imágenes subidas
app.get("/admin/uploads", (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });

  const files = fs.readdirSync(UPLOADS_DIR)
    .filter(f => [".jpg",".jpeg",".png",".webp",".gif"].includes(path.extname(f).toLowerCase()))
    .map(f => ({
      filename: f,
      url: `/uploads/${f}`,
      size: fs.statSync(path.join(UPLOADS_DIR, f)).size,
      fecha: fs.statSync(path.join(UPLOADS_DIR, f)).mtime,
    }))
    .sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

  res.json(files);
});

// ── ARRANCAR ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
