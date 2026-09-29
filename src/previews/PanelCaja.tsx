import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Wallet, TrendingUp, TrendingDown, Package, Users, 
  Bell, Settings, LogOut, Search, Sun, Moon, Plus, ArrowUpRight, 
  ArrowDownRight, Calendar, CreditCard, Target, ShoppingBag, Menu
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Area, AreaChart 
} from 'recharts';
import { getSales, getProducts, getProviders, getProviderBalance, getConfig } from '../store';

type Theme = 'light' | 'dark';

export default function PanelCaja() {
  const [theme, setTheme] = useState<Theme>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sales = getSales();
  const products = getProducts();
  const providers = getProviders();
  const config = getConfig();

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonthSales = sales.filter(s => new Date(s.date) >= thisMonthStart);
    const lastMonthSales = sales.filter(s => new Date(s.date) >= lastMonthStart && new Date(s.date) < thisMonthStart);

    const ventasMes = thisMonthSales.reduce((sum, s) => sum + s.total, 0);
    const ventasMesAnterior = lastMonthSales.reduce((sum, s) => sum + s.total, 0);
    const variacionVentas = ventasMesAnterior > 0 
      ? ((ventasMes - ventasMesAnterior) / ventasMesAnterior) * 100 
      : 0;

    const gananciaMes = thisMonthSales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.productId);
        const cost = product ? product.costPrice * item.quantity : 0;
        return itemSum + (item.total - cost);
      }, 0);
    }, 0);

    const saldoCaja = ventasMes - providers.reduce((sum, p) => sum + getProviderBalance(p.id), 0);

    const movimientosRecientes = sales.slice(0, 5).map(sale => ({
      id: sale.id,
      descripcion: `Venta #${sale.invoiceNumber.toString().padStart(5, '0')}`,
      fecha: new Date(sale.date),
      monto: sale.total,
      tipo: 'ingreso' as const,
    }));

    const ventasVsGastos = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const daySales = sales.filter(s => {
        const d = new Date(s.date);
        return d >= dayStart && d <= dayEnd;
      });

      const ventas = daySales.reduce((sum, s) => sum + s.total, 0);
      const gastos = daySales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => {
          const product = products.find(p => p.id === item.productId);
          const cost = product ? product.costPrice * item.quantity : 0;
          return itemSum + cost;
        }, 0);
      }, 0);

      ventasVsGastos.push({
        dia: date.toLocaleDateString('es-ES', { weekday: 'short' }),
        ventas,
        gastos,
      });
    }

    const categoriasGasto = providers
      .filter(p => getProviderBalance(p.id) > 0)
      .map(p => ({
        name: p.name,
        value: getProviderBalance(p.id),
      }));

    const metaVentaMensual = 50000;
    const porcentajeMetaVenta = (ventasMes / metaVentaMensual) * 100;
    
    const valorInventario = products.reduce((sum, p) => sum + p.costPrice * p.stock, 0);
    const metaReposicion = 10000;
    const porcentajeReposicion = (valorInventario / metaReposicion) * 100;

    return {
      saldoCaja,
      ventasMes,
      variacionVentas,
      gananciaMes,
      movimientosRecientes,
      ventasVsGastos,
      categoriasGasto,
      porcentajeMetaVenta,
      porcentajeReposicion,
      valorInventario,
      metaVentaMensual,
      metaReposicion,
    };
  }, [sales, products, providers]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const formatCurrency = (n: number) => `$${n.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const COLORS = ['#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#3B82F6'];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-48 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-r ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} z-40 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>InventarioPro</span>
          </div>

          <div className="space-y-2 mb-6">
            <button className="w-full flex items-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
              <Plus className="w-4 h-4" />
              Registrar venta
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors">
              <Plus className="w-4 h-4" />
              Registrar gasto
            </button>
          </div>

          <nav className="space-y-1">
            <a href="#" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${theme === 'dark' ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'}`}>
              <LayoutDashboard className="w-4 h-4" />
              Panel principal
            </a>
            <a href="#" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Wallet className="w-4 h-4" />
              Cuentas
            </a>
            <a href="#" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <TrendingUp className="w-4 h-4" />
              Analítica
            </a>
            <a href="#" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <ShoppingBag className="w-4 h-4" />
              Movimientos
            </a>
            <a href="#" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Users className="w-4 h-4" />
              Clientes
            </a>
            <a href="#" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Bell className="w-4 h-4" />
              Notificaciones
            </a>
            <a href="#" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Settings className="w-4 h-4" />
              Configuración
            </a>
          </nav>
        </div>

        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="lg:ml-48">
        <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 lg:px-8 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
                <Menu className={`w-6 h-6 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`} />
              </button>
              <div>
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  Buenos días, Administrador
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Panel de control de caja y ventas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className={`pl-10 pr-4 py-2 ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-50 text-gray-800 border-gray-200'} border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500`}
                />
              </div>

              <div className={`hidden sm:flex items-center gap-2 px-3 py-2 ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} rounded-lg text-sm`}>
                <Calendar className="w-4 h-4" />
                {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </div>

              <button
                onClick={toggleTheme}
                className={`p-2 ${theme === 'dark' ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'} rounded-lg hover:opacity-80 transition-opacity`}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                A
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${theme === 'dark' ? 'bg-violet-900' : 'bg-violet-100'} rounded-lg flex items-center justify-center`}>
                    <Wallet className={`w-5 h-5 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`} />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <ArrowUpRight className="w-3 h-3" />
                    12.5%
                  </div>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Saldo en caja</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {formatCurrency(stats.saldoCaja)}
                </p>
              </div>

              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${theme === 'dark' ? 'bg-green-900' : 'bg-green-100'} rounded-lg flex items-center justify-center`}>
                    <TrendingUp className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${stats.variacionVentas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.variacionVentas >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(stats.variacionVentas).toFixed(1)}%
                  </div>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Ventas del mes</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {formatCurrency(stats.ventasMes)}
                </p>
              </div>

              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'} rounded-lg flex items-center justify-center`}>
                    <CreditCard className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Ganancia acumulada</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {formatCurrency(stats.gananciaMes)}
                </p>
              </div>
            </div>

            <div className={`lg:col-span-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-4`}>
                Movimientos recientes
              </h3>
              <div className="space-y-3">
                {stats.movimientosRecientes.length > 0 ? (
                  stats.movimientosRecientes.map((mov, i) => (
                    <div key={mov.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${mov.tipo === 'ingreso' ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center`}>
                          {mov.tipo === 'ingreso' ? (
                            <ArrowUpRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ArrowDownRight className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                            {mov.descripcion}
                          </p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {mov.fecha.toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ${mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                        {mov.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(mov.monto)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center py-8`}>
                    No hay movimientos recientes
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Ventas vs. Gastos
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-violet-500 rounded-full" />
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Ventas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Gastos</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.ventasVsGastos}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                <XAxis dataKey="dia" stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                <YAxis stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${theme === 'dark' ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area type="monotone" dataKey="ventas" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorVentas)" />
                <Area type="monotone" dataKey="gastos" stroke="#F59E0B" fillOpacity={1} fill="url(#colorGastos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-4`}>
                Efectivo en caja
              </h3>
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-5 text-white">
                <div className="flex items-center justify-between mb-8">
                  <CreditCard className="w-8 h-8" />
                  <div className="w-10 h-10 bg-white/20 rounded-full" />
                </div>
                <p className="text-xs opacity-80 mb-1">Saldo disponible</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.saldoCaja)}</p>
              </div>
            </div>

            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-4`}>
                Metas del negocio
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      Meta de venta mensual
                    </span>
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {stats.porcentajeMetaVenta.toFixed(0)}%
                    </span>
                  </div>
                  <div className={`w-full h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                    <div 
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(stats.porcentajeMetaVenta, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                    {formatCurrency(stats.ventasMes)} / {formatCurrency(stats.metaVentaMensual)}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      Reposición de stock
                    </span>
                    <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      {stats.porcentajeReposicion.toFixed(0)}%
                    </span>
                  </div>
                  <div className={`w-full h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(stats.porcentajeReposicion, 100)}%` }}
                    />
                  </div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                    {formatCurrency(stats.valorInventario)} / {formatCurrency(stats.metaReposicion)}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-5 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-4`}>
                Obligaciones con proveedores
              </h3>
              {stats.categoriasGasto.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={stats.categoriasGasto}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        dataKey="value"
                      >
                        {stats.categoriasGasto.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {stats.categoriasGasto.slice(0, 3).map((cat, i) => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {cat.name}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                          {formatCurrency(cat.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center py-8`}>
                  Sin obligaciones pendientes
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}