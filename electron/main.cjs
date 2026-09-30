const { app, BrowserWindow, protocol } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

app.setName('InventarioPro');
app.setPath('userData', path.join(app.getPath('appData'), 'InventarioPro'));

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
};

function isInsideDirectory(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function registerAppProtocol() {
  const rendererDirectory = path.join(__dirname, '..', 'dist');
  protocol.handle('app', async request => {
    const requestUrl = new URL(request.url);
    let pathname;
    try {
      pathname = decodeURIComponent(requestUrl.pathname);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filePath = path.resolve(rendererDirectory, relativePath);
    if (!isInsideDirectory(rendererDirectory, filePath)) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const content = await fs.readFile(filePath);
      const contentType = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      return new Response(content, {
        headers: {
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return new Response('Not Found', { status: 404 });
      }
      console.error('Failed to serve application asset:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  });
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'InventarioPro',
    backgroundColor: '#f9fafb',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  await window.loadURL('app://app/index.html');
}

app.whenReady().then(async () => {
  registerAppProtocol();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch(error => console.error('Failed to open application window:', error));
    }
  });
}).catch(error => {
  console.error('Failed to start InventarioPro:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
