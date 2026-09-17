import React, { useState, useMemo } from 'react';
import { Product, Provider } from '../types';
import { getProducts, saveProduct, deleteProduct, getProviders } from '../store';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Edit2, Trash2, AlertTriangle, X, ArrowUpDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function Inventory() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>(getProducts());
  const providers = getProviders();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState<keyof Product>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const categories = useMemo(() => [...new Set(products.map(p => p.category))], [products]);

  const filtered = useMemo(() => {
    let result = products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [products, search, categoryFilter, sortField, sortDir]);

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este producto?')) {
      deleteProduct(id);
      setProducts(getProducts());
    }
  };

  const handleSave = (product: Product) => {
    saveProduct(product);
    setProducts(getProducts());
    setShowModal(false);
    setEditingProduct(null);
  };

  const getProviderName = (id: string) => providers.find(p => p.id === id)?.name || 'Sin proveedor';

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return 'out';
    if (product.stock <= product.minStock) return 'low';
    return 'ok';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingProduct(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo producto
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  { key: 'code', label: 'Código' },
                  { key: 'name', label: 'Producto' },
                  { key: 'category', label: 'Categoría' },
                  { key: 'costPrice', label: 'P. Costo' },
                  { key: 'salePrice', label: 'P. Venta' },
                  { key: 'stock', label: 'Stock' },
                ].map(col => (
                  <th key={col.key} className="px-4 py-3 text-left">
                    <button onClick={() => handleSort(col.key as keyof Product)} className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase hover:text-gray-700">
                      {col.label}
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                {isAdmin && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(product => {
                const status = getStockStatus(product);
                return (
                  <tr key={product.id} className={`${status === 'out' ? 'bg-red-50' : status === 'low' ? 'bg-amber-50' : ''} hover:bg-gray-50`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{product.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {product.name}
                      {status === 'out' && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">Agotado</span>}
                      {status === 'low' && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">Bajo</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.category}</td>
                    <td className="px-4 py-3 text-gray-600">${product.costPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">${product.salePrice.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${status === 'out' ? 'text-red-600' : status === 'low' ? 'text-amber-600' : 'text-gray-800'}`}>
                        {product.stock}
                      </span>
                      <span className="text-gray-400 text-xs ml-1">/ {product.minStock}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{getProviderName(product.providerId)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditingProduct(product); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(product.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-gray-400">No se encontraron productos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          providers={providers}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingProduct(null); }}
        />
      )}
    </div>
  );
}

function ProductModal({ product, providers, onSave, onClose }: { product: Product | null; providers: Provider[]; onSave: (p: Product) => void; onClose: () => void }) {
  const [form, setForm] = useState<Partial<Product>>(product || {
    code: '', name: '', category: '', costPrice: 0, salePrice: 0, stock: 0, minStock: 5, providerId: providers[0]?.id || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: product?.id || uuidv4(),
      code: form.code || '',
      name: form.name || '',
      category: form.category || '',
      costPrice: Number(form.costPrice) || 0,
      salePrice: Number(form.salePrice) || 0,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 5,
      providerId: form.providerId || '',
      createdAt: product?.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">{product ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input type="text" value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <input type="text" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input type="text" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio costo</label>
              <input type="number" step="0.01" value={form.costPrice || ''} onChange={e => setForm({ ...form, costPrice: parseFloat(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio venta</label>
              <input type="number" step="0.01" value={form.salePrice || ''} onChange={e => setForm({ ...form, salePrice: parseFloat(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock actual</label>
              <input type="number" value={form.stock || ''} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
              <input type="number" value={form.minStock || ''} onChange={e => setForm({ ...form, minStock: parseInt(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
            <select value={form.providerId || ''} onChange={e => setForm({ ...form, providerId: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar proveedor</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 text-sm">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-sm">
              {product ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
