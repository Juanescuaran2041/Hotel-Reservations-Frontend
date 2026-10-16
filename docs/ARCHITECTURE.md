# Arquitectura

```text
React pages / components
         |
     HotelFacade (Singleton)
       /          \
 DemoAdapter     ApiAdapter ---- AuthClient (in-memory JWT)
      |                |                |
 LocalRepository     Spring Boot /api/v1
      |
 versioned localStorage

Pure domain functions: dates, capacity, pricing strategies, service totals and demo invoices.
```

La interfaz accede a la fachada; no importa adaptadores o repositorios. Los tipos, constantes de presentación y helpers puros no acceden a almacenamiento ni red.

| Patrón     | Archivo                                           | Uso                                                                                     |
| ---------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Facade     | `src/services/hotel-facade.ts`                    | Búsqueda, reserva, servicios, check-in/out, autenticación y simulación de acceso.       |
| Singleton  | `HotelFacade.getInstance()`                       | Compartir configuración y sesión en una instancia; constructor inyectable para pruebas. |
| Adapter    | `DemoAdapter`, `ApiAdapter`, `ReservationAdapter` | Alternar simulación y contrato real de Spring Boot.                                     |
| Repository | `LocalRepository`                                 | Persistencia versionada, copias defensivas y errores visibles.                          |
| Strategy   | `rateStrategies`                                  | ×1 o ×1,5 por temporada y por noche en demo.                                            |

## Contrato real

Se inspeccionó el backend suministrado. `ApiAdapter` utiliza los DTOs en inglés, `priceBreakdown` por temporada, asignación por categoría y `InvoiceResponse` con `roomLines`/`serviceLines`. `AuthClient` implementa login, registro, perfil y refresh del backend existente; no se añadió un proveedor de autenticación distinto.

La cuenta se identifica con `/auth/me`. Los tokens solo viven en memoria. El registro de IDs de reservas está separado por usuario. El cierre de sesión limpia la sesión y la UI; las respuestas de una sesión anterior se rechazan cuando cambió su generación. Las contraseñas no se registran ni persisten.

El acceso digital sigue siendo una simulación: el backend entrega/revoca la llave pero no expone validación de cerradura. El cliente comprueba el estado actualizado por GET antes de aceptar un código. La autorización real de reservas se conserva en Spring Security.

## Reglas y estados

`confirmed → checked_in → checked_out`

La demo rechaza cruces de fechas, exceso de capacidad y transiciones inválidas, y guarda una instantánea de la factura al salir. La API aplica las reglas del backend. La UI limita adicionalmente el check-in a las fechas de estancia.

El backend contiene 18 habitaciones y límites de 30 noches; el catálogo demo y las tarifas base se ajustaron para coincidir. La capacidad, metraje e imágenes son presentación local, porque el backend no devuelve esos datos.

## Conservación de cambios existentes

Durante el trabajo, `main` recibió configuración `/api/v1` y scripts AWS. Se revisaron y conservaron en la rama. Los scripts no se ejecutaron y no se cambió infraestructura AWS. El proxy Vite y la configuración relativa de API permanecen compatibles con CloudFront. Vercel dispone de configuración independiente para el frontend estático.

`task.md` se mantiene como referencia histórica. Se priorizó el contrato real: no se inventaron endpoints de pago o cancelación ni impuestos distintos de los requisitos. Se incluye toda la configuración para que el proyecto pueda clonarse y ejecutarse, aunque ese documento histórico propusiera versionar solo `src/`.

## Límites

El backend usa repositorios en memoria y pierde datos al reiniciarse. El frontend no resuelve esa limitación ni reemplaza las validaciones de servidor. El modo demo no autentica, no realiza cobros y no emite documentos fiscales. La integración se verifica con DTOs y pruebas controladas; el despliegue y la verificación visual dependen del entorno disponible.
