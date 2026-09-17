import React, { useState, useMemo } from 'react';
import { getSales, getProducts, getConfig } from '../store';
import { FileDown, FileText, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'profit'>('sales');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const products = getProducts();
  const sales = getSales();
  const config = getConfig();
  const categories = [...new Set(products.map(p => p.category))];

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const d = new Date(s.date);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [sales, dateFrom, dateTo]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => !categoryFilter || p.category === categoryFilter);
  }, [products, categoryFilter]);

  const profitData = useMemo(() => {
    return filteredSales.map(sale => {
      const profit = sale.items.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        const cost = product ? product.costPrice * item.quantity : 0;
        return sum + (item.total - cost);
      }, 0);
      return { ...sale, profit };
    });
  }, [filteredSales, products]);

  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = profitData.reduce((sum, s) => sum + s.profit, 0);
  const totalCost = totalRevenue - totalProfit;

  const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(16);
    doc.text(config.name, pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(config.address, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Tel: ${config.phone} | NIF: ${config.nif}`, pageWidth / 2, 34, { align: 'center' });

    let startY = 45;

    if (reportType === 'sales') {
      doc.setFontSize(14);
      doc.text('Reporte de Ventas', pageWidth / 2, startY, { align: 'center' });
      startY += 5;
      doc.setFontSize(9);
      if (dateFrom || dateTo) {
        doc.text(`Período: ${dateFrom || 'Inicio'} al ${dateTo || 'Hoy'}`, pageWidth / 2, startY + 5, { align: 'center' });
        startY += 10;
      }

      const tableData = filteredSales.map(s => [
        `#${s.invoiceNumber.toString().padStart(5, '0')}`,
        new Date(s.date).toLocaleDateString('es-ES'),
        s.items.map(i => `${i.productName} x${i.quantity}`).join(', '),
        s.paymentMethod,
        formatCurrency(s.total),
      ]);

      autoTable(doc, {
        startY: startY + 5,
        head: [['Factura', 'Fecha', 'Productos', 'Pago', 'Total']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      const finalY = (doc as any).lastAutoTable.finalY || startY + 50;
      doc.setFontSize(10);
      doc.text(`Total ventas: ${filteredSales.length} | Ingresos: ${formatCurrency(totalRevenue)}`, 14, finalY + 10);

    } else if (reportType === 'inventory') {
      doc.setFontSize(14);
      doc.text('Reporte de Inventario', pageWidth / 2, startY, { align: 'center' });
      startY += 10;

      const tableData = filteredProducts.map(p => [
        p.code,
        p.name,
        p.category,
        formatCurrency(p.costPrice),
        formatCurrency(p.salePrice),
        p.stock.toString(),
        p.stock <= p.minStock ? 'ALERTA' : 'OK',
      ]);

      autoTable(doc, {
        startY: startY,
        head: [['Código', 'Producto', 'Categoría', 'P.Costo', 'P.Venta', 'Stock', 'Estado']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      const finalY = (doc as any).lastAutoTable.finalY || startY + 50;
      doc.setFontSize(10);
      doc.text(`Total productos: ${filteredProducts.length} | Valor inventario: ${formatCurrency(filteredProducts.reduce((s, p) => s + p.costPrice * p.stock, 0))}`, 14, finalY + 10);

    } else {
      doc.setFontSize(14);
      doc.text('Reporte de Ganancias', pageWidth / 2, startY, { align: 'center' });
      startY += 5;
      doc.setFontSize(9);
      if (dateFrom || dateTo) {
        doc.text(`Período: ${dateFrom || 'Inicio'} al ${dateTo || 'Hoy'}`, pageWidth / 2, startY + 5, { align: 'center' });
        startY += 10;
      }

      const tableData = profitData.map(s => [
        `#${s.invoiceNumber.toString().padStart(5, '0')}`,
        new Date(s.date).toLocaleDateString('es-ES'),
        formatCurrency(s.total),
        formatCurrency(s.total - s.profit),
        formatCurrency(s.profit),
      ]);

      autoTable(doc, {
        startY: startY + 5,
        head: [['Factura', 'Fecha', 'Ingresos', 'Costos', 'Ganancia']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      const finalY = (doc as any).lastAutoTable.finalY || startY + 50;
      doc.setFontSize(10);
      doc.text(`Ingresos: ${formatCurrency(totalRevenue)} | Costos: ${formatCurrency(totalCost)} | Ganancia neta: ${formatCurrency(totalProfit)}`, 14, finalY + 10);
    }

    doc.save(`reporte_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportExcel = () => {
    let data: any[][] = [];
    let sheetName = '';

    if (reportType === 'sales') {
      sheetName = 'Ventas';
      data = [
        ['Factura', 'Fecha', 'Productos', 'Método Pago', 'Total'],
        ...filteredSales.map(s => [
          `#${s.invoiceNumber.toString().padStart(5, '0')}`,
          new Date(s.date).toLocaleDateString('es-ES'),
          s.items.map(i => `${i.productName} x${i.quantity}`).join('; '),
          s.paymentMethod,
          s.total,
        ]),
        ['', '', '', 'TOTAL:', totalRevenue],
      ];
    } else if (reportType === 'inventory') {
      sheetName = 'Inventario';
      data = [
        ['Código', 'Producto', 'Categoría', 'P.Costo', 'P.Venta', 'Stock', 'Stock Mín.', 'Estado'],
        ...filteredProducts.map(p => [
          p.code, p.name, p.category, p.costPrice, p.salePrice, p.stock, p.minStock,
          p.stock === 0 ? 'AGOTADO' : p.stock <= p.minStock ? 'BAJO' : 'OK'
        ]),
      ];
    } else {
      sheetName = 'Ganancias';
      data = [
        ['Factura', 'Fecha', 'Ingresos', 'Costos', 'Ganancia'],
        ...profitData.map(s => [
          `#${s.invoiceNumber.toString().padStart(5, '0')}`,
          new Date(s.date).toLocaleDateString('es-ES'),
          s.total,
          s.total - s.profit,
          s.profit,
        ]),
        ['', 'TOTALES:', totalRevenue, totalCost, totalProfit],
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `reporte_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtros del reporte
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de reporte</label>
            <select value={reportType} onChange={e => setReportType(e.target.value as any)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="sales">Ventas</option>
              <option value="inventory">Inventario</option>
              <option value="profit">Ganancias</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {reportType === 'inventory' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todas</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {reportType === 'sales' && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Total ventas</p>
              <p className="text-2xl font-bold text-gray-800">{filteredSales.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Ingresos totales</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Ticket promedio</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0)}</p>
            </div>
          </>
        )}
        {reportType === 'inventory' && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Productos</p>
              <p className="text-2xl font-bold text-gray-800">{filteredProducts.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Valor inventario (costo)</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(filteredProducts.reduce((s, p) => s + p.costPrice * p.stock, 0))}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Alertas stock</p>
              <p className="text-2xl font-bold text-red-600">{filteredProducts.filter(p => p.stock <= p.minStock).length}</p>
            </div>
          </>
        )}
        {reportType === 'profit' && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Ingresos</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Costos</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalCost)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">Ganancia neta</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalProfit)}</p>
            </div>
          </>
        )}
      </div>

      {/* Export buttons */}
      <div className="flex gap-3">
        <button
          onClick={exportPDF}
          className="flex items-center gap-2 px-5 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          <FileText className="w-4 h-4" />
          Exportar PDF
        </button>
        <button
          onClick={exportExcel}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
        >
          <FileDown className="w-4 h-4" />
          Exportar Excel
        </button>
      </div>
    </div>
  );
}
