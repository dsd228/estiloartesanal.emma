const express = require("express");
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");
const crypto  = require("crypto");
const multer  = require("multer");
const { MongoClient } = require("mongodb");
const { MercadoPagoConfig, Preference, Payment } = require("mercadopago");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Mercado Pago ──────────────────────────────────────────────
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

// ── MongoDB ───────────────────────────────────────────────────
// Agrega MONGODB_URI en las variables de entorno de Render
// Ejemplo: mongodb+srv://usuario:password@cluster.mongodb.net/estiloartesanal
const MONGO_URI = process.env.MONGODB_URI;
let db = null;

async function conectarMongo() {
  if (!MONGO_URI) {
    console.warn("⚠️  MONGODB_URI no definida — usando archivo JSON como fallback");
    return;
  }
  try {
    const mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    db = mongoClient.db("estiloartesanal");
    console.log("✅ MongoDB conectado");

    // Si la colección productos está vacía, la inicializa con los defaults
    const col = db.collection("productos");
    const count = await col.countDocuments();
    if (count === 0) {
      console.log("📦 Inicializando productos en MongoDB...");
      const docs = Object.entries(STOCK_DEFAULT).map(([id, data]) => ({ _id: id, ...data }));
      await col.insertMany(docs);
      console.log(`✅ ${docs.length} productos cargados en MongoDB`);
    }
  } catch (e) {
    console.error("❌ Error conectando MongoDB:", e.message);
    db = null;
  }
}

// ── STOCK DEFAULT (hardcodeado, solo se usa para inicializar) ─
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
  "taza-generico":          { nombre: "Taza",                           categoria: "ceramica",    precio: 7500,  stock: 1,  imagen: "assets/images/taza.webp",                     esOferta: false, precioOriginal: 0, activo: true },
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
  "cuchara-ceramica":       { nombre: "Cucharas de Cerámica",           categoria: "ceramica",    precio: 0,     stock: 4,  imagen: "assets/images/4cucharasdeceramicas.png",      esOferta: false, precioOriginal: 0, activo: true },
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
};

// ── FUNCIONES DE STOCK (MongoDB primero, JSON como fallback) ──
const STOCK_FILE = path.join(__dirname, "stock.json");

