# gestor_inventario
Desarrollo Web Offline para MIPYME

## Cuadre Semanal

El módulo **Cuadre Semanal** está disponible para administradores en el menú principal. Permite registrar importes semanales en CUP, consultar y filtrar el histórico, editar cuadres conservando el historial de auditoría y exportar los resultados filtrados a PDF o Excel.

Al seleccionar el período, el módulo completa automáticamente las ventas en efectivo, las ventas por transferencia y el costo de los productos vendidos. La ganancia semanal es efectivo + transferencias − costo de productos vendidos. Se muestra la distribución del 50 % para Emelyh y el 50 % para Gaibelis; si el resultado tiene un centavo impar, se asigna a Gaibelis para que ambas partes sumen exactamente el total.

Los períodos no pueden solaparse. El sistema registra el usuario y la fecha de creación o modificación, y conserva una copia de los valores anteriores en el historial de auditoría. El costo unitario se guarda con cada venta para que futuros cambios del catálogo no alteren la ganancia histórica. En ventas existentes, la migración toma el costo disponible en el catálogo y recalcula los cuadres guardados, dejando constancia de la migración en la auditoría.
