const CACHE_MS = 10 * 60 * 1000; // el resumen se reutiliza 10 minutos para no gastar cuota
let cache = null; // { datos, expira }

function extraerJson(texto) {
  const limpio = texto
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(limpio);
}

function normalizar(obj) {
  const tipos = ["positivo", "alerta", "neutro"];
  const hallazgos = Array.isArray(obj?.hallazgos) ? obj.hallazgos : [];
  const recomendaciones = Array.isArray(obj?.recomendaciones) ? obj.recomendaciones : [];
  return {
    resumen: String(obj?.resumen ?? "").trim(),
    hallazgos: hallazgos
      .slice(0, 4)
      .map((h) => ({
        tipo: tipos.includes(h?.tipo) ? h.tipo : "neutro",
        texto: String(h?.texto ?? "").trim(),
      }))
      .filter((h) => h.texto),
    recomendaciones: recomendaciones
      .slice(0, 3)
      .map((r) => String(r).trim())
      .filter(Boolean),
  };
}

function errorIA(mensaje) {
  const error = new Error(mensaje);
  error.status = 502;
  return error;
}

const ESPERAS_MS = [1000, 2500]; // pausas entre reintentos (3 intentos por modelo)
const REINTENTABLES = [404, 429, 500, 502, 503, 504];
const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Llama a un modelo de Gemini. Si Google responde "saturado" (503) u otro fallo
// temporal, espera un poco y reintenta antes de rendirse.
async function pedirAGemini(modelo, apiKey, cuerpo) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
  let ultimo = { status: 503, mensaje: "Sin respuesta de Gemini" };

  for (let intento = 0; intento <= ESPERAS_MS.length; intento++) {
    try {
      const respuesta = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(cuerpo),
      });
      const data = await respuesta.json().catch(() => null);
      if (respuesta.ok) return data;
      ultimo = { status: respuesta.status, mensaje: data?.error?.message };
      if (!REINTENTABLES.includes(respuesta.status)) break; // error "real" (clave mala, etc.)
    } catch (e) {
      ultimo = { status: 503, mensaje: e.message };
    }
    if (intento < ESPERAS_MS.length) await dormir(ESPERAS_MS[intento]);
  }

  const error = new Error(ultimo.mensaje || "Error al generar el resumen con IA");
  error.status = 502;
  error.reintentable = REINTENTABLES.includes(ultimo.status);
  throw error;
}

export const iaService = {
  async generarResumenEjecutivo(resumen, { forzar = false } = {}) {
    if (!forzar && cache && cache.expira > Date.now()) {
      return cache.datos;
    }

    // Se leen aquí (no arriba del archivo) para asegurar que dotenv ya cargó el .env
    const apiKey = process.env.GEMINI_API_KEY;
    const modelo = process.env.GEMINI_MODEL || "gemini-flash-latest";

    if (!apiKey) {
      const error = new Error("Falta configurar GEMINI_API_KEY en el .env del backend");
      error.status = 500;
      throw error;
    }

    const prompt = `Eres un analista de negocio para ANGHER SPORT, una tienda de indumentaria deportiva.
Analiza estos datos reales de inventario y movimientos de los últimos 30 días y responde SOLO con un
JSON válido (sin markdown, sin asteriscos) con esta forma exacta:

{
  "resumen": "una sola frase de máximo 25 palabras con la conclusión general",
  "hallazgos": [
    { "tipo": "positivo" | "alerta" | "neutro", "texto": "hallazgo concreto de máximo 18 palabras" }
  ],
  "recomendaciones": ["acción concreta de máximo 20 palabras"]
}

Reglas:
- Entre 2 y 4 hallazgos. Usa "alerta" para stock bajo/agotado o riesgos, "positivo" para buenas señales, "neutro" para el resto.
- Entre 1 y 3 recomendaciones, accionables (qué reponer, qué vigilar).
- Español, tono profesional. No inventes números ni productos que no estén en los datos.
- Si hay pocos movimientos, dilo con claridad en el resumen.

Datos:
${JSON.stringify(resumen)}`;

    const cuerpo = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };
    const respaldo = process.env.GEMINI_MODEL_RESPALDO || "gemini-3.1-flash-lite";
    const modelos = [...new Set([modelo, respaldo])];

    let data = null;
    let ultimoError = null;
    for (const m of modelos) {
      try {
        data = await pedirAGemini(m, apiKey, cuerpo);
        break;
      } catch (error) {
        ultimoError = error;
        if (!error.reintentable) throw error; // clave inválida, etc.: no sirve probar otro modelo
      }
    }

    if (!data) {
      // Gemini sigue saturado: si ya había un resumen anterior, se muestra marcado como desactualizado
      if (cache) return { ...cache.datos, desactualizado: true };
      console.error("[IA] Gemini no disponible:", ultimoError?.message);
      throw errorIA("El servicio de IA está saturado en este momento. Intenta de nuevo en unos minutos.");
    }

    const partes = data?.candidates?.[0]?.content?.parts ?? [];
    const texto = partes
      .filter((p) => p.text && !p.thought)
      .map((p) => p.text)
      .join("")
      .trim();
    if (!texto) throw errorIA("La IA no devolvió contenido");

    let datos;
    try {
      datos = normalizar(extraerJson(texto));
    } catch {
      throw errorIA("La IA devolvió un formato inesperado, intenta de nuevo");
    }
    if (!datos.resumen) throw errorIA("La IA no devolvió un resumen válido");

    datos.generadoEn = new Date().toISOString();
    cache = { datos, expira: Date.now() + CACHE_MS };
    return datos;
  },
};