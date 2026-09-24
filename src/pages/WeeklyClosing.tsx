import React, { useState, useMemo, useEffect } from 'react';
import { WeeklyClosing } from '../types';
import { getWeeklyClosings, saveWeeklyClosing, deleteWeeklyClosing } from '../store';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Download, FileText, Calculator, Calendar, Save, X, Eye } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function WeeklyClosingPage() {
  const { isAdmin } = useAuth();
  const [closings, setClosings] = useState<WeeklyClosing[]>(getWeeklyClosings());
  const [showForm, setShowForm] = useState(false);
  const [editingClosing, setEditingClosing] = useState<WeeklyClosing | null>(null);
  const [viewClosing, setViewClosing] = useState<WeeklyClosing | null>(null);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const formatCurrency = (n: number) => `$${n.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filteredClosings = useMemo(() => {
    return closings.filter(c => {
      const date = new Date(c.weekStart);
      const matchYear = !filterYear || date.getFullYear().toString() === filterYear;
      const matchMonth = !filterMonth || (date.getMonth() + 1).toString() === filterMonth;
      return matchYear && matchMonth;
    });
  }, [closings, filterMonth, filterYear]);

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este cuadre semanal?')) {
      await deleteWeeklyClosing(id);
      setClosings(getWeeklyClosings());
    }
  };

  const handleSave = async (closing: WeeklyClosing) => {
    await saveWeeklyClosing(closing);
    setClosings(getWeeklyClosings());
    setShowForm(false);
    setEditingClosing(null);
  };

  const exportPDF = (closing: WeeklyClosing) => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Cuadre Semanal', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Período: ${new Date(closing.weekStart).toLocaleDateString('es-ES')} - ${new Date(closing.weekEnd).toLocaleDateString('es-ES')}`, 105, 30, { align: 'center' });
    
    const data = [
      ['Efectivo Real', formatCurrency(closing.efectivoReal)],
      ['Transferencias Total', formatCurrency(closing.transferenciasTotal)],
      ['  - Emelyh', formatCurrency(closing.transferenciasEmelyh)],
      ['  - Gaibe', formatCurrency(closing.transferenciasGaibe)],
      ['A Pagar Efectivo Proveedores', formatCurrency(closing.aPagarEfectivoProveedores)],
      ['A Pagar Transferencias Proveedores', formatCurrency(closing.aPagarTransferenciasProveedores)],
      ['A Cobrar Dinero Efectivo', formatCurrency(closing.aCobrarDineroEfectivo)],
      ['Proveedor Efectivo', formatCurrency(closing.proveedorEfectivo)],
      ['', ''],
      ['Diferencia Semana', formatCurrency(closing.diferenciaSemana)],
      ['Ganancia Semana', formatCurrency(closing.gananciaSemana)],
      ['Resto', formatCurrency(closing.resto)],
      ['Resto + Ganancias', formatCurrency(closing.restoMasGanancias)],
      ['Total Efectivo Entre Dos', formatCurrency(closing.totalEfectivoEntreDos)],
      ['A Cobrar en Transferencia', formatCurrency(closing.aCobrarEnTransferencia)],
    ];

    autoTable(doc, {
      startY: 40,
      head: [['Concepto', 'Monto']],
      body: data,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    if (closing.notes) {
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      doc.setFontSize(10);
      doc.text('Notas:', 14, finalY + 10);
      doc.text(closing.notes, 14, finalY + 16, { maxWidth: 180 });
    }

    doc.save(`cuadre_semanal_${closing.weekStart}.pdf`);
  };

  const exportExcel = () => {
    const data = filteredClosings.map(c => ({
      'Fecha Inicio': new Date(c.weekStart).toLocaleDateString('es-ES'),
      'Fecha Fin': new Date(c.weekEnd).toLocaleDateString('es-ES'),
      'Efectivo Real': c.efectivoReal,
      'Transferencias Total': c.transferenciasTotal,
      'Transferencias Emelyh': c.transferenciasEmelyh,
      'Transferencias Gaibe': c.transferenciasGaibe,
      'A Pagar Efectivo': c.aPagarEfectivoProveedores,
      'A Pagar Transferencias': c.aPagarTransferenciasProveedores,
      'A Cobrar Efectivo': c.aCobrarDineroEfectivo,
      'Proveedor Efectivo': c.proveedorEfectivo,
      'Diferencia Semana': c.diferenciaSemana,
      'Ganancia Semana': c.gananciaSemana,
      'Resto': c.resto,
      'Resto + Ganancias': c.restoMasGanancias,
      'Total Efectivo Entre Dos': c.totalEfectivoEntreDos,
      'A Cobrar Transferencia': c.aCobrarEnTransferencia,
      'Notas': c.notes,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cuadres Semanales');
    XLSX.writeFile(wb, `cuadres_semanales_${filterYear}${filterMonth ? '_' + filterMonth : ''}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Cuadre Semanal</h2>
          <p className="text-sm text-gray-500">Control financiero semanal del negocio</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingClosing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo cuadre
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Año</label>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mes</label>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                <option key={i} value={(i + 1).toString()}>{m}</option>
              ))}
            </select>
          </div>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Efectivo Real</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transferencias</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ganancia</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diferencia</th>
                {isAdmin && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClosings.map(closing => (
                <tr key={closing.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-800">
                          {new Date(closing.weekStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-gray-500">
                          al {new Date(closing.weekEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">{formatCurrency(closing.efectivoReal)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(closing.transferenciasTotal)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${closing.gananciaSemana >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(closing.gananciaSemana)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${closing.diferenciaSemana >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(closing.diferenciaSemana)}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewClosing(closing)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Ver detalle">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => exportPDF(closing)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Exportar PDF">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingClosing(closing); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(closing.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filteredClosings.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                    No hay cuadres semanales registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <WeeklyClosingForm
          closing={editingClosing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingClosing(null); }}
        />
      )}

      {/* View Modal */}
      {viewClosing && (
        <WeeklyClosingDetail
          closing={viewClosing}
          onClose={() => setViewClosing(null)}
          onExportPDF={() => exportPDF(viewClosing)}
        />
      )}
    </div>
  );
}

function WeeklyClosingForm({ closing, onSave, onClose }: { closing: WeeklyClosing | null; onSave: (c: WeeklyClosing) => void; onClose: () => void }) {
  // Calcular fechas por defecto (semana actual)
  const getDefaultDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      weekStart: monday.toISOString().split('T')[0],
      weekEnd: sunday.toISOString().split('T')[0],
    };
  };

  const defaults = getDefaultDates();

  const [form, setForm] = useState({
    weekStart: closing?.weekStart || defaults.weekStart,
    weekEnd: closing?.weekEnd || defaults.weekEnd,
    efectivoReal: closing?.efectivoReal || 0,
    transferenciasTotal: closing?.transferenciasTotal || 0,
    transferenciasEmelyh: closing?.transferenciasEmelyh || 0,
    transferenciasGaibe: closing?.transferenciasGaibe || 0,
    aPagarEfectivoProveedores: closing?.aPagarEfectivoProveedores || 0,
    aPagarTransferenciasProveedores: closing?.aPagarTransferenciasProveedores || 0,
    aCobrarDineroEfectivo: closing?.aCobrarDineroEfectivo || 0,
    proveedorEfectivo: closing?.proveedorEfectivo || 0,
    notes: closing?.notes || '',
  });

  // Cálculos automáticos
  const calculations = useMemo(() => {
    const diferenciaSemana = form.efectivoReal - form.aCobrarDineroEfectivo;
    const resto = form.efectivoReal - form.proveedorEfectivo;
    
    // Ganancia = Efectivo Real - A Pagar Efectivo Proveedores - A Cobrar Dinero Efectivo
    const gananciaSemana = form.efectivoReal - form.aPagarEfectivoProveedores - form.aCobrarDineroEfectivo;
    
    const restoMasGanancias = resto + gananciaSemana;
    
    // Total Efectivo Entre Dos = Resto + Ganancia + Transferencias
    const totalEfectivoEntreDos = resto + gananciaSemana + form.transferenciasTotal;
    
    // A Cobrar en Transferencia = Transferencias Total - A Pagar Transferencias Proveedores
    const aCobrarEnTransferencia = form.transferenciasTotal - form.aPagarTransferenciasProveedores;

    return {
      diferenciaSemana,
      gananciaSemana,
      resto,
      restoMasGanancias,
      totalEfectivoEntreDos,
      aCobrarEnTransferencia,
    };
  }, [form]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const weeklyClosing: WeeklyClosing = {
      id: closing?.id || uuidv4(),
      weekStart: form.weekStart,
      weekEnd: form.weekEnd,
      efectivoReal: form.efectivoReal,
      transferenciasTotal: form.transferenciasTotal,
      transferenciasEmelyh: form.transferenciasEmelyh,
      transferenciasGaibe: form.transferenciasGaibe,
      aPagarEfectivoProveedores: form.aPagarEfectivoProveedores,
      aPagarTransferenciasProveedores: form.aPagarTransferenciasProveedores,
      aCobrarDineroEfectivo: form.aCobrarDineroEfectivo,
      proveedorEfectivo: form.proveedorEfectivo,
      diferenciaSemana: calculations.diferenciaSemana,
      gananciaSemana: calculations.gananciaSemana,
      resto: calculations.resto,
      restoMasGanancias: calculations.restoMasGanancias,
      totalEfectivoEntreDos: calculations.totalEfectivoEntreDos,
      aCobrarEnTransferencia: calculations.aCobrarEnTransferencia,
      notes: form.notes,
      createdAt: closing?.createdAt || new Date().toISOString(),
    };

    onSave(weeklyClosing);
  };

  const formatCurrency = (n: number) => `$${n.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              {closing ? 'Editar' : 'Nuevo'} Cuadre Semanal
            </h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Período */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
              <input
                type="date"
                value={form.weekStart}
                onChange={e => setForm({ ...form, weekStart: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
              <input
                type="date"
                value={form.weekEnd}
                onChange={e => setForm({ ...form, weekEnd: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Entradas de efectivo */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              Entradas de dinero
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Efectivo Real</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.efectivoReal}
                  onChange={e => setForm({ ...form, efectivoReal: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Transferencias Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.transferenciasTotal}
                  onChange={e => setForm({ ...form, transferenciasTotal: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Transferencias Emelyh</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.transferenciasEmelyh}
                  onChange={e => setForm({ ...form, transferenciasEmelyh: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Transferencias Gaibe</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.transferenciasGaibe}
                  onChange={e => setForm({ ...form, transferenciasGaibe: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Pagos a proveedores */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              Pagos a proveedores
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">A Pagar Efectivo Proveedores</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.aPagarEfectivoProveedores}
                  onChange={e => setForm({ ...form, aPagarEfectivoProveedores: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">A Pagar Transferencias Proveedores</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.aPagarTransferenciasProveedores}
                  onChange={e => setForm({ ...form, aPagarTransferenciasProveedores: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">A Cobrar Dinero Efectivo</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.aCobrarDineroEfectivo}
                  onChange={e => setForm({ ...form, aCobrarDineroEfectivo: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor Efectivo</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.proveedorEfectivo}
                  onChange={e => setForm({ ...form, proveedorEfectivo: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Cálculos automáticos */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              Cálculos automáticos
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Diferencia Semana</p>
                <p className={`text-lg font-bold ${calculations.diferenciaSemana >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(calculations.diferenciaSemana)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Ganancia Semana</p>
                <p className={`text-lg font-bold ${calculations.gananciaSemana >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(calculations.gananciaSemana)}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Resto</p>
                <p className="text-lg font-bold text-gray-800">{formatCurrency(calculations.resto)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Resto + Ganancias</p>
                <p className="text-lg font-bold text-gray-800">{formatCurrency(calculations.restoMasGanancias)}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600">Total Efectivo Entre Dos</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(calculations.totalEfectivoEntreDos)}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600">A Cobrar en Transferencia</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(calculations.aCobrarEnTransferencia)}</p>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Observaciones del cuadre..."
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 text-sm">
              Cancelar
            </button>
            <button type="submit" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-sm">
              <Save className="w-4 h-4" />
              {closing ? 'Guardar cambios' : 'Crear cuadre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WeeklyClosingDetail({ closing, onClose, onExportPDF }: { closing: WeeklyClosing; onClose: () => void; onExportPDF: () => void }) {
  const formatCurrency = (n: number) => `$${n.toLocaleString('es-CU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Detalle del Cuadre Semanal</h3>
            <p className="text-sm text-gray-500">
              {new Date(closing.weekStart).toLocaleDateString('es-ES')} - {new Date(closing.weekEnd).toLocaleDateString('es-ES')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Entradas */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Entradas de dinero</h4>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Efectivo Real</span>
                <span className="text-sm font-medium text-gray-800">{formatCurrency(closing.efectivoReal)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Transferencias Total</span>
                <span className="text-sm font-medium text-gray-800">{formatCurrency(closing.transferenciasTotal)}</span>
              </div>
              <div className="flex justify-between py-2 pl-4 border-b border-gray-100">
                <span className="text-xs text-gray-500">Emelyh</span>
                <span className="text-xs text-gray-600">{formatCurrency(closing.transferenciasEmelyh)}</span>
              </div>
              <div className="flex justify-between py-2 pl-4 border-b border-gray-100">
                <span className="text-xs text-gray-500">Gaibe</span>
                <span className="text-xs text-gray-600">{formatCurrency(closing.transferenciasGaibe)}</span>
              </div>
            </div>
          </div>

          {/* Pagos */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Pagos a proveedores</h4>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">A Pagar Efectivo Proveedores</span>
                <span className="text-sm font-medium text-gray-800">{formatCurrency(closing.aPagarEfectivoProveedores)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">A Pagar Transferencias Proveedores</span>
                <span className="text-sm font-medium text-gray-800">{formatCurrency(closing.aPagarTransferenciasProveedores)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">A Cobrar Dinero Efectivo</span>
                <span className="text-sm font-medium text-gray-800">{formatCurrency(closing.aCobrarDineroEfectivo)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Proveedor Efectivo</span>
                <span className="text-sm font-medium text-gray-800">{formatCurrency(closing.proveedorEfectivo)}</span>
              </div>
            </div>
          </div>

          {/* Resultados */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Resultados</h4>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Diferencia Semana</span>
                <span className={`text-sm font-bold ${closing.diferenciaSemana >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(closing.diferenciaSemana)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Ganancia Semana</span>
                <span className={`text-sm font-bold ${closing.gananciaSemana >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(closing.gananciaSemana)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Resto</span>
                <span className="text-sm font-medium text-gray-800">{formatCurrency(closing.resto)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Resto + Ganancias</span>
                <span className="text-sm font-medium text-gray-800">{formatCurrency(closing.restoMasGanancias)}</span>
              </div>
              <div className="flex justify-between py-2 bg-blue-50 px-3 rounded-lg">
                <span className="text-sm font-medium text-blue-700">Total Efectivo Entre Dos</span>
                <span className="text-sm font-bold text-blue-700">{formatCurrency(closing.totalEfectivoEntreDos)}</span>
              </div>
              <div className="flex justify-between py-2 bg-blue-50 px-3 rounded-lg">
                <span className="text-sm font-medium text-blue-700">A Cobrar en Transferencia</span>
                <span className="text-sm font-bold text-blue-700">{formatCurrency(closing.aCobrarEnTransferencia)}</span>
              </div>
            </div>
          </div>

          {/* Notas */}
          {closing.notes && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Notas</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{closing.notes}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100">
          <button
            onClick={onExportPDF}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 text-sm"
          >
            <FileText className="w-4 h-4" />
            Exportar a PDF
          </button>
        </div>
      </div>
    </div>
  );
}
