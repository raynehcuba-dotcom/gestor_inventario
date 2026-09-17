import React, { useMemo } from 'react';
import { getProducts, getSales, getConfig, getProviders, getProviderBalance } from '../store';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, AlertTriangle, CreditCard } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const products = getProducts();
  const sales = getSales();
  const config = getConfig();

  const providers = getProviders();
  
  const stats = useMemo(() => {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisWeekSales = sales.filter(s => new Date(s.date) >= thisWeekStart);
    const lastWeekSales = sales.filter(s => new Date(s.date) >= lastWeekStart && new Date(s.date) < thisWeekStart);
    const thisMonthSales = sales.filter(s => new Date(s.date) >= thisMonthStart);
    const lastMonthSales = sales.filter(s => new Date(s.date) >= lastMonthStart && new Date(s.date) < thisMonthStart);

    const thisWeekRevenue = thisWeekSales.reduce((sum, s) => sum + s.total, 0);
    const lastWeekRevenue = lastWeekSales.reduce((sum, s) => sum + s.total, 0);
    const thisMonthRevenue = thisMonthSales.reduce((sum, s) => sum + s.total, 0);
    const lastMonthRevenue = lastMonthSales.reduce((sum, s) => sum + s.total, 0);

    // Calculate total payables
    const totalPayables = providers.reduce((sum, p) => sum + getProviderBalance(p.id), 0);

    // Calculate profit (revenue - cost)
    const calcProfit = (saleList: typeof sales) => {
      return saleList.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => {
          const product = products.find(p => p.id === item.productId);
          const cost = product ? product.costPrice * item.quantity : 0;
          return itemSum + (item.total - cost);
        }, 0);
      }, 0);
    };

    const thisWeekProfit = calcProfit(thisWeekSales);
    const lastWeekProfit = calcProfit(lastWeekSales);
    const thisMonthProfit = calcProfit(thisMonthSales);
    const lastMonthProfit = calcProfit(lastMonthSales);

    const lowStockProducts = products.filter(p => p.stock <= p.minStock);
    const outOfStockProducts = products.filter(p => p.stock === 0);

    // Top products by revenue
    const productRevenue: Record<string, { name: string; revenue: number; qty: number }> = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productRevenue[item.productId]) {
          productRevenue[item.productId] = { name: item.productName, revenue: 0, qty: 0 };
        }
        productRevenue[item.productId].revenue += item.total;
        productRevenue[item.productId].qty += item.quantity;
      });
    });
    const topProducts = Object.values(productRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Weekly trend (last 4 weeks)
    const weeklyTrend = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const weekSales = sales.filter(s => {
        const d = new Date(s.date);
        return d >= weekStart && d < weekEnd;
      });
      const revenue = weekSales.reduce((sum, s) => sum + s.total, 0);
      weeklyTrend.push({
        name: `Sem ${4 - i}`,
        ingresos: revenue,
      });
    }

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthSales = sales.filter(s => {
        const d = new Date(s.date);
        return d >= monthStart && d < monthEnd;
      });
      const revenue = monthSales.reduce((sum, s) => sum + s.total, 0);
      const profit = monthSales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => {
          const product = products.find(p => p.id === item.productId);
          const cost = product ? product.costPrice * item.quantity : 0;
          return itemSum + (item.total - cost);
        }, 0);
      }, 0);
      
      monthlyTrend.push({
        name: monthStart.toLocaleDateString('es-ES', { month: 'short' }),
        ingresos: revenue,
        ganancia: profit,
      });
    }

    // Category distribution
    const categoryData: Record<string, number> = {};
    products.forEach(p => {
      categoryData[p.category] = (categoryData[p.category] || 0) + p.stock;
    });
    const categories = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

    const weekRevChange = lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;
    const monthRevChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    const weekProfitChange = lastWeekProfit > 0 ? ((thisWeekProfit - lastWeekProfit) / lastWeekProfit) * 100 : 0;
    const monthProfitChange = lastMonthProfit > 0 ? ((thisMonthProfit - lastMonthProfit) / lastMonthProfit) * 100 : 0;

    return {
      thisWeekRevenue, lastWeekRevenue, thisMonthRevenue, lastMonthRevenue,
      thisWeekProfit, lastWeekProfit, thisMonthProfit, lastMonthProfit,
      weekRevChange, monthRevChange, weekProfitChange, monthProfitChange,
      lowStockProducts, outOfStockProducts, topProducts, weeklyTrend, monthlyTrend, categories,
      totalProducts: products.length,
      totalSales: sales.length,
      totalPayables,
    };
  }, [products, sales, providers]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const formatCurrency = (n: number) => `$${n.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const KPICard = ({ title, value, change, icon: Icon, color }: { title: string; value: string; change: number; icon: any; color: string }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {change !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${change > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Ingresos este mes"
          value={formatCurrency(stats.thisMonthRevenue)}
          change={stats.monthRevChange}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <KPICard
          title="Ingresos esta semana"
          value={formatCurrency(stats.thisWeekRevenue)}
          change={stats.weekRevChange}
          icon={ShoppingCart}
          color="bg-emerald-500"
        />
        <KPICard
          title="Ganancia este mes"
          value={formatCurrency(stats.thisMonthProfit)}
          change={stats.monthProfitChange}
          icon={TrendingUp}
          color="bg-purple-500"
        />
        <KPICard
          title="Productos en inventario"
          value={stats.totalProducts.toString()}
          change={0}
          icon={Package}
          color="bg-amber-500"
        />
      </div>

      {/* Alerts */}
      {(stats.lowStockProducts.length > 0 || stats.outOfStockProducts.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Alertas de Inventario
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.outOfStockProducts.map(p => (
              <span key={p.id} className="px-3 py-1.5 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-full">
                {p.name} — Agotado
              </span>
            ))}
            {stats.lowStockProducts.filter(p => p.stock > 0).map(p => (
              <span key={p.id} className="px-3 py-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-medium rounded-full">
                {p.name} — Stock bajo ({p.stock} uds)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Payables summary (admin only) */}
      {isAdmin && stats.totalPayables > 0 && (
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-red-500" />
              Obligaciones pendientes con proveedores
            </h3>
            <span className="text-xl font-bold text-red-600">{formatCurrency(stats.totalPayables)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {providers.filter(p => getProviderBalance(p.id) > 0).map(p => {
              const bal = getProviderBalance(p.id);
              return (
                <span key={p.id} className="px-3 py-1.5 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-full">
                  {p.name}: {formatCurrency(bal)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Tendencia mensual</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="ingresos" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ganancia" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Ingresos últimas 4 semanas</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.weeklyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Line type="monotone" dataKey="ingresos" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Productos más vendidos</h3>
          {stats.topProducts.length > 0 ? (
            <div className="space-y-3">
              {stats.topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-blue-50 text-blue-600 rounded text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm text-gray-700">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">{formatCurrency(p.revenue)}</p>
                    <p className="text-xs text-gray-500">{p.qty} uds</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Sin ventas registradas</p>
          )}
        </div>

        {/* Category distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Inventario por categoría</h3>
          {stats.categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.categories} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {stats.categories.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">Sin productos</p>
          )}
        </div>
      </div>

      {/* Period comparison (admin only) */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Comparativo de períodos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Semana actual</p>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(stats.thisWeekRevenue)}</p>
              <p className="text-xs text-gray-500">Ganancia: {formatCurrency(stats.thisWeekProfit)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Semana anterior</p>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(stats.lastWeekRevenue)}</p>
              <p className="text-xs text-gray-500">Ganancia: {formatCurrency(stats.lastWeekProfit)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Mes actual</p>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(stats.thisMonthRevenue)}</p>
              <p className="text-xs text-gray-500">Ganancia: {formatCurrency(stats.thisMonthProfit)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Mes anterior</p>
              <p className="text-lg font-bold text-gray-800">{formatCurrency(stats.lastMonthRevenue)}</p>
              <p className="text-xs text-gray-500">Ganancia: {formatCurrency(stats.lastMonthProfit)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}