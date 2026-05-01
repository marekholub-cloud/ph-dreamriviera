import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

createRoot(document.getElementById("root")!).render(<App />);

// Hide preloader once React has mounted
requestAnimationFrame(() => {
  const preloader = document.getElementById("app-preloader");
  if (preloader) {
    preloader.classList.add("hidden");
    setTimeout(() => preloader.remove(), 500);
  }
});
