// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // збереження/видалення токена
  saveToken: (token) => ipcRenderer.invoke('token:save', token),
  clearToken: () => ipcRenderer.invoke('token:clear'),

  hasToken: () => ipcRenderer.invoke('token:exists'),


  // бекенд-обгортки під Monobank — повертають ДАНІ, не токен
  getClientInfo: () => ipcRenderer.invoke('api:getClientInfo'),
  getCurrencyRates: () => ipcRenderer.invoke('api:getCurrencyRates'),
});
