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
  const allowed = [".webp",".jpeg",".png",".webp",".gif"];
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
  origin: function(origin, callback) {
    const allowed = [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
    ].filter(Boolean);
    // Permitir requests sin origin (ej: Postman, curl)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
}));

// ── STOCK — archivo JSON en disco ────────────────────────────
// En Render el sistema de archivos es efímero, pero para este uso
// alcanza. Para persistencia real usar una DB (MongoDB Atlas free tier).
const STOCK_FILE = path.join(__dirname, "stock.json");

const STOCK_DEFAULT = {
  // ── JABONES ──────────────────────────────────────────────────
  "jabon-lavanda":          { nombre: "Jardín de Lavanda",              categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/jardinlavanda.png",             peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-citrico":          { nombre: "Refrescante",                    categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/refrescante.png",               peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-romero":           { nombre: "Manzanilla",                     categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/manzanilla.png",                peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-avena":            { nombre: "Avena",                          categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/avena.png",                     peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-avenaseda":        { nombre: "Avena & Seda",                   categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/avenaseda.png",                 peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-avenaseda2":       { nombre: "Avena & Seda II",                categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/avenaseda2.png",                peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-karite":           { nombre: "Manteca de Karité",              categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/mantecadekarite.png",           peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-detox":            { nombre: "Detox Dotado",                   categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/detoxdotado.png",               peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-petalos":          { nombre: "Pétalos de Hibiscus",            categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/petalosdehibiscus.png",         peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-cacao":            { nombre: "Dulce Energía Cacao",            categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/dulceenergiacacao.png",         peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-lavandachia":      { nombre: "Imperial Lavanda & Chía",        categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/imperiallavandachia.png",       peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-lavandaimperial":  { nombre: "Lavanda Imperial",               categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/lavandaimperial.png",           peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-jardinmalva":      { nombre: "Jardín Malva",                   categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/jardinmalva.png",               peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-purezaherbal":     { nombre: "Pureza Herbal",                  categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/purezaherbal.png",              peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-romeroherbal":     { nombre: "Romero Herbal",                  categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/romeroherbal.png",              peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-diosanatural":     { nombre: "Diosa Natural",                  categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/diosanatural.png",              peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-manodefatima":     { nombre: "Mano de Fátima Avena & Seda",    categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/manodefatimaavenadeseda.png",   peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-ambar":            { nombre: "Ámbar Divina",                   categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/ambardivina.png",               peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-avena-redondo":    { nombre: "Jabón Avena Redondo",            categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/jabonavenaredondo.png",         peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-exfoliante-anana": { nombre: "Exfoliante Ananá",               categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/Exfolianteanana.png",           peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-exfoliante-manz":  { nombre: "Exfoliante Manzanas",            categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/exfoliantemanzanas.png",        peso: "140gr", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-infantil-ranita":  { nombre: "Jabón Infantil Ranita",          categoria: "jabones",     precio: 5500,  stock: 6,  imagen: "assets/images/Jaboninfantilranita.png",       peso: "140gr", descripcion: "Llegaron los jaboncitos ranitas para la diversión y el cuidado de los más peques!! Suave y divertido. Glicerina vegetal y flor de manzanilla. Hidratante.", ingredientes: ["Glicerina vegetal","Flor de manzanilla"], caracteristicas: ["Hidratante","Apto piel de bebé","Sin sulfatos"], esOferta: false, precioOriginal: 0, activo: true },
  // jabones racimos
  "jabon-racimo-frutillas":  { nombre: "Racimo Aroma Frutillas",        categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/racimofrutillasaromafrutillas.png", esOferta: false, precioOriginal: 0, activo: true },
  "jabon-racimo-uvas":       { nombre: "Racimo Aroma Uvas",             categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/racimoaromauvas.png",           esOferta: false, precioOriginal: 0, activo: true },
  "jabon-racimo-cerezas":    { nombre: "Racimo Aroma Cerezas",          categoria: "jabones",     precio: 4800,  stock: 99, imagen: "assets/images/racimoaromacereza.png",         esOferta: false, precioOriginal: 0, activo: true },
  // ── SAHUMADORES ──────────────────────────────────────────────
  "sahumador-gratitud":     { nombre: "Sahumador Gratitud",             categoria: "sahumadores", precio: 7000,  stock: 1,  imagen: "assets/images/sahumadorchicogratitud.png",    esOferta: false, precioOriginal: 0, activo: true },
  "sahumador-magia":        { nombre: "Sahumador Gran Magia",           categoria: "sahumadores", precio: 7000,  stock: 1,  imagen: "assets/images/sahumadorgrandemagia.png",      esOferta: false, precioOriginal: 0, activo: true },
  "sahumador-luz1":         { nombre: "Sahumador Luz",                  categoria: "sahumadores", precio: 9000,  stock: 4,  imagen: "assets/images/sahumadoluz1.png",              esOferta: false, precioOriginal: 0, activo: true },
  "sahumador-luz2":         { nombre: "Sahumador Luz II",               categoria: "sahumadores", precio: 9000,  stock: 2,  imagen: "assets/images/sahumadorsluz2.png",            esOferta: false, precioOriginal: 0, activo: true },
  "sahumador-luz3":         { nombre: "Sahumador Luz III",              categoria: "sahumadores", precio: 9000,  stock: 2,  imagen: "assets/images/sahumadorluz3.png",             esOferta: false, precioOriginal: 0, activo: true },
  // ── CERÁMICA ─────────────────────────────────────────────────
  "taza-juana":             { nombre: "Taza Juana",                     categoria: "ceramica",    precio: 7500,  stock: 1,  imagen: "assets/images/tazajuana.png",                 esOferta: false, precioOriginal: 0, activo: true },
  "taza-campo":             { nombre: "Taza Campo",                     categoria: "ceramica",    precio: 7500,  stock: 1,  imagen: "assets/images/tazacampo.png",                 esOferta: false, precioOriginal: 0, activo: true },
  "taza-mariposa":          { nombre: "Taza Mariposa",                  categoria: "ceramica",    precio: 7500,  stock: 1,  imagen: "assets/images/tazamariposa.png",              esOferta: false, precioOriginal: 0, activo: true },
  "taza-generico":          { nombre: "Taza",                           categoria: "ceramica",    precio: 7500,  stock: 1,  imagen: "assets/images/taza.webp",                      esOferta: false, precioOriginal: 0, activo: true },
  "cenicero-esmeralda":     { nombre: "Cenicero Esmeralda",             categoria: "ceramica",    precio: 5000,  stock: 1,  imagen: "assets/images/ceniceroesmeralda.png",         esOferta: false, precioOriginal: 0, activo: true },
  "platocupkacke":          { nombre: "Plato Cupcake",                  categoria: "ceramica",    precio: 5000,  stock: 1,  imagen: "assets/images/platocupkacke.png",             esOferta: false, precioOriginal: 0, activo: true },
  "cuenco-frutillas":       { nombre: "Cuenco Frutillas Mediano",       categoria: "ceramica",    precio: 5000,  stock: 1,  imagen: "assets/images/cuencofrutillasmediano.png",    esOferta: false, precioOriginal: 0, activo: true },
  "cuenco-flores-grande":   { nombre: "Cuenco Grande Flores",           categoria: "ceramica",    precio: 5000,  stock: 1,  imagen: "assets/images/cuencograndeflores.png",        esOferta: false, precioOriginal: 0, activo: true },
  "cuenco-flores-chico":    { nombre: "Cuenco Chico Flores",            categoria: "ceramica",    precio: 4500,  stock: 1,  imagen: "assets/images/cuencochicoflores.png",         esOferta: false, precioOriginal: 0, activo: true },
  "cuenco-limones-grande":  { nombre: "Cuenco Grande Limones",          categoria: "ceramica",    precio: 5000,  stock: 1,  imagen: "assets/images/cuencograndelimones.png",       esOferta: false, precioOriginal: 0, activo: true },
  "cuenco-limones-chico":   { nombre: "Cuenco Limones Chico",           categoria: "ceramica",    precio: 4000,  stock: 1,  imagen: "assets/images/cuencolimoneschico.png",        esOferta: false, precioOriginal: 0, activo: true },
  "cuenco-multicolor":      { nombre: "Cuenco Grande Multicolor",       categoria: "ceramica",    precio: 0,     stock: 1,  imagen: "assets/images/cuencograndemulticolor.png",    esOferta: false, precioOriginal: 0, activo: true },
  "cuenco-naranja":         { nombre: "Cuenco Mediano Naranja",         categoria: "ceramica",    precio: 0,     stock: 1,  imagen: "assets/images/cuencosmedianaranja.png",       esOferta: false, precioOriginal: 0, activo: true },
  "cuenco-sushi":           { nombre: "Cuenco Sushi",                   categoria: "ceramica",    precio: 0,     stock: 1,  imagen: "assets/images/cuencossushi.png",              esOferta: false, precioOriginal: 0, activo: true },
  "cazuela-locro":          { nombre: "Cazuela Locro",                  categoria: "ceramica",    precio: 9000,  stock: 3,  imagen: "assets/images/cazuelaslocro.png",             esOferta: false, precioOriginal: 0, activo: true },
  "tazon-bandeja":          { nombre: "Tazón más Bandeja",              categoria: "ceramica",    precio: 0,     stock: 1,  imagen: "assets/images/tazonmasbandeja.png",           esOferta: false, precioOriginal: 0, activo: true },
  "taza-corazon":           { nombre: "Taza y Plato Corazón Día Papá",  categoria: "ceramica",    precio: 0,     stock: 1,  imagen: "assets/images/combopapatazamasplatocotrazon.png", esOferta: false, precioOriginal: 0, activo: true },
  "jabonera-blanca":        { nombre: "Jaboneras Blancas",              categoria: "ceramica",    precio: 0,     stock: 2,  imagen: "assets/images/2jabonerasblancas.png",         esOferta: false, precioOriginal: 0, activo: true },
  "cuchara-ceramica":       { nombre: "Cucharas de Cerámica",           categoria: "ceramica",    precio: 0,     stock: 4,  imagen: "assets/images/4cucharasdeceramicas.png",     esOferta: false, precioOriginal: 0, activo: true },
  "porta-ajos":             { nombre: "Porta Ajos Jacinto",             categoria: "ceramica",    precio: 0,     stock: 1,  imagen: "assets/images/portaajosjacinto.png",          esOferta: false, precioOriginal: 0, activo: true },
  "collares-grandes":       { nombre: "Collares Grandes de Cerámica",   categoria: "ceramica",    precio: 0,     stock: 1,  imagen: "assets/images/collaresgrandesdeceramicas.png", esOferta: false, precioOriginal: 0, activo: true },
  "collares-pequenos":      { nombre: "Collares Pequeños de Cerámica",  categoria: "ceramica",    precio: 0,     stock: 1,  imagen: "assets/images/collarespequeñosdeceramicas.png", esOferta: false, precioOriginal: 0, activo: true },
  "collar-corazon":         { nombre: "Collar Grande Corazón",          categoria: "ceramica",    precio: 0,     stock: 1,  imagen: "assets/images/collargrandecorazon.png",       esOferta: false, precioOriginal: 0, activo: true },
  "piedra-antiestres":      { nombre: "Piedras Antistrés",              categoria: "ceramica",    precio: 0,     stock: 1,  imagen: "assets/images/piedrasantiestres.png",         esOferta: false, precioOriginal: 0, activo: true },
  // ── DECORACIÓN ───────────────────────────────────────────────
  "casita-grande":          { nombre: "Casita Grande Alegría",          categoria: "deco",        precio: 20000, stock: 1,  imagen: "assets/images/casitagrandealegria.png",       esOferta: false, precioOriginal: 0, activo: true },
  "casita-chica":           { nombre: "Casita Chica Hogar",             categoria: "deco",        precio: 15000, stock: 1,  imagen: "assets/images/casitachicahogar.png",          esOferta: false, precioOriginal: 0, activo: true },
  "florero-nube":           { nombre: "Florero Chico Nube",             categoria: "deco",        precio: 5000,  stock: 1,  imagen: "assets/images/florerochiconube.png",          esOferta: false, precioOriginal: 0, activo: true },
  "porta-cepillos":         { nombre: "Porta Cepillos Ámbar",           categoria: "deco",        precio: 5000,  stock: 1,  imagen: "assets/images/portacepillosambar.png",        esOferta: false, precioOriginal: 0, activo: true },
  "porta-espiral-gde":      { nombre: "Porta Espiral Grande Margarita", categoria: "deco",        precio: 8000,  stock: 1,  imagen: "assets/images/portaespiralgrandemargarita.png", esOferta: false, precioOriginal: 0, activo: true },
  "porta-espiral-chico":    { nombre: "Porta Espiral Chico",            categoria: "deco",        precio: 7000,  stock: 1,  imagen: "assets/images/portaespiralchico.png",         esOferta: false, precioOriginal: 0, activo: true },
  "floreros":               { nombre: "Floreros",                       categoria: "deco",        precio: 6000,  stock: 4,  imagen: "assets/images/4floreros.png",                 descripcion: "Precio por unidad. Set de 4 floreros artesanales disponibles.", esOferta: false, precioOriginal: 0, activo: true },
}

function leerStock() {
  try {
    let data;
    if (fs.existsSync(STOCK_FILE)) {
      data = JSON.parse(fs.readFileSync(STOCK_FILE, "utf8"));
    } else {
      data = { ...STOCK_DEFAULT };
    }
    // Normalizar campos nuevos en productos existentes que no los tengan
    for (const id of Object.keys(data)) {
      if (data[id].esOferta        === undefined) data[id].esOferta        = false;
      if (data[id].precioOriginal  === undefined) data[id].precioOriginal  = 0;
      if (data[id].activo          === undefined) data[id].activo          = true;
    }
    return data;
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

// GET /productos.json — alias público amigable para el frontend
app.get("/productos.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-cache");
  res.json(leerStock());
});

// GET /stock/:id — devuelve un producto
app.get("/stock/:id", (req, res) => {
  const stock = leerStock();
  const prod = stock[req.params.id];
  if (!prod) return res.status(404).json({ error: "Producto no encontrado" });
  res.json(prod);
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
  if (req.body.peso             !== undefined) stock[id].peso             = req.body.peso;
  if (req.body.descripcion      !== undefined) stock[id].descripcion      = req.body.descripcion;
  if (req.body.ingredientes     !== undefined) stock[id].ingredientes     = req.body.ingredientes;
  if (req.body.caracteristicas  !== undefined) stock[id].caracteristicas  = req.body.caracteristicas;
  if (req.body.esOferta         !== undefined) stock[id].esOferta         = req.body.esOferta;
  if (req.body.precioOriginal   !== undefined) stock[id].precioOriginal   = Number(req.body.precioOriginal) || 0;

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

  const { peso, descripcion, ingredientes, caracteristicas, activo, esOferta, precioOriginal } = req.body;
  stock[id] = {
    nombre,
    categoria:       categoria || "jabones",
    precio:          Number(precio) || 0,
    stock:           Number(stockNum) || 1,
    imagen:          imagen || "",
    peso:            peso || "",
    descripcion:     descripcion || "",
    ingredientes:    Array.isArray(ingredientes) ? ingredientes : [],
    caracteristicas: Array.isArray(caracteristicas) ? caracteristicas : [],
    activo:          activo !== false,
    esOferta:        esOferta === true || esOferta === "true" || false,
    precioOriginal:  Number(precioOriginal) || 0,
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
    .filter(f => [".webp",".jpeg",".png",".webp",".gif"].includes(path.extname(f).toLowerCase()))
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
