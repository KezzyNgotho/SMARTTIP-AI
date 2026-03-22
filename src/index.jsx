import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/styles.css";

if (globalThis.chrome?.runtime?.id) {
  document.body.classList.add("extension-popup");
}

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}
