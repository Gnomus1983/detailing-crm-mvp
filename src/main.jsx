import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/design-tokens.css";
import "./styles.css";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Неизвестная ошибка приложения." };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical app error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="loading-screen" style={{ padding: "24px", textAlign: "left", maxWidth: "720px", margin: "0 auto" }}>
          <h1>Detail CRM: ошибка инициализации</h1>
          <p>Приложение остановилось из-за внутренней ошибки. Попробуйте обновить страницу.</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{this.state.message}</p>
          <button type="button" className="button button-primary" onClick={() => window.location.reload()}>
            Обновить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
