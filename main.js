const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const keytar = require('keytar');

const SERVICE = 'BankBalanceApp';
const ACCOUNT = 'monobank_token';

ipcMain.handle('token:save', async (_e, token) => {
  await keytar.setPassword(SERVICE, ACCOUNT, token.trim());
  return true;
});

ipcMain.handle('token:clear', async () => {
  await keytar.deletePassword(SERVICE, ACCOUNT);
  return true;
});

async function monoFetch(pathname) {
  const token = await keytar.getPassword(SERVICE, ACCOUNT);
  if (!token) {
    const err = new Error('No token saved');
    err.code = 'NO_TOKEN';
    throw err;
  }
  const resp = await fetch(`https://api.monobank.ua/${pathname}`, {
    headers: { 'X-Token': token }
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const err = new Error(`Monobank ${resp.status}: ${text}`);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

ipcMain.handle('api:getClientInfo', async () => {
  return monoFetch('personal/client-info');
});

ipcMain.handle('api:getCurrencyRates', async () => {
  return monoFetch('bank/currency');
});

ipcMain.handle('token:exists', async () => {
  const t = await keytar.getPassword(SERVICE, ACCOUNT);
  return Boolean(t);
});

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const scale = display.scaleFactor; // 1.25 при 125%, 1.0 при 100%

  // наша ціль у ФІЗИЧНИХ пікселях (зовнішній розмір "коробки")
  const targetPxW = 768;
  const targetPxH = 1020;

  // переводимо в DIP для Electron
  const winW = Math.round(targetPxW / scale);
  const winH = Math.round(targetPxH / scale);

  // правий край екрана (координати теж у DIP)
  const { workArea } = display;
  const x = workArea.x + workArea.width - winW;
  const y = workArea.y; // зверху

  const win = new BrowserWindow({
    width: winW,
    height: winH,
    x, y,
    // лишаємо useContentSize=false: width/height — це саме ЗОВНІШНІ розміри
    webPreferences: {
      nodeIntegration: false,   // було true — вимикаємо
      contextIsolation: true,   // було false — вмикаємо
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // на всяк випадок добиваємося точних DIP після показу
  win.once('ready-to-show', () => {
    win.setSize(winW, winH);
    win.setPosition(x, y);
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});