# Verificación

## Comandos

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

La configuración de CI ejecuta las mismas verificaciones en ramas `codex/**` y pull requests a `main`, sin permisos de escritura ni secretos de despliegue.

## Casos automatizados

Resultado de la entrega: **17 pruebas del frontend aprobadas**, TypeScript estricto sin errores, ESLint sin errores y compilación de producción exitosa. En la copia del backend original: **12 pruebas Maven aprobadas** (8 de `HotelFlowIntegrationTest` y 4 de `RateServiceTest`), sin cambios al código Java.

El entorno requirió precargar el agente Byte Buddy ya incluido entre las dependencias de pruebas, mediante `argLine`, porque no admite su autoacoplamiento por tubería. Esa adaptación fue solo del comando de pruebas; no modificó el backend ni su configuración productiva.

- 18 habitaciones únicas en tres categorías, iguales al catálogo del backend.
- Fechas inválidas, año bisiesto, rango invertido, fechas pasadas y límite de noches.
- Cruce de mayo/junio: tarifa base por una noche y ×1,5 por la siguiente.
- Nombre, contacto, documento y capacidad.
- Rechazo de reservas cruzadas y aceptación de reservas adyacentes.
- Filtros de disponibilidad, tipo y huéspedes.
- Recorrido reserva → check-in → acceso → servicios → check-out → factura.
- Rechazo de llave incorrecta, habitación incorrecta y llave invalidada.
- Rechazo de transiciones repetidas y check-in futuro.
- Cantidades de servicios y límite de días de desayuno.
- Restauración y copias defensivas de datos persistidos.
- Errores de almacenamiento, HTTP, formato de respuesta y conexión.

Las pruebas del adaptador REST usan respuestas controladas con los DTOs del ZIP real, incluidos login, Bearer JWT, renovación, servicios y factura. Se ejecutan además las pruebas Maven originales del backend en una copia de trabajo; esto comprueba su contrato de forma independiente. No equivale a una prueba visual completa del navegador contra el backend desplegado.

## Revisión manual recomendada

1. Iniciar Vite y recorrer el flujo descrito en README con datos ficticios.
2. Recargar y comprobar la persistencia.
3. Probar fechas futuras, tipos sin disponibilidad y filtros por 4 huéspedes.
4. Navegar con teclado, abrir/cerrar diálogos y revisar el retorno del foco.
5. Revisar escritorio, tableta y móvil, especialmente menú, formulario y tabla.
6. Hacer check-out e imprimir la factura; comprobar que la navegación no aparece en impresión.
7. Repetir contra Spring Boot en modo API y comprobar los totales del servidor.

Durante la preparación local, el servidor Vite inició y la compilación fue exitosa, pero el navegador del entorno no pudo establecer conexión con el puerto local. Por ello no se considera completada la verificación visual en navegador en este entorno. Esto no se oculta como una prueba aprobada.
