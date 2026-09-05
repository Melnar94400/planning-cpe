const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('no-sandbox');
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    // On désactive nodeIntegration pour des raisons de sécurité
    // vu que l'appli n'utilise que le localStorage du navigateur
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Chargement sécurisé du fichier HTML depuis l'archive
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  win.setMenuBarVisibility(false); 
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});