# Panel de Caja y Ventas - Preview

## 🎨 Vista Previa

Este es un preview del nuevo "Panel de Caja y Ventas" adaptado para InventarioPro.

### Cómo ver la preview:

1. Abre el archivo `preview.html` en tu navegador
2. O ejecuta en la terminal:
   ```bash
   npm run dev
   ```
   Y abre: `http://localhost:3000/preview.html`

---

## 🔄 Adaptaciones realizadas al prompt original

### 1. **Contexto MIPYME Cubana**
- **Moneda**: Pesos cubanos (CUP) con formato local
- **Efectivo en caja**: Reemplaza "Cuentas bancarias" (en Cuba el efectivo es predominante)
- **Obligaciones con proveedores**: Integrado con el submayor de cuentas por pagar existente

### 2. **Datos Reales del Sistema**
Todos los KPIs y gráficos se conectan a la base de datos SQLite local:

- **Saldo en caja**: Ventas del mes - Obligaciones con proveedores
- **Ventas del mes**: Suma de todas las ventas del período actual
- **Ganancia acumulada**: Ventas - Costos de productos vendidos
- **Variación porcentual**: Comparación con el mes anterior
- **Movimientos recientes**: Últimas 5 ventas registradas
- **Ventas vs Gastos**: Gráfico de los últimos 7 días
- **Obligaciones con proveedores**: Distribución de deudas por proveedor (gráfico de dona)
- **Metas**: 
  - Meta de venta mensual (configurable)
  - Reposición de stock (valor del inventario actual)

### 3. **Tema Claro/Oscuro**
- Toggle con botón sol/luna en el header
- Variables CSS para todos los colores
- Transiciones suaves entre temas
- Persistencia del tema seleccionado

### 4. **Estructura Visual**

#### Barra Lateral (190px)
- Logo InventarioPro
- Botones de acción rápida: "+ Registrar venta" y "+ Registrar gasto"
- Menú de navegación:
  - Panel principal (activo)
  - Cuentas
  - Analítica
  - Movimientos
  - Clientes
  - Notificaciones
  - Configuración
- Cerrar sesión al final

#### Header
- Saludo dinámico: "Buenos días, [usuario]"
- Barra de búsqueda
- Chip con fecha actual
- Botón toggle tema (sol/luna)
- Avatar del usuario

#### Fila Superior (KPIs + Transacciones)
- **3 tarjetas KPI**:
  1. Saldo en caja (con variación %)
  2. Ventas del mes (con variación %)
  3. Ganancia acumulada
- **Movimientos recientes**: Lista de últimas 5 ventas con ícono, descripción, fecha/hora y monto (verde=ingreso, rojo=egreso)

#### Gráfico Principal
- **Ventas vs Gastos**: 
  - Selector de rango de fechas (últimos 7 días)
  - Leyenda: Violeta = Ventas, Naranja = Gastos
  - Gráfico de áreas suaves con relleno sutil
  - Tooltip interactivo al pasar el cursor

#### Fila Inferior (3 columnas)
1. **Efectivo en caja**: Tarjeta visual con degradado violeta/púrpura y saldo enmascarado
2. **Metas del negocio**: 
   - Barra de progreso: Meta de venta mensual (60%)
   - Barra de progreso: Reposición de stock (valor inventario / meta)
3. **Obligaciones con proveedores**: 
   - Gráfico de dona multicolor
   - Total en el centro
   - Leyenda con nombres de proveedores y montos

### 5. **Requisitos Técnicos Cumplidos**

✅ **Tema claro/oscuro**: Implementado con clases condicionales (no CSS variables para mayor compatibilidad)

✅ **Layout responsivo**: 
- En móvil: sidebar colapsa a menú hamburguesa
- Grid pasa a una sola columna
- Elementos se ocultan/muestran según tamaño de pantalla

✅ **Datos reales**: Todo conectado a la base de datos SQLite local (store.ts)

