# Oliva Hotel · Frontend

Frontend de reservas hoteleras con **React 19 + TypeScript estricto + Vite**, adaptado al ZIP `Hotel-Reservations-backend--main.zip`. Código y comentarios en inglés; interfaz, documentación y mensajes de commit en español.

## Abrir como proyecto

Abre esta carpeta en VS Code, en otro IDE, o agrégala como proyecto de Codex. También puedes abrir `oliva-hotel.code-workspace`. Requiere Node.js 20.19+ (recomendado 24) y npm.

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre la URL de Vite. No abras `index.html` con doble clic: los módulos TypeScript necesitan el servidor. Sin `.env.local`, arranca en **demo**, con datos ficticios y persistencia local.

## Conectar el backend suministrado

```powershell
Copy-Item .env.example .env.local
```

Edita `.env.local`:

```dotenv
VITE_DATA_MODE=api
VITE_API_BASE_URL=/api/v1
```

En la carpeta del backend, con Java 21 y Maven instalados:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'dev'
$env:CORS_ALLOWED_ORIGINS = 'http://localhost:5173,http://127.0.0.1:5173'
mvn spring-boot:run
```

El perfil `dev` del ZIP ya contiene una clave JWT de ejemplo: úsalo solo en desarrollo. En otra terminal inicia el frontend con `npm.cmd run dev`. Vite reenvía `/api` a `http://localhost:8080`. Regístrate desde la pantalla de acceso y luego inicia sesión.

Para un backend remoto, configura `VITE_API_BASE_URL=https://tu-backend/api/v1`, HTTPS y CORS para el origen exacto del frontend. Reinicia Vite después de cambiar variables. El backend usa repositorios **en memoria**: reiniciarlo pierde cuentas y reservas.

## Funcionalidad

- Catálogo alineado con el backend: **18 habitaciones** (6 sencillas, 8 dobles, 4 suites), superando el mínimo de 15.
- Búsqueda por fechas y huéspedes; filtros por categoría, orden y paginación.
- Precio de temporada alta ×1,5 y baja ×1. En modo API se utiliza la **vista previa del servidor**.
- Reservas con datos del huésped y resumen; servicios, check-in, UUID de llave y check-out.
- Simulador de cerradura que rechaza llaves incorrectas, habitaciones distintas y llaves de estancias finalizadas.
- Factura final con líneas de alojamiento y servicios, imprimible o guardable como PDF desde el navegador. En modo API se muestra la factura recibida del servidor.
- Registro, login, perfil, cierre de sesión y renovación de acceso JWT antes de vencer.
- Tokens de acceso y renovación **solo en memoria**: no se guardan contraseñas ni tokens en localStorage/sessionStorage; después de recargar hay que volver a iniciar sesión.
- Índice de IDs de reservas separado por usuario; consulta por ID completo para incorporar una reserva existente.
- Menú móvil, formularios con etiquetas, diálogos con foco contenido y estados de carga, error y vacío.

## Diferencias reales del contrato del backend

Se revisaron `HotelController`, `AuthController`, DTOs, enumeraciones y servicios del ZIP. El adaptador usa `/api/v1/hotel`, nombres de campos **en inglés**, `Authorization: Bearer` y respuestas RFC 7807 (`detail`).

1. **Asignación por categoría:** `CreateReservationRequest` recibe `roomType`, no un número de habitación. La tarjeta muestra una habitación de referencia; el backend asigna la disponible y el resumen posterior muestra el número real.
2. **Servicios sin cantidad configurable:** `AddServiceRequest` acepta solo `serviceType`. El frontend fija 1 para spa/traslado y todas las noches para desayuno. No envía una cantidad que el backend ignora.
3. **Datos del huésped:** el backend acepta nombre, email y teléfono. No almacena documento ni número de huéspedes; el documento se pide únicamente en demo y la capacidad se usa como filtro orientativo en API.
4. **Listado:** no existe endpoint de listado global. Se consultan los IDs creados o incorporados por el usuario en este navegador. Una cuenta no ve el índice de otra.
5. **Llave:** el backend entrega `digitalKey` al hacer check-in y lo elimina al salir. No expone un endpoint de apertura; la prueba de cerradura es una simulación del navegador que consulta la reserva actualizada.

