import React, { useState, useMemo, useRef } from 'react';
import { Product, Sale, SaleItem } from '../types';
import { getProducts, getSales, saveSale, getNextInvoiceNumber, getConfig } from '../store';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Minus, Trash2, Printer, ShoppingCart, X, Receipt } from 'lucide-react';

export default function Sales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>(getSales());
  const [products, setProducts] = useState<Product[]>(getProducts());
  const [showNewSale, setShowNewSale] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const filteredSales = useMemo(() => {
    let result = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (selectedDate) {
      result = result.filter(s => s.date.startsWith(selectedDate));
    }
    return result;
  }, [sales, selectedDate]);

  const handleSaleComplete = async (sale: Sale) => {
    await saveSale(sale);
    setSales(getSales());
    setProducts(getProducts());
    setShowNewSale(false);
    setReceiptSale(sale);
  };

  const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="space-y-4">
      {/* Quick actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowNewSale(true)}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
        >
          <ShoppingCart className="w-4 h-4" />
          Nueva venta
        </button>
      </div>

      {/* Sales list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Factura</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Productos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.map(sale => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-blue-600">#{sale.invoiceNumber.toString().padStart(5, '0')}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(sale.date).toLocaleString('es-ES')}</td>
                  <td className="px-4 py-3 text-gray-600">{sale.items.length} producto(s)</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{formatCurrency(sale.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setReceiptSale(sale)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Ver comprobante">
                      <Receipt className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No hay ventas registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sale Modal */}
      {showNewSale && (
        <NewSaleModal
          products={products}
          sellerId={user?.id || ''}
          onComplete={handleSaleComplete}
          onClose={() => setShowNewSale(false)}
        />
      )}

      {/* Receipt Modal */}
      {receiptSale && (
        <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />
      )}
    </div>
  );
}

function NewSaleModal({ products, sellerId, onComplete, onClose }: { products: Product[]; sellerId: string; onComplete: (sale: Sale) => Promise<void>; onClose: () => void }) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [notes, setNotes] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const availableProducts = products.filter(p => 
    p.stock > 0 && (p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()))
  );

  const addItem = (product: Product) => {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return;
      setItems(items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice } : i));
    } else {
      setItems([...items, { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.salePrice, total: product.salePrice }]);
    }
    setSearch('');
    searchRef.current?.focus();
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    setItems(items.map(i => {
      if (i.productId === productId) {
        const newQty = i.quantity + delta;
        if (newQty <= 0) return i;
        if (product && newQty > product.stock) return i;
        return { ...i, quantity: newQty, total: newQty * i.unitPrice };
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.productId !== productId));
  };

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);

  const handleConfirm = () => {
    if (items.length === 0) return;
    const sale: Sale = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      invoiceNumber: getNextInvoiceNumber(),
      date: new Date().toISOString(),
      sellerId,
      items,
      subtotal,
      total: subtotal,
      paymentMethod,
      notes,
    };
    onComplete(sale);
  };

  const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Nueva Venta</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Product search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar producto para agregar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            {search && availableProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                {availableProducts.slice(0, 8).map(p => (
                  <button
                    key={p.id}
                    onClick={() => addItem(p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left text-sm"
                  >
                    <span className="font-medium text-gray-800">{p.name}</span>
                    <span className="text-gray-500">{formatCurrency(p.salePrice)} · Stock: {p.stock}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.productId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.unitPrice)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-100">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-100">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="w-20 text-right text-sm font-semibold">{formatCurrency(item.total)}</span>
                  <button onClick={() => removeItem(item.productId)} className="p-1.5 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Busque y agregue productos</p>
            </div>
          )}

          {/* Payment and notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Tarjeta</option>
                <option>Mixto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Opcional" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">Total ({items.length} productos)</span>
            <span className="text-2xl font-bold text-gray-800">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-white text-sm">
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={items.length === 0}
              className="flex-1 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const config = getConfig();
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Comprobante #${sale.invoiceNumber}</title>
      <style>
        body { font-family: monospace; padding: 20px; font-size: 12px; }
        .header { text-align: center; margin-bottom: 15px; }
        .header h2 { margin: 0; font-size: 16px; }
        .divider { border-top: 1px dashed #000; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; }
        .right { text-align: right; }
        .total { font-size: 14px; font-weight: bold; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Comprobante</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div ref={receiptRef} className="font-mono text-sm">
            <div className="header text-center mb-4">
              <h2 className="text-lg font-bold">{config.name}</h2>
              <p className="text-xs text-gray-500">{config.address}</p>
              <p className="text-xs text-gray-500">Tel: {config.phone}</p>
              <p className="text-xs text-gray-500">NIF: {config.nif}</p>
            </div>
            <div className="border-t border-dashed border-gray-300 my-3" />
            <div className="flex justify-between text-xs mb-3">
              <span>Factura: #{sale.invoiceNumber.toString().padStart(5, '0')}</span>
              <span>{new Date(sale.date).toLocaleString('es-ES')}</span>
            </div>
            <div className="border-t border-dashed border-gray-300 my-3" />
            <table className="w-full">
              <thead>
                <tr className="text-xs">
                  <td className="pb-1 font-medium">Producto</td>
                  <td className="pb-1 text-center font-medium">Cant</td>
                  <td className="pb-1 text-right font-medium">Precio</td>
                  <td className="pb-1 text-right font-medium">Total</td>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, i) => (
                  <tr key={i} className="text-xs">
                    <td className="py-1">{item.productName}</td>
                    <td className="py-1 text-center">{item.quantity}</td>
                    <td className="py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-1 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-dashed border-gray-300 my-3" />
            <div className="flex justify-between text-xs">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            <div className="flex justify-between font-bold mt-1">
              <span>TOTAL:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            <div className="border-t border-dashed border-gray-300 my-3" />
            <p className="text-xs text-center text-gray-500">Pago: {sale.paymentMethod}</p>
            {sale.notes && <p className="text-xs text-center text-gray-500 mt-1">Nota: {sale.notes}</p>}
            <p className="text-xs text-center text-gray-400 mt-4">¡Gracias por su compra!</p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir comprobante
          </button>
        </div>
      </div>
    </div>
  );
}