async function leerStock() {
  // — MongoDB —
  if (db) {
    try {
      const docs = await db.collection("productos").find({}).toArray();
      const result = {};
      for (const doc of docs) {
        const { _id, ...data } = doc;
        result[_id] = data;
      }
      return result;
    } catch (e) {
      console.error("Error leyendo MongoDB:", e.message);
    }
  }
  // — Fallback: archivo JSON —
  try {
    if (fs.existsSync(STOCK_FILE)) {
      return JSON.parse(fs.readFileSync(STOCK_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Error leyendo stock.json:", e.message);
  }
  return { ...STOCK_DEFAULT };
}

async function guardarStock(data) {
  // — MongoDB —
  if (db) {
    try {
      const col = db.collection("productos");
      const ops = Object.entries(data).map(([id, prod]) => ({
        replaceOne: { filter: { _id: id }, replacement: { _id: id, ...prod }, upsert: true },
      }));
      if (ops.length > 0) await col.bulkWrite(ops);
      return;
    } catch (e) {
      console.error("Error guardando en MongoDB:", e.message);
    }
  }
  // — Fallback: archivo JSON —
  try {
    fs.writeFileSync(STOCK_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error guardando stock.json:", e.message);
  }
}

async function eliminarProducto(id) {
  if (db) {
    try {
      await db.collection("productos").deleteOne({ _id: id });
      return;
    } catch (e) {
      console.error("Error eliminando en MongoDB:", e.message);
    }
  }
  // Fallback JSON
  try {
    const stock = JSON.parse(fs.readFileSync(STOCK_FILE, "utf8"));
    delete stock[id];
    fs.writeFileSync(STOCK_FILE, JSON.stringify(stock, null, 2));
  } catch (e) {
    console.error("Error eliminando en stock.json:", e.message);
  }
}

async function actualizarProducto(id, campos) {
  if (db) {
    try {
      await db.collection("productos").updateOne({ _id: id }, { $set: campos });
      return;
    } catch (e) {
      console.error("Error actualizando en MongoDB:", e.message);
    }
  }
  // Fallback JSON
  const stock = await leerStock();
  Object.assign(stock[id], campos);
  await guardarStock(stock);
}

// ── Multer — subida de imágenes ───────────────────────────────
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname, ext)
      .toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    cb(null, `${name}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".webp", ".jpeg", ".jpg", ".png", ".gif"];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error("Solo se permiten imágenes"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
});

// ── Middlewares ───────────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
}));

// ── SESIONES ADMIN ────────────────────────────────────────────
const SESSIONS_FILE = path.join(__dirname, "sessions.json");

function leerSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE))
      return new Map(Object.entries(JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"))));
  } catch (e) {}
  return new Map();
}

function guardarSessions(map) {
  try { fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Object.fromEntries(map))); }
  catch (e) {}
}

const sessions = leerSessions();

function crearToken() {
  return crypto.randomBytes(32).toString("hex");
}

function verificarAuth(req) {
  const auth  = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  return sessions.has(token);
}

// ── RUTAS PÚBLICAS ────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Backend estiloartesanal.emma 🌿" });
});

app.get("/stock", async (req, res) => {
  res.json(await leerStock());
});

app.get("/productos.json", async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.json(await leerStock());
});

app.get("/stock/:id", async (req, res) => {
  const stock = await leerStock();
  const prod  = stock[req.params.id];
  if (!prod) return res.status(404).json({ error: "Producto no encontrado" });
  res.json(prod);
});

// ── MERCADO PAGO ──────────────────────────────────────────────

app.post("/crear-preferencia", async (req, res) => {
  const { producto, precio, nombre, email, telefono, nota, productoId } = req.body;

  if (!producto || !precio || !nombre || !email) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  if (productoId) {
    const stock = await leerStock();
    const item  = stock[productoId];
    if (item && item.stock <= 0) {
      return res.status(400).json({ error: "Este producto está agotado." });
    }
  }

  try {
    const preference = new Preference(client);
    const body = {
      items: [{ title: producto, quantity: 1, unit_price: Number(precio), currency_id: "ARS" }],
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
      external_reference:   productoId || "",
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

app.post("/webhook", (req, res) => {
  const { type, data } = req.body;
  console.log("Webhook MP:", type, data?.id);

  if (type === "payment" && data?.id) {
    (async () => {
      try {
        const paymentClient = new Payment(client);
        const payment = await paymentClient.get({ id: data.id });

        if (payment.status === "approved") {
          const productoId = payment.external_reference;
          if (productoId) {
            const stock = await leerStock();
            if (stock[productoId] && stock[productoId].stock > 0) {
              await actualizarProducto(productoId, { stock: stock[productoId].stock - 1 });
              console.log(`✅ Stock descontado: ${productoId}`);
            }
          }
        }
      } catch (e) {
        console.error("Error procesando webhook:", e);
      }
    })();
  }

  res.sendStatus(200);
});

// ── RUTAS ADMIN ───────────────────────────────────────────────

app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  const ADMIN_PASS   = process.env.ADMIN_PASSWORD || "emma2026";

  if (password !== ADMIN_PASS) {
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }

  const token = crearToken();
  sessions.set(token, { createdAt: Date.now() });

  for (const [t, s] of sessions) {
    if (Date.now() - s.createdAt > 30 * 24 * 60 * 60 * 1000) sessions.delete(t);
  }

  guardarSessions(sessions);
  res.json({ token });
});

app.post("/admin/logout", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  sessions.delete(token);
  guardarSessions(sessions);
  res.json({ ok: true });
});

app.get("/admin/stock", async (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });
  res.json(await leerStock());
});

// PUT /admin/stock/:id — actualizar producto
app.put("/admin/stock/:id", async (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });

  const stock = await leerStock();
  const id    = req.params.id;

  if (!stock[id]) return res.status(404).json({ error: "Producto no encontrado" });

  const campos = {};
  const { nombre, precio, stock: newStock, categoria, imagen, activo,
          peso, descripcion, ingredientes, caracteristicas, esOferta, precioOriginal } = req.body;

  if (nombre        !== undefined) campos.nombre         = nombre;
  if (precio        !== undefined) campos.precio         = Number(precio);
  if (newStock      !== undefined) campos.stock          = Number(newStock);
  if (categoria     !== undefined) campos.categoria      = categoria;
  if (imagen        !== undefined) campos.imagen         = imagen;
  if (activo        !== undefined) campos.activo         = activo;
  if (peso          !== undefined) campos.peso           = peso;
  if (descripcion   !== undefined) campos.descripcion    = descripcion;
  if (ingredientes  !== undefined) campos.ingredientes   = ingredientes;
  if (caracteristicas !== undefined) campos.caracteristicas = caracteristicas;
  if (esOferta      !== undefined) campos.esOferta       = esOferta;
  if (precioOriginal !== undefined) campos.precioOriginal = Number(precioOriginal) || 0;

  await actualizarProducto(id, campos);
  res.json({ ok: true, producto: { ...stock[id], ...campos } });
});

// POST /admin/stock — agregar nuevo producto
app.post("/admin/stock", async (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });

  const stock = await leerStock();
  const { id, nombre, precio, stockNum, categoria, imagen,
          peso, descripcion, ingredientes, caracteristicas, activo, esOferta, precioOriginal } = req.body;

  if (!id || !nombre) return res.status(400).json({ error: "id y nombre son obligatorios" });
  if (stock[id])      return res.status(400).json({ error: "Ya existe un producto con ese id" });

  const nuevo = {
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

  if (db) {
    try {
      await db.collection("productos").insertOne({ _id: id, ...nuevo });
    } catch (e) {
      console.error("Error insertando en MongoDB:", e.message);
      return res.status(500).json({ error: "Error guardando producto" });
    }
  } else {
    stock[id] = nuevo;
    await guardarStock(stock);
  }

  res.json({ ok: true, producto: nuevo });
});

// DELETE /admin/stock/:id — eliminar producto
app.delete("/admin/stock/:id", async (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });

  const stock = await leerStock();
  if (!stock[req.params.id]) return res.status(404).json({ error: "Producto no encontrado" });

  await eliminarProducto(req.params.id);
  res.json({ ok: true });
});

// ── RUTAS DE IMÁGENES ─────────────────────────────────────────

app.use("/uploads", express.static(UPLOADS_DIR));

app.post("/admin/upload", (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });

  upload.array("imagenes", 10)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "No se recibieron archivos" });

    const urls = req.files.map(f => ({
      filename: f.filename,
      url: `/uploads/${f.filename}`,
      size: f.size,
    }));

    res.json({ ok: true, archivos: urls });
  });
});

app.delete("/admin/upload/:filename", (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });

  const filename = path.basename(req.params.filename);
  const filepath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filepath))
    return res.status(404).json({ error: "Archivo no encontrado" });

  fs.unlinkSync(filepath);
  res.json({ ok: true });
});

app.get("/admin/uploads", (req, res) => {
  if (!verificarAuth(req)) return res.status(401).json({ error: "No autorizado" });

  const files = fs.readdirSync(UPLOADS_DIR)
    .filter(f => [".webp", ".jpeg", ".jpg", ".png", ".gif"].includes(path.extname(f).toLowerCase()))
    .map(f => ({
      filename: f,
      url: `/uploads/${f}`,
      size: fs.statSync(path.join(UPLOADS_DIR, f)).size,
      fecha: fs.statSync(path.join(UPLOADS_DIR, f)).mtime,
    }))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  res.json(files);
});

// ── ARRANCAR ──────────────────────────────────────────────────
conectarMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  });
});
