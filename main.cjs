const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs'); // Ajout du module de lecture de fichiers

app.commandLine.appendSwitch('no-sandbox');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
      webSecurity: false // <--- AJOUTEZ CETTE LIGNE
    }
  });

  win.webContents.openDevTools();

  // Construction du chemin
  const indexPath = path.join(__dirname, 'dist/index.html');
  
  // TEST FATAL : On vérifie si electron-builder a bien empaqueté le fichier
  if (!fs.existsSync(indexPath)) {
    dialog.showErrorBox(
      "Erreur d'empaquetage", 
      `Le fichier est introuvable dans l'AppImage !\n\nChemin cherché :\n${indexPath}\n\nSolution : Vérifiez la section "build.files" de votre package.json.`
    );
  } else {
    win.loadFile(indexPath);
  }
  
  win.setMenuBarVisibility(false); 
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});