Consulta **[docs/API.md](docs/API.md)** para ejemplos exactos.

## Tarifas y reglas

Importes en **USD**: sencilla 80/noche, doble 120/noche, suite 250/noche, según `RoomType.java`. Temporada alta: enero, junio, julio y diciembre, según `application.yml`. Cada noche se calcula por su temporada; la salida no se cobra. Límite: **30 noches**, igual al backend.

Spa USD 50, desayuno USD 15 por noche, traslado USD 30. El modo demo permite seleccionar cantidades y mantiene el mismo costo unitario; el modo API respeta la cantidad automática del servidor. Un check-out anticipado mantiene el valor de las noches contratadas. La UI permite check-in durante las fechas de estancia, como restricción de operación adicional; el backend suministrado valida el estado pero no limita la fecha de check-in.

Las capacidades 1/2/4 y los metrajes son datos de presentación del frontend: el backend no expone esas propiedades. No se agregaron impuestos, descuentos ni pagos que no aparecen en el contrato suministrado.

## Recorrido de demostración

1. Reserva con llegada hoy y salida dos días después, usando datos ficticios.
2. Agrega un spa, dos días de desayuno y un traslado: USD 110 adicionales.
3. Haz check-in, entra en **Acceso digital**, pulsa **Usar esta llave** y **Simular apertura**.
4. Prueba otra habitación o cambia la llave: el acceso se rechaza.
5. Haz check-out. Se genera la factura, se libera la habitación y la llave deja de funcionar.
6. En demo, recarga para comprobar persistencia. En API, vuelve a iniciar sesión y consulta los IDs conocidos.

Las tres reservas demo iniciales están identificadas como ejemplos. Para empezar de cero, borra únicamente el almacenamiento de este sitio desde las herramientas del navegador.

## Patrones y pruebas

`React → useHotel / HotelFacade → DemoAdapter / ApiAdapter → Repository / Spring Boot`

**Facade, Singleton, Adapter, Repository y Strategy.** Las páginas no acceden directamente a adaptadores o repositorios. Detalles en **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Pruebas de cruces de reservas, temporadas, datos del huésped, ciclo de estancia, servicios, llave, persistencia, DTOs reales, errores RFC 7807, autenticación y renovación de sesión. **[docs/TESTING.md](docs/TESTING.md)** describe el alcance y sus límites.

## Despliegue y Git

`vercel.json` configura Vite y la salida `dist`. Importa el repositorio en Vercel, prueba primero la **rama de trabajo** y configura `VITE_DATA_MODE=api` y `VITE_API_BASE_URL=https://tu-backend/api/v1`. Las variables `VITE_*` son públicas: no incluyas secretos.

Se conservaron los scripts AWS que aparecieron en `main` durante el trabajo, junto con `.gitattributes` y el prefijo `/api/v1`. No se ejecutaron scripts AWS ni se alteraron recursos existentes. En CloudFront con proxy del backend, puede usarse la URL relativa `/api/v1`.

El usuario solicitó trabajar en ramas y mensajes «Commit de Johan Muñoz: …». No se hace push directo a `main`. El ZIP final incluye una guía de PowerShell independiente para subir los archivos manualmente si se necesita.

## Alcance

La demo no es un sistema de seguridad, no controla cerraduras físicas ni realiza cobros. Su factura no tiene validez fiscal. En API, la autorización y los cambios de inventario dependen del backend suministrado. Los datos en memoria del backend no sobreviven a un reinicio. El `task.md` original se conserva como referencia histórica; sus instrucciones para agentes no sustituyen los requerimientos del usuario.

Fotografías de referencia locales desde Unsplash (no representan habitaciones reales garantizadas): `photo-1611892440504-42a792e24d32`, `photo-1590490360182-c33d57733427`, `photo-1582719478250-c89cae4dc85b`. Iconos Lucide; fuentes DM Sans/Manrope desde Google Fonts, con alternativas locales.
