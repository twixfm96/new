import { useEffect, useState } from "react";
import { Check, Download, Share, Smartphone, WifiOff } from "lucide-react";
import Modal from "./Modal";
import "./pwa.css";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function InstallAppCard() {
  const [showGuide, setShowGuide] = useState(false);
  const [installed, setInstalled] = useState(isStandalone);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const update = () => setInstalled(isStandalone());
    displayMode.addEventListener("change", update);
    window.addEventListener("pageshow", update);

    let active = true;
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready.then(
        (registration) => {
          if (active && registration.active) setOfflineReady(true);
        },
        () => {
          // The separate status banner reports registration failures.
        },
      );
    }

    return () => {
      active = false;
      displayMode.removeEventListener("change", update);
      window.removeEventListener("pageshow", update);
    };
  }, []);

  return (
    <>
      <section className="panel settings-panel install-app-panel">
        <h2>
          <Smartphone size={20} aria-hidden="true" />
          Приложение на телефоне
        </h2>
        <p className="settings-description">
          Добавьте «Ритм» на экран «Домой», чтобы открывать его как обычное
          приложение.
        </p>
        <div className="setting-row">
          <div>
            <h3>
              {installed ? "Приложение установлено" : "Установка на iPhone"}
            </h3>
            <p>
              {installed
                ? "Вы открыли Ритм с домашнего экрана."
                : "Установка на iPhone через Safari."}
            </p>
          </div>
          {installed ? (
            <span className="install-state" aria-label="Установлено">
              <Check size={20} aria-hidden="true" />
            </span>
          ) : (
            <button
              className="button button-secondary"
              onClick={() => setShowGuide(true)}
            >
              <Download size={16} aria-hidden="true" />
              Как установить
            </button>
          )}
        </div>
        <p className="install-offline-note">
          <WifiOff size={15} aria-hidden="true" />
          <span>
            {offlineReady
              ? "Офлайн-версия загружена. Привычки доступны и без интернета."
              : "Офлайн-режим станет доступен после первой полной загрузки с интернетом."}
          </span>
        </p>
      </section>

      {showGuide && (
        <Modal title="Ритм на вашем iPhone" onClose={() => setShowGuide(false)}>
          <div className="install-guide-intro">
            <span className="install-guide-icon">
              <Smartphone size={28} aria-hidden="true" />
            </span>
            <p>
              Добавьте Ритм на домашний экран и открывайте свои привычки одним
              касанием, в отдельном окне.
            </p>
          </div>
          <ol className="install-steps">
            <li>
              <strong>Откройте Ритм в Safari на iPhone</strong>
              <p>
                Если вы открыли эту страницу в другом браузере, перенесите её
                ссылку в Safari.
              </p>
            </li>
            <li>
              <strong>
                Нажмите «Поделиться»
                <Share size={17} aria-hidden="true" />
              </strong>
              <p>Кнопка с квадратом и стрелкой находится в меню Safari.</p>
            </li>
            <li>
              <strong>Выберите «На экран „Домой“»</strong>
              <p>
                Если есть переключатель «Открывать как веб-приложение», оставьте
                его включённым. Затем нажмите «Добавить».
              </p>
            </li>
          </ol>
          <div className="install-guide-note">
            <WifiOff size={17} aria-hidden="true" />
            <p>
              Откройте приложение с домашнего экрана с интернетом и дождитесь
              первой полной загрузки. После этого им можно пользоваться офлайн.
            </p>
          </div>
          <p className="install-data-note">
            Данные остаются на этом устройстве. Safari и приложение с домашнего
            экрана могут хранить их отдельно: для переноса сохраните экспорт в
            настройках, затем импортируйте его в установленном приложении.
          </p>
          <div className="modal-actions">
            <button
              className="button button-primary"
              onClick={() => setShowGuide(false)}
            >
              Понятно
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
