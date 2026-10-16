# Contrato verificado contra el código del backend

Referencia: ZIP `Hotel-Reservations-backend--main.zip`, controladores en `com.hotel.reservations.hotel.controller` y `auth.controller`. Raíz: **`/api/v1`**. Todos los endpoints hoteleros requieren JWT. Se conservan las rutas en español del taller y los campos del DTO **en inglés**, tal como están implementados.

## Autenticación

| Método | Ruta             | Cuerpo / respuesta                                                            |
| ------ | ---------------- | ----------------------------------------------------------------------------- |
| POST   | `/auth/register` | `{ fullName, email, password }` → `{ id, fullName, email, role }`             |
| POST   | `/auth/login`    | `{ email, password }` → `{ accessToken, refreshToken, tokenType, expiresIn }` |
| POST   | `/auth/refresh`  | `{ refreshToken }` → nuevos tokens                                            |
| GET    | `/auth/me`       | Bearer access token → usuario actual                                          |

El registro requiere contraseña de 8 a 72 caracteres, con una letra y un número. El frontend no persiste credenciales. Mantiene los tokens en memoria y coordina una sola renovación cuando varias solicitudes coinciden. Un 401 invalida la sesión del cliente; un 403 conserva la sesión y muestra el rechazo. No hay endpoint de logout: se borran las credenciales en memoria. La revocación anticipada de un JWT ya emitido requeriría soporte adicional en el backend.

## Endpoints hoteleros

| Método | Ruta                                                                                   | Contrato                                              |
| ------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| GET    | `/hotel/disponibilidad?checkInDate=2028-02-01&checkOutDate=2028-02-03&roomType=DOUBLE` | `AvailabilityResponse`                                |
| POST   | `/hotel/reservar`                                                                      | `CreateReservationRequest` → `ReservationResponse`    |
| POST   | `/hotel/servicios/{id}`                                                                | `{ serviceType }` → `ReservationResponse`             |
| PUT    | `/hotel/checkin/{id}`                                                                  | Sin cuerpo → `ReservationResponse`                    |
| PUT    | `/hotel/checkout/{id}`                                                                 | Sin cuerpo → reserva con factura                      |
| GET    | `/hotel/reserva/{id}`                                                                  | Reserva actualizada, accesible al propietario o admin |

`roomType` es opcional al buscar. Valores: `SINGLE`, `DOUBLE`, `SUITE`. La salida es exclusiva y el máximo es 30 noches.

### Disponibilidad

```json
{
  "checkInDate": "2028-02-01",
  "checkOutDate": "2028-02-03",
  "nights": 2,
  "rooms": [
    {
      "roomNumber": "201",
      "roomType": "DOUBLE",
      "totalPrice": 240,
      "priceBreakdown": [{ "season": "LOW", "nights": 2, "nightlyRate": 120, "subtotal": 240 }]
    }
  ]
}
```

Las líneas agrupan noches por temporada; no incluyen fechas individuales. La UI muestra el desglose por grupo y respeta el precio recibido. No inventa fechas dentro de esas líneas.

### Crear reserva

```json
{
  "guestName": "Test Guest",
  "guestEmail": "guest@example.com",
  "guestPhone": "+57 300 123 4567",
  "roomType": "DOUBLE",
  "checkInDate": "2028-02-01",
  "checkOutDate": "2028-02-03"
}
```

El backend asigna la habitación por categoría. No acepta habitación específica, documento ni cantidad de huéspedes.

### Reserva

```json
{
  "id": "324b8b97-705a-4f48-8472-2539f7c86c14",
  "status": "CONFIRMED",
  "guestName": "Test Guest",
  "guestEmail": "guest@example.com",
  "guestPhone": "+57 300 123 4567",
  "roomNumber": "201",
  "roomType": "DOUBLE",
  "checkInDate": "2028-02-01",
  "checkOutDate": "2028-02-03",
  "nights": 2,
  "priceBreakdown": [{ "season": "LOW", "nights": 2, "nightlyRate": 120, "subtotal": 240 }],
  "roomCost": 240,
  "services": [],
  "servicesTotal": 0,
  "total": 240
}
```

Estados: `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`. Temporadas: `LOW`, `HIGH`. El backend omite valores nulos. El adaptador admite que no existan `digitalKey` ni `invoice`.

### Servicios

```json
{ "serviceType": "BREAKFAST" }
```

Valores: `SPA`, `BREAKFAST`, `TRANSPORT`. No se envía cantidad: spa y traslado agregan 1 unidad; desayuno agrega el número de noches completo. Ejemplo de línea devuelta:

```json
{ "serviceType": "BREAKFAST", "quantity": 2, "unitPrice": 15, "total": 30 }
```

### Check-in y factura

Al hacer check-in aparece `digitalKey: { code, roomNumber, issuedAt }`. Al hacer check-out se elimina ese objeto y se recibe `invoice`:

```json
{
  "invoiceNumber": "INV-2028-000001",
  "reservationId": "324b8b97-705a-4f48-8472-2539f7c86c14",
  "guestName": "Test Guest",
  "guestEmail": "guest@example.com",
  "roomNumber": "201",
  "checkInDate": "2028-02-01",
  "checkOutDate": "2028-02-03",
  "roomLines": [
    { "description": "DOUBLE room - LOW season", "quantity": 2, "unitPrice": 120, "amount": 240 }
  ],
  "serviceLines": [],
  "roomSubtotal": 240,
  "servicesSubtotal": 0,
  "total": 240,
  "issuedAt": "2028-02-03T15:00:00Z"
}
```

Las líneas e importes de esta factura se muestran directamente. El backend no declara moneda; el taller se interpreta en USD de forma explícita en la UI.

## Errores y límites

Se usa `ProblemDetail`: `detail`, `title`, `status` y, para validación, `errors`. El cliente muestra el detalle y los mensajes por campo. Timeout: 12 segundos. No hay reintentos automáticos de mutaciones ni fallback silencioso a demo.

No existen endpoints de listado global, cancelación, pago ni apertura de cerradura. El índice local de reservas se separa por ID de usuario. La prueba de acceso consulta la reserva actualizada y valida localmente el UUID, la habitación y las fechas; no sustituye un control de acceso físico.

El backend opera con `Clock.systemDefaultZone()`. Configura la zona de su proceso acorde con el hotel (la UI usa America/Bogota) para evitar diferencias de fecha alrededor de medianoche.
