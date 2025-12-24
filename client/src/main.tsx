import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { DevErrorBoundary } from "./components/DevErrorBoundary";

// --- Lenis smooth scroll integration ---
import Lenis from "lenis";

const lenis = new Lenis({
  duration: 1.2,
  smooth: true,
  direction: "vertical",
  gestureDirection: "vertical",
  smoothTouch: false,
});

function raf(time: number) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

createRoot(document.getElementById("root")!).render(
  import.meta.env.DEV ? (
    <DevErrorBoundary>
      <App />
    </DevErrorBoundary>
  ) : (
    <App />
  )
);
