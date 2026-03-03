const { app, BrowserWindow, session } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // must be false for your React app to access getUserMedia
      enableRemoteModule: true,
      media: true,             // allow camera/microphone
      webSecurity: false,      // allows getUserMedia on file:// if you package later
      setResizeable: true,
    },
  });

  win.setMenuBarVisibility(false);
  win.loadURL("http://localhost:5173"); // Vite dev server
  win.maximize();
}

// Automatically allow camera/mic
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "media") {
      callback(true); // allow camera
    } else {
      callback(false);
    }
  });

  createWindow();
});

// Quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// macOS: re-create window if app is activated
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});