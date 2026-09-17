import React, { useState } from 'react';
import { getConfig, saveConfig, getUsers, saveUser } from '../store';
import { BusinessConfig, User } from '../types';
import { Save, Users, Building2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function Settings() {
  const [config, setConfig] = useState<BusinessConfig>(getConfig());
  const [users, setUsers] = useState<User[]>(getUsers());
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'users'>('business');

  const handleSaveConfig = () => {
    saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddUser = () => {
    const newUser: User = {
      id: uuidv4(),
      username: '',
      passwordHash: '',
      role: 'vendedor',
      fullName: '',
    };
    setUsers([...users, newUser]);
  };

  const handleSaveUsers = () => {
    users.forEach(u => {
      if (u.username) saveUser(u);
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('business')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'business' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Building2 className="w-4 h-4" />
          Datos del negocio
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users className="w-4 h-4" />
          Usuarios
        </button>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700 font-medium">
          ✓ Cambios guardados correctamente
        </div>
      )}

      {activeTab === 'business' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Información del negocio</h3>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio</label>
              <input type="text" value={config.name} onChange={e => setConfig({ ...config, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input type="text" value={config.address} onChange={e => setConfig({ ...config, address: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={config.phone} onChange={e => setConfig({ ...config, phone: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIF / Registro</label>
                <input type="text" value={config.nif} onChange={e => setConfig({ ...config, nif: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <button
              onClick={handleSaveConfig}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-sm"
            >
              <Save className="w-4 h-4" />
              Guardar configuración
            </button>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Gestión de usuarios</h3>
            <button onClick={handleAddUser} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              + Nuevo usuario
            </button>
          </div>
          <div className="space-y-4">
            {users.map((user, idx) => (
              <div key={user.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Nombre completo</label>
                    <input type="text" value={user.fullName} onChange={e => {
                      const updated = [...users];
                      updated[idx] = { ...updated[idx], fullName: e.target.value };
                      setUsers(updated);
                    }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Usuario</label>
                    <input type="text" value={user.username} onChange={e => {
                      const updated = [...users];
                      updated[idx] = { ...updated[idx], username: e.target.value };
                      setUsers(updated);
                    }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Contraseña (dejar vacío para no cambiar)</label>
                    <input type="password" placeholder="••••••••" onChange={e => {
                      if (e.target.value) {
                        const updated = [...users];
                        updated[idx] = { ...updated[idx], passwordHash: e.target.value };
                        setUsers(updated);
                      }
                    }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Rol</label>
                    <select value={user.role} onChange={e => {
                      const updated = [...users];
                      updated[idx] = { ...updated[idx], role: e.target.value as 'admin' | 'vendedor' };
                      setUsers(updated);
                    }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="admin">Administrador</option>
                      <option value="vendedor">Vendedor</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleSaveUsers}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 text-sm mt-6"
          >
            <Save className="w-4 h-4" />
            Guardar usuarios
          </button>
        </div>
      )}
    </div>
  );
}
