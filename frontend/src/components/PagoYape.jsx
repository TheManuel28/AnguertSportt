import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

/**
 * Pago del 50% inicial por Yape (manual): el cliente paga desde su app, escribe
 * el número de operación del comprobante y la tienda lo verifica.
 * Se usa tanto al confirmar el pedido como en "Mis pedidos".
 */
export default function PagoYape({ pedido, onActualizado }) {
  const [config, setConfig] = useState(null);
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [sinQr, setSinQr] = useState(false);
  const envioEnCurso = useRef(false); // evita dobles envíos aunque el clic sea muy rápido

  const pendiente = pedido.estado === "PENDIENTE_PAGO_INICIAL";
  const enRevision = pedido.estado === "PAGO_EN_REVISION";

  useEffect(() => {
    if (!pendiente) return;
    api
      .get("/pedidos/yape-config")
      .then(setConfig)
      .catch(() => setConfig({ numero: null, titular: null }));
  }, [pendiente]);

  async function enviar(e) {
    e.preventDefault();
    if (envioEnCurso.current) return;
    envioEnCurso.current = true;
    setError("");
    setEnviando(true);
    try {
      const actualizado = await api.post(`/pedidos/${pedido.id}/reportar-pago-yape`, { numeroOperacion });
      setNumeroOperacion("");
      onActualizado?.(actualizado);
    } catch (err) {
      setError(err.message);
    } finally {
      envioEnCurso.current = false;
      setEnviando(false);
    }
  }

  async function copiarNumero() {
    try {
      await navigator.clipboard.writeText(String(config.numero).replace(/\s+/g, ""));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* si el navegador no deja copiar, el número sigue visible para hacerlo a mano */
    }
  }

  if (enRevision) {
    return (
      <div className="pago-yape pago-yape-revision">
        <strong>Recibimos tu pago</strong>
        <p>
          Operación N° <b>{pedido.pagoYape?.numeroOperacion}</b> por S/ {pedido.pagoInicial.toFixed(2)}. La
          tienda lo está verificando; apenas lo confirme, tu pedido pasará a preparación.
        </p>
      </div>
    );
  }

  if (!pendiente) return null;

  const codigo = pedido.id.slice(0, 6).toUpperCase();

  return (
    <div className="pago-yape">
      <h3>Paga el 50% inicial con Yape</h3>

      {pedido.pagoRechazo && (
        <div className="aviso aviso-error">
          No pudimos verificar tu pago anterior: <b>{pedido.pagoRechazo.motivo}</b>. Revisa el número de
          operación y vuelve a enviarlo.
        </div>
      )}

      {config && !config.numero && (
        <p className="texto-ayuda">
          La tienda todavía no configuró su número de Yape. Comunícate con ella para coordinar el pago.
        </p>
      )}

      {config?.numero && (
        <>
          <ol className="pago-yape-pasos">
            <li>
              Abre Yape y yapea <b>S/ {pedido.pagoInicial.toFixed(2)}</b> a:
              <div className="pago-yape-datos">
                <div>
                  <span className="pago-yape-numero">{config.numero}</span>
                  {config.titular && <span className="texto-ayuda"> · {config.titular}</span>}
                </div>
                <button type="button" className="enlace-boton" onClick={copiarNumero}>
                  {copiado ? "¡Copiado!" : "Copiar número"}
                </button>
              </div>
              {!sinQr && (
                <img
                  src="/yape-qr.png"
                  alt="Código QR de Yape de la tienda"
                  className="pago-yape-qr"
                  onError={() => setSinQr(true)}
                />
              )}
            </li>
            <li>
              Si Yape te deja escribir un mensaje, pon el código <b>{codigo}</b>.
            </li>
            <li>
              Cuando pagues, copia el <b>número de operación</b> del comprobante y envíalo aquí:
            </li>
          </ol>

          <form className="pago-yape-form" onSubmit={enviar}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Número de operación (solo dígitos)"
              value={numeroOperacion}
              maxLength={12}
              onChange={(e) => setNumeroOperacion(e.target.value.replace(/\D/g, ""))}
              required
            />
            <button type="submit" className="boton-primario" disabled={enviando || numeroOperacion.length < 6}>
              {enviando ? "Enviando..." : "Ya pagué, enviar para revisión"}
            </button>
          </form>
          {error && <div className="aviso aviso-error">{error}</div>}
        </>
      )}
    </div>
  );
}