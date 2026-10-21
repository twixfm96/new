import { useState } from "react";
import { RefreshCw, WifiOff, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import "./pwa.css";

export default function PwaStatus() {
  const [registrationError, setRegistrationError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateFailed, setUpdateFailed] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError() {
      setRegistrationError(true);
    },
  });

  async function applyUpdate() {
    setUpdating(true);
    setUpdateFailed(false);
    try {
      await updateServiceWorker(true);
      setUpdating(false);
    } catch {
      setUpdating(false);
      setUpdateFailed(true);
    }
  }

  if (needRefresh) {
    return (
      <aside className="pwa-status" role="status" aria-live="polite">
        <RefreshCw size={19} aria-hidden="true" />
        <div className="pwa-status-copy">
          <strong>Доступно обновление Ритма</strong>
          <p>
            {updateFailed
              ? "Не удалось обновить. Проверьте подключение и попробуйте ещё раз."
              : "Сначала сохраните открытые изменения. Приложение перезагрузится."}
          </p>
        </div>
        <div className="pwa-status-actions">
          <button
            className="button button-primary"
            disabled={updating}
            onClick={() => void applyUpdate()}
          >
            {updating ? "Обновляем…" : "Обновить"}
          </button>
          <button
            className="button button-secondary"
            disabled={updating}
            onClick={() => setNeedRefresh(false)}
          >
            Позже
          </button>
        </div>
      </aside>
    );
  }

  if (registrationError) {
    return (
      <aside
        className="pwa-status pwa-status-warning"
        role="status"
        aria-live="polite"
      >
        <WifiOff size={19} aria-hidden="true" />
        <div className="pwa-status-copy">
          <strong>Офлайн-версия пока недоступна</strong>
          <p>
            Приложение работает с интернетом. Повторите открытие позже, чтобы
            загрузить офлайн-версию.
          </p>
        </div>
        <button
          className="icon-button"
          aria-label="Закрыть уведомление об офлайн-режиме"
          onClick={() => setRegistrationError(false)}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </aside>
    );
  }

  return null;
}
