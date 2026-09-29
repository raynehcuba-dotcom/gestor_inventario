import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import PanelCaja from './previews/PanelCaja';
import { initDatabase } from './database';

function AppPreview() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 20, color: 'red' }}>
        Error al inicializar la base de datos: {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ padding: 20 }}>
        Inicializando base de datos...
      </div>
    );
  }

  return <PanelCaja />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppPreview />
  </React.StrictMode>
);