const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        title: "Tread — Executive GST Invoicing Suite",
        icon: path.join(__dirname, "../src/assets/Images/Logo.png"),
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.setMenuBarVisibility(false);

    const distPath = path.join(__dirname, "../dist/index.html");
    if (fs.existsSync(distPath)) {
        win.loadFile(distPath);
    } else {
        win.loadURL("http://localhost:5173");
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
