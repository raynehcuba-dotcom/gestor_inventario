import React, { useState, useMemo } from 'react';
import { Provider, Payable } from '../types';
import { getProviders, saveProvider, deleteProvider, getPayablesByProvider, savePayable, getProviderBalance } from '../store';
import { Plus, Search, Edit2, Trash2, X, Phone, Mail, MapPin, ArrowLeft, ArrowDownCircle, ArrowUpCircle, DollarSign, FileText, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>(getProviders());
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const filtered = providers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.contact.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este proveedor?')) {
      await deleteProvider(id);
      setProviders(getProviders());
    }
  };

  const handleSave = async (provider: Provider) => {
    await saveProvider(provider);
    setProviders(getProviders());
    setShowModal(false);
    setEditing(null);
  };

  // Provider detail view with submayor
  if (selectedProvider) {
    return (
      <ProviderDetail 
        provider={selectedProvider} 
        onBack={() => setSelectedProvider(null)} 
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar proveedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo proveedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(provider => {
          const balance = getProviderBalance(provider.id);
          return (
            <div 
              key={provider.id} 
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedProvider(provider)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">{provider.name.charAt(0)}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setEditing(provider); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(provider.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">{provider.name}</h3>
              <div className="space-y-1.5">
                {provider.contact && (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-4 h-4 text-gray-400">👤</span>
                    {provider.contact}
                  </p>
                )}
                {provider.phone && (
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {provider.phone}
                  </p>
                )}
              </div>
              <div className={`mt-3 pt-3 border-t border-gray-100 flex items-center justify-between`}>
                <span className="text-xs text-gray-500">Saldo pendiente</span>
                <span className={`text-sm font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  ${balance.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            No se encontraron proveedores
          </div>
        )}
      </div>

      {showModal && (
        <ProviderModal
          provider={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// Provider Detail with Submayor
function ProviderDetail({ provider, onBack }: { provider: Provider; onBack: () => void }) {
  const [payables, setPayables] = useState<Payable[]>(getPayablesByProvider(provider.id));
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const balance = useMemo(() => getProviderBalance(provider.id), [payables]);

  const totalDebits = payables
    .filter(p => p.type === 'sale' || p.type === 'purchase')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalCredits = payables
    .filter(p => p.type === 'payment')
    .reduce((sum, p) => sum + p.amount, 0);

  const handlePayment = async (amount: number, description: string) => {
    const payable: Payable = {
      id: uuidv4(),
      providerId: provider.id,
      type: 'payment',
      amount,
      description,
      date: new Date().toISOString(),
    };
    await savePayable(payable);
    setPayables(getPayablesByProvider(provider.id));
    setShowPaymentModal(false);
  };

  const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800">{provider.name}</h2>
          <p className="text-sm text-gray-500">Submayor de obligaciones</p>
        </div>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
        >
          <CreditCard className="w-4 h-4" />
          Registrar pago
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-gray-500">Total débitos (obligaciones)</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebits)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm text-gray-500">Total créditos (pagos)</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCredits)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-500">Saldo actual</span>
          </div>
          <p className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Provider info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Información del proveedor</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Contacto</p>
            <p className="text-sm font-medium text-gray-800">{provider.contact || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Teléfono</p>
            <p className="text-sm font-medium text-gray-800">{provider.phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-800">{provider.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Dirección</p>
            <p className="text-sm font-medium text-gray-800">{provider.address || '—'}</p>
          </div>
        </div>
      </div>

      {/* Submayor (movements) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Movimientos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Débito</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédito</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(() => {
                // Show in chronological order for running balance
                const chronological = [...payables].sort((a, b) => 
                  new Date(a.date).getTime() - new Date(b.date).getTime()
                );
                let runningBalance = 0;
                return chronological.map(payable => {
                  if (payable.type === 'sale' || payable.type === 'purchase') {
                    runningBalance += payable.amount;
                  } else {
                    runningBalance -= payable.amount;
                  }
                  return (
                    <tr key={payable.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(payable.date).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          payable.type === 'sale' ? 'bg-blue-50 text-blue-700' :
                          payable.type === 'purchase' ? 'bg-purple-50 text-purple-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {payable.type === 'sale' && <FileText className="w-3 h-3" />}
                          {payable.type === 'purchase' && <FileText className="w-3 h-3" />}
                          {payable.type === 'payment' && <CreditCard className="w-3 h-3" />}
                          {payable.type === 'sale' ? 'Venta' : payable.type === 'purchase' ? 'Compra' : 'Pago'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{payable.description}</td>
                      <td className="px-4 py-3 text-right">
                        {(payable.type === 'sale' || payable.type === 'purchase') ? (
                          <span className="text-red-600 font-medium">{formatCurrency(payable.amount)}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {payable.type === 'payment' ? (
                          <span className="text-emerald-600 font-medium">{formatCurrency(payable.amount)}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${runningBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatCurrency(runningBalance)}
                        </span>
                      </td>
                    </tr>
                  );
                });
              })()}
              {payables.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No hay movimientos registrados
                  </td>
                </tr>
              )}
            </tbody>
            {payables.length > 0 && (
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">TOTALES:</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{formatCurrency(totalDebits)}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">{formatCurrency(totalCredits)}</td>
                  <td className={`px-4 py-3 text-right text-sm font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(balance)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          providerName={provider.name}
          currentBalance={balance}
          onPayment={handlePayment}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}

function PaymentModal({ providerName, currentBalance, onPayment, onClose }: {
  providerName: string;
  currentBalance: number;
  onPayment: (amount: number, description: string) => Promise<void>;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(currentBalance > 0 ? currentBalance.toString() : '');
  const [description, setDescription] = useState('Pago de obligaciones pendientes');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (numAmount <= 0) return;
    await onPayment(numAmount, description);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Registrar pago a {providerName}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-sm text-amber-800">
              Saldo actual: <span className="font-bold">${currentBalance.toFixed(2)}</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto a pagar</label>
            <input 
              type="number" 
              step="0.01" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
              required 
              min="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <input 
              type="text" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 text-sm">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 text-sm">
              Registrar pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProviderModal({ provider, onSave, onClose }: { provider: Provider | null; onSave: (p: Provider) => void; onClose: () => void }) {
  const [form, setForm] = useState<Partial<Provider>>(provider || {
    name: '', contact: '', phone: '', email: '', address: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: provider?.id || uuidv4(),
      name: form.name || '',
      contact: form.contact || '',
      phone: form.phone || '',
      email: form.email || '',
      address: form.address || '',
      createdAt: provider?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">{provider ? 'Editar proveedor' : 'Nuevo proveedor'}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Persona de contacto</label>
            <input type="text" value={form.contact || ''} onChange={e => setForm({ ...form, contact: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="text" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input type="text" value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 text-sm">Cancelar</button>
            <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-sm">{provider ? 'Guardar' : 'Crear'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
