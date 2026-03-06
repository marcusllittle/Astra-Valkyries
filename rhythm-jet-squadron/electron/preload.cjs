const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("astraPlatform", {
  desktop: true,
});
