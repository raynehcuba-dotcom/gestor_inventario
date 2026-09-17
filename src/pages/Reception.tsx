import React, { useState } from 'react';
import { Product, Provider, Purchase, PurchaseItem } from '../types';
import { getProducts, saveProduct, getProviders, savePurchase, getPurchases } from '../store';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Trash2, X, FileText, Package, Calendar, DollarSign } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function Reception() {
  const { isAdmin } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>(getPurchases());
  const [showNewReception, setShowNewReception] = useState(false);

  const handleReceptionComplete = async (purchase: Purchase) => {
    await savePurchase(purchase);
    setPurchases(getPurchases());
    setShowNewReception(false);
  };

  const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Recepción de Productos</h2>
          <p className="text-sm text-gray-500">Gestione las facturas de entrada de mercancía</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowNewReception(true)}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            Nueva factura de entrada
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total facturas</p>
          <p className="text-2xl font-bold text-gray-800">{purchases.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Inversión total</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(purchases.reduce((sum, p) => sum + p.totalCost, 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Última recepción</p>
          <p className="text-2xl font-bold text-gray-800">
            {purchases.length > 0 ? new Date(purchases[0].date).toLocaleDateString('es-ES') : '—'}
          </p>
        </div>
      </div>

      {/* Purchases list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Productos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchases.map(purchase => {
                const provider = getProviders().find(p => p.id === purchase.providerId);
                return (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-blue-600">
                      #{purchase.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(purchase.date).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{provider?.name || 'Sin proveedor'}</td>
                    <td className="px-4 py-3 text-gray-600">{purchase.items.length} producto(s)</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{formatCurrency(purchase.totalCost)}</td>
                  </tr>
                );
              })}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No hay facturas de entrada registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Reception Modal */}
      {showNewReception && (
        <NewReceptionModal
          onComplete={handleReceptionComplete}
          onClose={() => setShowNewReception(false)}
        />
      )}
    </div>
  );
}

interface ReceptionLine {
  id: string;
  productId: string | null;
  productName: string;
  productCode: string;
  category: string;
  quantity: number;
  costPrice: number;
  isNew: boolean;
}

function NewReceptionModal({ onComplete, onClose }: { onComplete: (purchase: Purchase) => Promise<void>; onClose: () => void }) {
  const [lines, setLines] = useState<ReceptionLine[]>([]);
  const [providerId, setProviderId] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  
  const providers = getProviders();
  const products = getProducts();

  const addLine = () => {
    const newLine: ReceptionLine = {
      id: uuidv4(),
      productId: null,
      productName: '',
      productCode: '',
      category: '',
      quantity: 1,
      costPrice: 0,
      isNew: true,
    };
    setLines([...lines, newLine]);
    setActiveLineId(newLine.id);
  };

  const updateLine = (lineId: string, updates: Partial<ReceptionLine>) => {
    setLines(lines.map(l => l.id === lineId ? { ...l, ...updates } : l));
  };

  const removeLine = (lineId: string) => {
    setLines(lines.filter(l => l.id !== lineId));
  };

  const selectExistingProduct = (lineId: string, product: Product) => {
    updateLine(lineId, {
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      category: product.category,
      costPrice: product.costPrice,
      isNew: false,
    });
    setSearchTerm('');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCost = lines.reduce((sum, l) => sum + (l.quantity * l.costPrice), 0);

  const handleSubmit = async () => {
    if (lines.length === 0) return;

    const purchase: Purchase = {
      id: uuidv4(),
      date: new Date().toISOString(),
      providerId,
      items: [],
      totalCost,
      notes,
    };

    // Create new products if needed
    for (const line of lines) {
      if (line.isNew && line.productName) {
        const newProduct: Product = {
          id: uuidv4(),
          code: line.productCode || `P${Date.now()}`,
          name: line.productName,
          category: line.category || 'General',
          costPrice: line.costPrice,
          salePrice: line.costPrice * 1.5, // Default markup
          stock: line.quantity,
          minStock: 5,
          providerId,
          createdAt: new Date().toISOString(),
        };
        await saveProduct(newProduct);
        purchase.items.push({
          productId: newProduct.id,
          quantity: line.quantity,
          costPrice: line.costPrice,
        });
      } else if (line.productId) {
        purchase.items.push({
          productId: line.productId,
          quantity: line.quantity,
          costPrice: line.costPrice,
        });
      }
    }

    await onComplete(purchase);
  };

  const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Nueva Factura de Entrada</h3>
            <p className="text-sm text-gray-500">Reciba productos de un proveedor</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Provider and notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select 
                value={providerId} 
                onChange={e => setProviderId(e.target.value)} 
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar proveedor</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input 
                type="text" 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Número de factura, referencia, etc."
              />
            </div>
          </div>

          {/* Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800">Productos a recibir</h4>
              <button 
                onClick={addLine} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100"
              >
                <Plus className="w-4 h-4" />
                Agregar línea
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Agregue productos para recibir</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div key={line.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Línea {idx + 1}</span>
                      <button onClick={() => removeLine(line.id)} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Product selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Producto</label>
                        {line.isNew ? (
                          <input
                            type="text"
                            value={line.productName}
                            onChange={e => updateLine(line.id, { productName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nombre del nuevo producto"
                          />
                        ) : (
                          <div className="relative">
                            <input
                              type="text"
                              value={activeLineId === line.id ? searchTerm : line.productName}
                              onChange={e => {
                                setActiveLineId(line.id);
                                setSearchTerm(e.target.value);
                              }}
                              onFocus={() => setActiveLineId(line.id)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Buscar producto existente..."
                            />
                            {activeLineId === line.id && searchTerm && filteredProducts.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                                {filteredProducts.slice(0, 8).map(p => (
                                  <button
                                    key={p.id}
                                    onClick={() => selectExistingProduct(line.id, p)}
                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-left text-sm"
                                  >
                                    <div>
                                      <p className="font-medium text-gray-800">{p.name}</p>
                                      <p className="text-xs text-gray-500">{p.code} · {p.category}</p>
                                    </div>
                                    <span className="text-xs text-gray-500">Stock: {p.stock}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateLine(line.id, { isNew: !line.isNew, productId: null, productName: '', productCode: '', category: '', costPrice: 0 })}
                          className={`px-3 py-2 text-xs font-medium rounded-lg border ${line.isNew ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                        >
                          {line.isNew ? '✓ Nuevo' : 'Crear nuevo'}
                        </button>
                        {!line.isNew && (
                          <button
                            onClick={() => updateLine(line.id, { isNew: true, productId: null })}
                            className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
                            Usar existente
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Código</label>
                        <input
                          type="text"
                          value={line.productCode}
                          onChange={e => updateLine(line.id, { productCode: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="P001"
                          disabled={!line.isNew}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                        <input
                          type="text"
                          value={line.category}
                          onChange={e => updateLine(line.id, { category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Alimentos"
                          disabled={!line.isNew}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Cantidad</label>
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={e => updateLine(line.id, { quantity: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Costo unit.</label>
                        <input
                          type="number"
                          step="0.01"
                          value={line.costPrice}
                          onChange={e => updateLine(line.id, { costPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="text-right text-sm">
                      <span className="text-gray-500">Subtotal: </span>
                      <span className="font-semibold text-gray-800">{formatCurrency(line.quantity * line.costPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">Total ({lines.length} líneas)</span>
            <span className="text-2xl font-bold text-gray-800">{formatCurrency(totalCost)}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-white text-sm">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={lines.length === 0 || !providerId}
              className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar recepción
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