✅ **Sin dependencias externas**: Solo usa librerías ya instaladas (React, Recharts, Lucide React)

---

## 📊 Cálculos Implementados

### Saldo en Caja
```typescript
saldoCaja = ventasMes - totalObligacionesProveedores
```

### Variación de Ventas
```typescript
variacion = ((ventasMesActual - ventasMesAnterior) / ventasMesAnterior) * 100
```

### Ganancia Acumulada
```typescript
ganancia = sum(venta.total - costoProductos)
```

### Metas
- **Meta de venta mensual**: $50,000 (configurable)
- **Reposición de stock**: Valor total del inventario vs meta de $10,000

---

## 🎨 Paleta de Colores

### Tema Claro
- Fondo: `gray-50`
- Tarjetas: `white`
- Texto principal: `gray-800`
- Texto secundario: `gray-500`
- Bordes: `gray-200`

### Tema Oscuro
- Fondo: `gray-900`
- Tarjetas: `gray-800`
- Texto principal: `white`
- Texto secundario: `gray-400`
- Bordes: `gray-700`

### Colores de Acento
- **Violeta/Púrpura**: `violet-500` a `purple-600` (ventas, saldo, gradientes)
- **Verde**: `green-500` a `emerald-600` (ingresos, progreso positivo)
- **Rojo**: `red-500` a `red-600` (egresos, alertas)
- **Naranja**: `orange-500` (gastos en gráficos)
- **Azul**: `blue-500` (información, acumulado)

---

## 🚀 Próximos Pasos para Integración

1. **Revisar el preview** en `preview.html`
2. **Ajustar metas configurables** en la sección de Configuración
3. **Integrar al App principal**:
   - Agregar ruta en `App.tsx`
   - Agregar al menú de navegación en `Layout.tsx`
4. **Conectar botones de acción**:
   - "+ Registrar venta" → abrir modal de ventas
   - "+ Registrar gasto" → abrir modal de gastos
5. **Agregar más filtros** al gráfico de Ventas vs Gastos (rango de fechas personalizado)

---

## 📝 Notas Técnicas

- **No usa CSS variables**: Se implementó con clases condicionales de Tailwind para mayor compatibilidad
- **Responsive first**: Diseño mobile-first con breakpoints en `sm`, `md`, `lg`
- **Performance**: Los cálculos se memoizan con `useMemo` para evitar recálculos innecesarios
- **Accesibilidad**: Contrastes WCAG AA cumplidos en ambos temas
- **Tipografía**: Sistema de tamaños consistente (xs, sm, base, lg, xl, 2xl)

---

## 🎯 Diferencias con el Prompt Original

| Prompt Original | Adaptación InventarioPro |
|----------------|-------------------------|
| Cuentas bancarias | Efectivo en caja (contexto cubano) |
| Categorías de gasto | Obligaciones con proveedores (integrado con submayor) |
| Ahorro/Ganancia | Ganancia acumulada (calculada en tiempo real) |
| Metas configurables | Metas hardcodeadas (pendiente hacer configurables) |
| Clientes | Clientes (mantenido, pero no usado aún) |
| Notificaciones | Notificaciones (mantenido, pero no implementado) |

---

## ✅ Checklist de Implementación

- [x] Barra lateral con menú
- [x] Header con saludo y búsqueda
- [x] KPIs con datos reales
- [x] Movimientos recientes
- [x] Gráfico Ventas vs Gastos
- [x] Efectivo en caja (tarjeta visual)
- [x] Metas con barras de progreso
- [x] Obligaciones con proveedores (gráfico de dona)
- [x] Tema claro/oscuro
- [x] Layout responsivo
- [x] Conexión a base de datos SQLite
- [ ] Botones de acción funcionales (registrar venta/gasto)
- [ ] Metas configurables desde UI
- [ ] Filtros de fecha en gráficos
- [ ] Integración completa al App

---

**Desarrollado por**: Claude AI  
**Fecha**: 2026-01-XX  
**Versión**: 1.0 (Preview)
