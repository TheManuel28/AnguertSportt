# Angher Sport — Proyecto AS-06 / G06

Sistema web de gestión comercial y control de inventario para Angher Sport,
con Business Intelligence e Inteligencia Artificial.

Arquitectura por capas: **Frontend (React)** → **Backend (Express, capas
Router → Service → Repository)** → **Firebase (Firestore + Auth)**. El
frontend nunca toca Firestore directamente; todo pasa por la API.

```
angher-sport/
├── backend/     API en Node.js/Express
├── frontend/    Interfaz web en React (Vite)
├── firestore.rules
└── docs/
    └── modelo-datos-firestore.md
```

## 1. Requisitos previos

- Node.js 22.x instalado (`node -v` para comprobarlo)
- Una cuenta de Firebase con un proyecto creado, con **Firestore** y
  **Authentication (correo/contraseña)** habilitados
- VS Code (con las carpetas `backend` y `frontend` abiertas, o el workspace
  completo)

## 2. Configurar Firebase

1. En Firebase Console → **Project settings → Service accounts** → *Generate
   new private key*. Descarga el JSON: de ahí sacas `project_id`,
   `client_email` y `private_key` para el backend.
2. En Firebase Console → **Project settings → General → Your apps** → crea
   una Web App. De ahí sacas el `firebaseConfig` para el frontend.
3. Sube las **reglas de seguridad** de `firestore.rules` en Firestore →
   Rules → pega el contenido → Publicar. Esto bloquea todo acceso directo
   desde el navegador (solo el backend con Admin SDK puede leer/escribir).

## 3. Levantar el backend

```bash
cd backend
cp .env.example .env
# Completa FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY
# con los datos del Service Account (paso 2.1). La private_key va entre
# comillas y con los \n tal cual vienen en el JSON descargado.
npm install
npm run dev
```

Debe quedar corriendo en `http://localhost:4000`. Prueba abrir esa URL en el
navegador: debe responder `{"ok":true,"proyecto":"AS-06 Angher Sport"}`.

### Crear tu primer usuario administrador

1. En Firebase Console → Authentication → Users → *Add user* (crea un correo
   y contraseña para el administrador).
2. Copia el UID que te asigna.
3. En la carpeta `backend`, ejecuta:
   ```bash
   node scripts/asignarRol.js <UID> administrador
   ```
   Esto asigna el rol como custom claim; el middleware de autenticación lo
   lee en cada request (`src/middleware/auth.js`).

## 4. Levantar el frontend

```bash
cd frontend
cp .env.example .env
# Completa las variables VITE_FIREBASE_* con el firebaseConfig del paso 2.2
npm install
npm run dev
```

Se abre en `http://localhost:5173` (Vite lo indica en la consola). El
catálogo (`/`) es público; `/login` + `/admin` requieren sesión.

## 5. Qué ya funciona en este punto de partida

- Autenticación con Firebase (login del frontend, verificación de token en
  el backend, roles por custom claim)
- CRUD de productos y variantes (talla/color) con stock por variante
- Registro de movimientos de inventario (entrada, salida, ajuste) con
  **transacción atómica** en Firestore (`inventarioService.js`) — nunca se
  actualiza el stock sin dejar registro del movimiento, ni viceversa
- Historial de movimientos y listado de stock crítico
- Registro de clientes y creación de pedidos con el esquema de **pago
  fraccionado 50/50** (el stock se descuenta recién al confirmar el pago
  inicial, no al crear el pedido)
- Catálogo público en el frontend, consumiendo la API real
- **Dashboard** (`GET /api/dashboard/resumen`): totales por estado de stock,
  gráfico de entradas vs salidas de los últimos 30 días (SVG propio, sin
  librerías externas), top 5 productos con más salidas, alertas activas y
  movimientos recientes — todo calculado en el backend a partir de datos
  reales de Firestore

## 6. Lo que falta construir (según la hoja de ruta acordada)

- Módulo de reportes (general, movimientos, stock bajo, agotados) con
  exportación a Excel/CSV
- Módulo de Business Intelligence (paneles analíticos de ventas)
- Asistente de IA (function calling contra las herramientas de solo lectura:
  consultar_stock, listar_stock_critico, consultar_movimientos,
  obtener_mas_movidos, obtener_resumen_inventario,
  obtener_sugerencias_reposicion) — ver la conversación anterior para el
  diseño completo de esta parte
- Flujo de pago real (pasarela) — hoy el pago inicial se "confirma" desde el
  panel de administrador; falta integrar el cobro efectivo
- Panel administrativo completo (gestión de productos/variantes desde UI,
  no solo desde la API)
- Reglas de auditoría (colección `auditoria`, ver `docs/modelo-datos-firestore.md`)

Revisa `docs/modelo-datos-firestore.md` para el detalle de cada colección
antes de agregar campos nuevos, para mantener consistencia con lo ya
documentado en la Estructura de Análisis del proyecto.
