import React, { FormEvent, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getWeeklyClosingAudit,
  getWeeklyClosingMetrics,
  getWeeklyClosings,
  saveWeeklyClosing,
} from '../store';
import { WeeklyClosing, WeeklyClosingAuditEntry, WeeklyClosingMetrics } from '../types';
import {
  Calculator,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Save,
  X,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const currency = new Intl.NumberFormat('es-CU', {
  style: 'currency',
  currency: 'CUP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const summaryFields: { key: keyof WeeklyClosingMetrics; label: string }[] = [
  { key: 'salesCash', label: 'Ventas en efectivo' },
  { key: 'salesTransfers', label: 'Ventas por transferencia' },
  { key: 'providerCosts', label: 'Costo de productos vendidos / pendiente a proveedores' },
  { key: 'weekProfit', label: 'Ganancia Semana' },
  { key: 'emelyhProfit', label: 'Parte de Emelyh (50 %)' },
  { key: 'gaibelisProfit', label: 'Parte de Gaibelis (50 %)' },
];

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-CU');
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('es-CU');
}

function getSnapshotValues(snapshot: Partial<WeeklyClosing>) {
  return [
    ['Período', snapshot.startDate && snapshot.endDate
      ? `${formatDate(snapshot.startDate)} – ${formatDate(snapshot.endDate)}`
      : ''],
    ...summaryFields.map(({ key, label }) => [
      label,
      snapshot[key] == null ? '' : currency.format(snapshot[key]),
    ]),
  ];
}

export default function WeeklyClosingPage() {
  const { user, isAdmin } = useAuth();
  const [closings, setClosings] = useState<WeeklyClosing[]>(() => getWeeklyClosings());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WeeklyClosing | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [audit, setAudit] = useState<WeeklyClosingAuditEntry[] | null>(null);

  const filteredClosings = useMemo(
    () => closings.filter(closing =>
      (!dateFrom || closing.endDate >= dateFrom) &&
      (!dateTo || closing.startDate <= dateTo)
    ),
    [closings, dateFrom, dateTo]
  );

  const metrics = useMemo(
    () => startDate && endDate >= startDate
      ? getWeeklyClosingMetrics(startDate, endDate)
      : null,
    [startDate, endDate]
  );

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        El acceso al cuadre semanal está limitado al personal administrador.
      </div>
    );
  }

  const openNewForm = () => {
    setEditing(null);
    setStartDate('');
    setEndDate('');
    setError('');
    setNotice('');
    setFormOpen(true);
  };

  const openEditForm = (closing: WeeklyClosing) => {
    setEditing(closing);
    setStartDate(closing.startDate);
    setEndDate(closing.endDate);
    setError('');
    setNotice('');
    setFormOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!user) {
      setError('No se pudo identificar al usuario. Vuelve a iniciar sesión.');
      return;
    }
    if (!metrics) {
      setError('Selecciona un rango de fechas válido para calcular el cuadre.');
      return;
    }

    try {
      await saveWeeklyClosing(editing?.id || null, startDate, endDate, user.id);
      setClosings(getWeeklyClosings());
      setFormOpen(false);
      setEditing(null);
      setNotice('El cuadre semanal se calculó y guardó correctamente.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el cuadre semanal.');
    }
  };

  const exportRows = filteredClosings.map(closing => [
    closing.startDate,
    closing.endDate,
    ...summaryFields.map(({ key }) => closing[key]),
    closing.creatorName,
    closing.updaterName,
    closing.updatedAt,
  ]);

  const exportHeaders = [
    'Fecha inicio',
    'Fecha fin',
    ...summaryFields.map(({ label }) => label),
    'Creado por',
    'Última modificación por',
    'Última modificación',
  ];

  const exportPdf = () => {
    const document = new jsPDF({ orientation: 'landscape' });
    document.setFontSize(16);
    document.text('Histórico de Cuadres Semanales', 14, 16);
    document.setFontSize(9);
    document.text(`Moneda: CUP | Período filtrado: ${dateFrom || 'Inicio'} a ${dateTo || 'Hoy'}`, 14, 23);
    autoTable(document, {
      startY: 29,
      head: [exportHeaders],
      body: exportRows.map(row => [
        row[0], row[1],
        ...row.slice(2, 8).map(value => currency.format(Number(value))),
        ...row.slice(8),
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    document.save(`cuadres_semanales_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([exportHeaders, ...exportRows]);
    for (let rowIndex = 1; rowIndex <= exportRows.length; rowIndex++) {
      for (let columnIndex = 2; columnIndex < 8; columnIndex++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
        if (cell) cell.z = '"CUP" #,##0.00';
      }
    }
    worksheet['!cols'] = exportHeaders.map(() => ({ wch: 24 }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cuadres semanales');
    XLSX.writeFile(workbook, `cuadres_semanales_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const openAudit = (closingId: string) => {
    setAudit(getWeeklyClosingAudit(closingId));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cuadre Semanal</h2>
          <p className="mt-1 text-sm text-gray-500">Resumen automático de ventas y ganancia en pesos cubanos (CUP).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportPdf}
            disabled={!filteredClosings.length}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-4 w-4" /> Exportar PDF
          </button>
          <button
            onClick={exportExcel}
            disabled={!filteredClosings.length}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
          </button>
          <button
            onClick={openNewForm}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Nuevo cuadre
          </button>
        </div>
      </div>

      {notice && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>
      )}

      {formOpen && (
        <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{editing ? 'Actualizar cuadre semanal' : 'Nuevo cuadre semanal'}</h3>
              <p className="mt-1 text-xs text-gray-500">Selecciona el período. Los importes se obtienen automáticamente de las ventas registradas.</p>
            </div>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Cerrar formulario">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">
              Fecha de inicio
              <input
                type="date"
                required
                value={startDate}
                onChange={event => setStartDate(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="text-sm font-medium text-gray-700">
              Fecha de fin
              <input
                type="date"
                required
                min={startDate || undefined}
                value={endDate}
                onChange={event => setEndDate(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          {metrics ? (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                <Calculator className="h-4 w-4 shrink-0" />
                Importes recalculados para el período seleccionado con las ventas guardadas en el sistema.
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {summaryFields.map(({ key, label }) => (
                  <div key={key} className={`rounded-lg border p-3 ${
                    key === 'weekProfit' ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <p className="mt-1 font-semibold text-gray-900">{currency.format(metrics[key])}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Ganancia Semana = ventas en efectivo + ventas por transferencia − costo de los productos vendidos.
                La ganancia se reparte en partes iguales; cualquier centavo impar se asigna a Gaibelis para que las partes sumen exactamente el total.
              </p>
            </>
          ) : (
            <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              El resumen se calculará al seleccionar fechas de inicio y fin válidas.
            </p>
          )}

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={!metrics} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              <Save className="h-4 w-4" /> Guardar cuadre
            </button>
          </div>
        </form>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Filtrar histórico por fechas</h3>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-xs font-medium text-gray-500">Desde
            <input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800" />
          </label>
          <label className="text-xs font-medium text-gray-500">Hasta
            <input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="mt-1 block rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800" />
          </label>
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="w-fit rounded-lg px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">Limpiar filtros</button>
          <p className="text-sm text-gray-500 sm:ml-auto">{filteredClosings.length} cuadre(s)</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Calculator className="h-4 w-4" /> Histórico de cuadres
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px] text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {[
                  'Período', ...summaryFields.map(field => field.label), 'Registrado por',
                  'Modificado por', 'Acciones',
                ].map(label => <th key={label} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">{label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClosings.map(closing => (
                <tr key={closing.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-3 py-3 font-medium text-gray-800">{formatDate(closing.startDate)} – {formatDate(closing.endDate)}</td>
                  {summaryFields.map(({ key }) => (
                    <td key={key} className="whitespace-nowrap px-3 py-3 text-gray-700">{currency.format(closing[key])}</td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-3 text-gray-600">{closing.creatorName}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-gray-600" title={formatTimestamp(closing.updatedAt)}>{closing.updaterName}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditForm(closing)} title="Recalcular período" className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => openAudit(closing.id)} title="Ver historial de cambios" className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"><ClipboardList className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredClosings.length && (
                <tr><td colSpan={10} className="px-5 py-12 text-center text-gray-500">No hay cuadres semanales para el rango seleccionado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {audit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) setAudit(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="audit-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 id="audit-title" className="font-semibold text-gray-900">Historial de cambios</h3>
                <p className="text-xs text-gray-500">Registro de creación y modificaciones de este cuadre.</p>
              </div>
              <button onClick={() => setAudit(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" aria-label="Cerrar historial"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              {audit.map(entry => (
                <article key={entry.id} className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-800">
                    {entry.actorId === 'system:migration-v2' ? 'Datos migrados' : entry.action === 'created' ? 'Cuadre creado' : 'Cuadre modificado'}
                    <span className="font-normal text-gray-500"> · {entry.actorName} · {formatTimestamp(entry.createdAt)}</span>
                  </p>
                  {entry.beforeSnapshot && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-blue-700">Ver valores anteriores</summary>
                      <SnapshotList snapshot={entry.beforeSnapshot} />
                    </details>
                  )}
                  <details className="mt-3" open={entry.action === 'created'}>
                    <summary className="cursor-pointer text-sm font-medium text-blue-700">{entry.beforeSnapshot ? 'Ver valores guardados' : 'Valores iniciales'}</summary>
                    <SnapshotList snapshot={entry.afterSnapshot} />
                  </details>
                </article>
              ))}
              {!audit.length && <p className="py-8 text-center text-sm text-gray-500">No hay registros de auditoría.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SnapshotList({ snapshot }: { snapshot: Partial<WeeklyClosing> }) {
  return (
    <dl className="mt-2 grid gap-x-4 gap-y-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-2">
      {getSnapshotValues(snapshot).map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-gray-500">{label}</dt>
          <dd className="text-sm font-medium text-gray-800">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
