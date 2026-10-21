import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Flame,
  LayoutGrid,
  Leaf,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import {
  addDays,
  createDemoData,
  createEmptyData,
  dashboardStats,
  dateKey,
  habitStats,
  isScheduled,
  monthDates,
  monthlyStats,
  parseDate,
  setCompletion,
  validateAppData,
} from "./lib/habits";
import type { AppData, Habit } from "./lib/habits";
import Modal from "./components/Modal";
import HabitForm from "./components/HabitForm";
import InstallAppCard from "./components/InstallAppCard";

type Page = "habits" | "stats" | "settings";
const STORAGE_KEY = "ritm.habits.v1";
const WEEK_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const fullDate = (key: string) =>
  parseDate(key).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
function shiftMonth(date: Date, offset: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + offset);
  return next.getFullYear() >= 1 && next.getFullYear() <= 9998 ? next : date;
}
const monthTitle = (date: Date) =>
  date
    .toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    .replace(" г.", "");
const plural = (n: number, forms: [string, string, string]) =>
  forms[
    n % 10 === 1 && n % 100 !== 11
      ? 0
      : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)
        ? 1
        : 2
  ];
const daysText = (n: number) => `${n} ${plural(n, ["день", "дня", "дней"])}`;
const styleColor = (color: string): CSSProperties =>
  ({ "--habit-color": color }) as CSSProperties;
const frequency = (habit: Habit) =>
  habit.weekdays.length === 7
    ? "Каждый день"
    : habit.weekdays.length === 5 && habit.weekdays.every((d) => d > 0 && d < 6)
      ? "По будням"
      : [1, 2, 3, 4, 5, 6, 0]
          .filter((d) => habit.weekdays.includes(d))
          .map((d) => WEEK_LABELS[d])
          .join(", ");

function readInitial(): { data: AppData; blocked: boolean; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: createDemoData(), blocked: false, error: "" };
    const parsed = validateAppData(JSON.parse(raw));
    if (parsed) return { data: parsed, blocked: false, error: "" };
    return {
      data: createEmptyData(),
      blocked: true,
      error:
        "Сохранённые данные повреждены. Исходная запись сохранена; восстановите данные из файла или сбросьте их в настройках.",
    };
  } catch {
    return {
      data: createEmptyData(),
      blocked: true,
      error:
        "Хранилище браузера недоступно или содержит некорректные данные. Изменения пока не сохраняются. Вы можете экспортировать их в настройках.",
    };
  }
}

function useToday() {
  const [today, setToday] = useState(dateKey());
  useEffect(() => {
    const update = () => setToday(dateKey());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);
  return today;
}

function App() {
  const [initial] = useState(readInitial);
  const [data, setData] = useState(initial.data);
  const [storageBlocked, setStorageBlocked] = useState(initial.blocked);
  const [storageError, setStorageError] = useState(initial.error);
  const [page, setPage] = useState<Page>(() =>
    location.hash === "#stats"
      ? "stats"
      : location.hash === "#settings"
        ? "settings"
        : "habits",
  );
  const [form, setForm] = useState<Habit | "new" | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    text: string;
    label: string;
    action: () => void;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const today = useToday();
  const detail = data.habits.find((h) => h.id === detailId);
  const importRef = useRef<HTMLInputElement>(null);
  const stats = dashboardStats(data.habits, today);

  useEffect(() => {
    if (storageBlocked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError("");
    } catch {
      setStorageError(
        "Не удалось сохранить изменения в браузере. Экспортируйте данные в настройках, чтобы не потерять их.",
      );
    }
  }, [data, storageBlocked]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        data.settings.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : data.settings.theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          "content",
          document.documentElement.dataset.theme === "dark"
            ? "#111214"
            : "#f5f6f8",
        );
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [data.settings.theme]);
  useEffect(() => {
    const update = () => {
      setPage(
        location.hash === "#stats"
          ? "stats"
          : location.hash === "#settings"
            ? "settings"
            : "habits",
      );
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigate(next: Page) {
    setPage(next);
    location.hash = next;
    setSearch("");
    setSearchOpen(false);
  }
  function updateCompletion(id: string, key: string, completed: boolean) {
    setData((old) => ({
      ...old,
      habits: old.habits.map((h) =>
        h.id === id ? setCompletion(h, key, completed) : h,
      ),
    }));
  }
  function saveHabit(habit: Habit) {
    const exists = data.habits.some((h) => h.id === habit.id);
    setData((old) => ({
      ...old,
      habits: exists
        ? old.habits.map((h) => (h.id === habit.id ? habit : h))
        : [...old.habits, habit],
    }));
    setForm(null);
    setToast(exists ? "Изменения сохранены" : "Привычка добавлена");
  }
  function clearAll() {
    setConfirm({
      title: data.demo ? "Очистить пример?" : "Удалить все данные?",
      text: data.demo
        ? "Все привычки и отметки, включая пример и внесённые вами изменения, будут удалены. После этого можно добавить свои привычки."
        : "Все привычки и отметки будут удалены с этого устройства. Перед удалением можно сохранить экспорт в настройках.",
      label: data.demo ? "Очистить пример" : "Удалить данные",
      action: () => {
        setData((old) => ({ ...createEmptyData(), settings: old.settings }));
        setStorageBlocked(false);
        setStorageError("");
        setDetailId(null);
        setConfirm(null);
        setToast("Данные удалены");
      },
    });
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ritm-${today}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Файл с привычками подготовлен");
  }
  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 5_000_000)
        throw new Error("Файл слишком большой. Максимум — 5 МБ.");
      const parsed = validateAppData(JSON.parse(await file.text()));
      if (!parsed)
        throw new Error("Файл не соответствует формату экспорта Ритма.");
      setConfirm({
        title: "Восстановить данные?",
        text: `В файле ${parsed.habits.length} ${plural(parsed.habits.length, ["привычка", "привычки", "привычек"])}. Они заменят текущие привычки, отметки и настройки.`,
        label: "Восстановить",
        action: () => {
          setData(parsed);
          setStorageBlocked(false);
          setStorageError("");
          setConfirm(null);
          setDetailId(null);
          setToast("Данные успешно восстановлены");
        },
      });
    } catch (error) {
      setToast(
        error instanceof Error && error.message.startsWith("Файл")
          ? error.message
          : "Не удалось прочитать файл. Выберите JSON-экспорт Ритма.",
      );
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#habits"
          onClick={() => navigate("habits")}
          aria-label="Ритм — главная"
        >
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            ритм<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="sidebar-caption">ТРЕКЕР ПРИВЫЧЕК</div>
        <nav className="main-nav" aria-label="Основная навигация">
          <button
            className={page === "habits" ? "active" : ""}
            aria-current={page === "habits" ? "page" : undefined}
            onClick={() => navigate("habits")}
          >
            <LayoutGrid size={19} />
            <span>Привычки</span>
            <span className="nav-count">{data.habits.length}</span>
          </button>
          <button
            className={page === "stats" ? "active" : ""}
            aria-current={page === "stats" ? "page" : undefined}
            onClick={() => navigate("stats")}
          >
            <BarChart3 size={19} />
            <span>Статистика</span>
          </button>
          <button
            className={page === "settings" ? "active" : ""}
            aria-current={page === "settings" ? "page" : undefined}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={19} />
            <span>Настройки</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <span className="local-avatar">
            <Leaf size={18} />
          </span>
          <div>
            <strong>Локальное хранение</strong>
            <span>
              <span className={`status-dot ${storageError ? "error" : ""}`} />
              {storageError
                ? "Есть несохранённые данные"
                : "Данные на устройстве"}
            </span>
          </div>
          <button
            className="icon-button"
            aria-label="Открыть настройки"
            onClick={() => navigate("settings")}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-date">
            <CalendarDays size={21} />
            <span>
              {parseDate(today).toLocaleDateString("ru-RU", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
          <div className="topbar-actions">
            {page === "habits" && (
              <>
                <div className={`search-box ${searchOpen ? "open" : ""}`}>
                  {searchOpen && (
                    <input
                      autoFocus
                      aria-label="Поиск привычек"
                      placeholder="Найти привычку…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  )}
                  <button
                    className="icon-button"
                    aria-label={searchOpen ? "Закрыть поиск" : "Поиск привычек"}
                    onClick={() => {
                      setSearchOpen(!searchOpen);
                      setSearch("");
                    }}
                  >
                    {searchOpen ? <X size={19} /> : <Search size={19} />}
                  </button>
                </div>
                <span className="topbar-separator" />
              </>
            )}
            <button
              className="profile-button"
              aria-label="Настройки приложения"
              onClick={() => navigate("settings")}
            >
              <Settings2 size={22} />
            </button>
          </div>
        </header>
        <main className="main-content" id="main-content">
          {storageError && (
            <div className="warning-banner" role="alert">
              <CircleHelp size={20} />
              <span>{storageError}</span>
              <button onClick={() => navigate("settings")}>
                Настройки <ArrowRight size={15} />
              </button>
            </div>
          )}
          {page === "habits" && (
            <>
              <section className="page-heading">
                <div>
                  <h1>Привычки</h1>
                </div>
                <button
                  className="button button-primary new-habit-button"
                  onClick={() => setForm("new")}
                >
                  <Plus size={18} />
                  <span className="new-habit-label">Новая привычка</span>
                </button>
              </section>
              {data.demo && (
                <div className="demo-banner">
                  <span>
                    <CircleHelp size={20} />
                    <strong>Пример данных</strong>
                    <span>Показаны демонстрационные привычки.</span>
                  </span>
                  <button onClick={clearAll}>
                    Очистить пример <ArrowRight size={15} />
                  </button>
                </div>
              )}
              <section
                className="today-summary"
                aria-label="Краткая статистика"
              >
                <div className="today-summary-copy">
                  <span>Сегодня</span>
                  <strong>
                    {stats.todayDone} <span>из {stats.todayTotal}</span>
                  </strong>
                  <span>выполнено</span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="Выполнено сегодня"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    stats.todayTotal
                      ? Math.round((stats.todayDone / stats.todayTotal) * 100)
                      : 0
                  }
                >
                  <span
                    style={{
                      width: `${stats.todayTotal ? (stats.todayDone / stats.todayTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </section>
              <HabitList
                habits={data.habits}
                search={search}
                today={today}
                weekStartsOn={data.settings.weekStartsOn}
                onSetCompletion={updateCompletion}
                onOpen={setDetailId}
                onAdd={() => setForm("new")}
              />
            </>
          )}
          {page === "stats" && (
            <Statistics
              habits={data.habits}
              today={today}
              onOpen={setDetailId}
              onAdd={() => setForm("new")}
            />
          )}
          {page === "settings" && (
            <>
              <section className="page-heading">
                <div>
                  <h1>Настройки</h1>
                  <p>Оформление, расписание и данные.</p>
                </div>
              </section>
              <div className="settings-grid">
                <InstallAppCard />
                <section className="panel settings-panel">
                  <h2>
                    <Settings2 size={20} />
                    Внешний вид
                  </h2>
                  <div className="setting-row">
                    <div>
                      <h3>Тема приложения</h3>
                      <p>Светлая, тёмная или системная тема.</p>
                    </div>
                  </div>
                  <div className="theme-options">
                    {(
                      [
                        { value: "light", label: "Светлая", icon: Sun },
                        { value: "dark", label: "Тёмная", icon: Moon },
                        {
                          value: "system",
                          label: "Системная",
                          icon: Settings2,
                        },
                      ] as const
                    ).map((theme) => (
                      <button
                        key={theme.value}
                        className={
                          data.settings.theme === theme.value ? "selected" : ""
                        }
                        aria-pressed={data.settings.theme === theme.value}
                        onClick={() =>
                          setData((old) => ({
                            ...old,
                            settings: { ...old.settings, theme: theme.value },
                          }))
                        }
                      >
                        <theme.icon size={23} />
                        <span>{theme.label}</span>
                        {data.settings.theme === theme.value && (
                          <Check size={14} />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="setting-row bordered">
                    <div>
                      <h3>Начало недели</h3>
                      <p>Порядок дней в календаре и обзоре.</p>
                    </div>
                    <select
                      className="select-input"
                      aria-label="Начало недели"
                      value={data.settings.weekStartsOn}
                      onChange={(e) =>
                        setData((old) => ({
                          ...old,
                          settings: {
                            ...old.settings,
                            weekStartsOn: Number(e.target.value) as 0 | 1,
                          },
                        }))
                      }
                    >
                      <option value="1">Понедельник</option>
                      <option value="0">Воскресенье</option>
                    </select>
                  </div>
                </section>
                <section className="panel settings-panel">
                  <h2>
                    <ShieldCheck size={20} />
                    Ваши данные
                  </h2>
                  <p className="settings-description">
                    Привычки сохраняются только в этом браузере на этом
                    устройстве. Сделайте копию, чтобы перенести их или
                    восстановить после очистки браузера.
                  </p>
                  <div className="setting-row">
                    <div>
                      <h3>Сохранить копию</h3>
                      <p>Все привычки, отметки и настройки в JSON.</p>
                    </div>
                    <button
                      className="button button-secondary"
                      onClick={exportData}
                    >
                      <ArrowDownToLine size={16} />
                      Экспорт
                    </button>
                  </div>
                  <div className="setting-row bordered">
                    <div>
                      <h3>Восстановить из файла</h3>
                      <p>Импорт ранее сохранённой копии.</p>
                    </div>
                    <button
                      className="button button-secondary"
                      onClick={() => importRef.current?.click()}
                    >
                      <Upload size={16} />
                      Импорт
                    </button>
                  </div>
                  <input
                    type="file"
                    accept=".json,application/json"
                    ref={importRef}
                    hidden
                    onChange={importData}
                  />
                </section>
                <section className="panel settings-panel danger-panel">
                  <h2>Удаление данных</h2>
                  <div className="setting-row">
                    <div>
                      <h3>
                        {data.demo ? "Очистить пример" : "Удалить все данные"}
                      </h3>
                      <p>
                        {data.demo
                          ? "Удалить демонстрационные привычки и отметки."
                          : "Удалить привычки и всю историю выполнений."}
                      </p>
                    </div>
                    <button className="button button-danger" onClick={clearAll}>
                      <Trash2 size={16} />
                      Очистить
                    </button>
                  </div>
                </section>
                <div className="about-app">
                  <span className="brand-mark">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <div>
                    <strong>Ритм</strong>
                    <p>Трекер привычек</p>
                    <span>Версия 1.1</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Разделы приложения">
        {(
          [
            { key: "habits", label: "Привычки", icon: LayoutGrid },
            { key: "stats", label: "Статистика", icon: BarChart3 },
            { key: "settings", label: "Настройки", icon: Settings2 },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={page === key ? "active" : ""}
            aria-current={page === key ? "page" : undefined}
            onClick={() => navigate(key)}
          >
            <Icon size={24} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {detail && !form && !confirm && (
        <HabitDetail
          habit={detail}
          today={today}
          weekStartsOn={data.settings.weekStartsOn}
          onClose={() => setDetailId(null)}
          onSetCompletion={(key, completed) =>
            updateCompletion(detail.id, key, completed)
          }
          onEdit={() => setForm(detail)}
          onDelete={() =>
            setConfirm({
              title: "Удалить привычку?",
              text: `«${detail.name}» и вся её история будут удалены. Это действие нельзя отменить.`,
              label: "Удалить привычку",
              action: () => {
                setData((old) => ({
                  ...old,
                  habits: old.habits.filter((h) => h.id !== detail.id),
                }));
                setDetailId(null);
                setConfirm(null);
                setToast("Привычка удалена");
              },
            })
          }
        />
      )}
      {form && (
        <HabitForm
          habit={form === "new" ? undefined : form}
          onSave={saveHabit}
          onClose={() => setForm(null)}
        />
      )}
      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}>
          <p className="confirm-description">{confirm.text}</p>
          <div className="modal-actions">
            <button
              className="button button-secondary"
              onClick={() => setConfirm(null)}
            >
              Отмена
            </button>
            <button className="button button-primary" onClick={confirm.action}>
              {confirm.label}
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button onClick={() => setToast("")} aria-label="Закрыть уведомление">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function CompletionRemovalDialog({
  name,
  day,
  onClose,
  onConfirm,
}: {
  name: string;
  day: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Убрать отметку?" onClose={onClose}>
      <p className="confirm-description">
        Отменить выполнение привычки «{name}» за {fullDate(day)}?
      </p>
      <div className="modal-actions">
        <button
          className="button button-secondary"
          data-modal-autofocus
          onClick={onClose}
        >
          Оставить отметку
        </button>
        <button className="button button-danger" onClick={onConfirm}>
          Убрать отметку
        </button>
      </div>
    </Modal>
  );
}

function HabitList({
  habits,
  search,
  today,
  weekStartsOn,
  onSetCompletion,
  onOpen,
  onAdd,
}: {
  habits: Habit[];
  search: string;
  today: string;
  weekStartsOn: 0 | 1;
  onSetCompletion: (id: string, key: string, completed: boolean) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const [month, setMonth] = useState(() => parseDate(today));
  const [view, setView] = useState<"month" | "today">("month");
  const [category, setCategory] = useState("all");
  const [pendingRemoval, setPendingRemoval] = useState<{
    id: string;
    name: string;
    day: string;
  } | null>(null);
  const dates = monthDates(month.getFullYear(), month.getMonth(), weekStartsOn);
  const weekdays =
    weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const filtered = habits.filter(
    (h) =>
      (category === "all" || h.category === category) &&
      h.name.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru")),
  );
  function markDay(habit: Habit, day: string) {
    if (habit.completions.includes(day))
      setPendingRemoval({ id: habit.id, name: habit.name, day });
    else onSetCompletion(habit.id, day, true);
  }
  return (
    <>
      <section className="panel habits-panel">
        <div className="panel-heading">
          <select
            className="habit-category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Фильтр привычек по категории"
          >
            <option value="all">Все привычки</option>
            {[...new Set(habits.map((h) => h.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <div className="segmented-control" aria-label="Вид списка">
            <button
              className={view === "month" ? "selected" : ""}
              aria-pressed={view === "month"}
              onClick={() => setView("month")}
            >
              <CalendarDays size={18} />
              Месяц
            </button>
            <button
              className={view === "today" ? "selected" : ""}
              aria-pressed={view === "today"}
              onClick={() => setView("today")}
            >
              Сегодня
            </button>
          </div>
        </div>
        <div className="habit-toolbar">
          {view === "month" ? (
            <div className="month-navigation">
              <button
                className="icon-button"
                onClick={() => setMonth(shiftMonth(month, -1))}
                aria-label="Предыдущий месяц списка"
              >
                <ChevronLeft size={22} />
              </button>
              <span>{monthTitle(month)}</span>
              <button
                className="icon-button"
                onClick={() => setMonth(shiftMonth(month, 1))}
                aria-label="Следующий месяц списка"
              >
                <ChevronRight size={22} />
              </button>
              {dateKey(month).slice(0, 7) !== today.slice(0, 7) && (
                <button
                  className="text-button"
                  onClick={() => setMonth(parseDate(today))}
                >
                  Текущий
                </button>
              )}
            </div>
          ) : (
            <span className="muted toolbar-hint">Отметки за сегодня</span>
          )}
        </div>
        {habits.length === 0 ? (
          <EmptyState onAdd={onAdd} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Search size={28} />
            <h3>Ничего не нашлось</h3>
            <p>Попробуйте другое название или выберите все категории.</p>
            <button
              className="button button-secondary"
              onClick={() => setCategory("all")}
            >
              Все категории
            </button>
          </div>
        ) : (
          <div className={`habit-table ${view === "today" ? "day-view" : ""}`}>
            {filtered.map((habit) => {
              const current = habitStats(habit, today);
              const doneToday = habit.completions.includes(today);
              return (
                <div
                  className="habit-row"
                  key={habit.id}
                  style={styleColor(habit.color)}
                >
                  <div className="habit-card-heading">
                    <button
                      className="habit-name-button"
                      onClick={() => onOpen(habit.id)}
                    >
                      <span className="habit-icon">{habit.icon}</span>
                      <span className="habit-name">
                        <strong>{habit.name}</strong>
                        <span>{frequency(habit)}</span>
                      </span>
                    </button>
                    <button
                      className={`today-check ${doneToday ? "done" : ""}`}
                      aria-label={`${habit.name}: ${doneToday ? "отменить выполнение за сегодня с подтверждением" : "выполнить сегодня"}`}
                      aria-pressed={doneToday}
                      onClick={() => markDay(habit, today)}
                    >
                      {doneToday ? (
                        <Check size={28} strokeWidth={2.5} />
                      ) : (
                        <Plus size={26} />
                      )}
                      <span>Сегодня</span>
                    </button>
                  </div>
                  {view === "month" && (
                    <>
                      <div className="card-calendar-caption">
                        {monthTitle(month)}
                      </div>
                      <div
                        className="card-calendar"
                        aria-label={`Календарь ${habit.name}`}
                      >
                        {weekdays.map((d) => (
                          <span className="week-day-label" key={d}>
                            {WEEK_LABELS[d]}
                          </span>
                        ))}
                        {dates.map((day) => {
                          const done = habit.completions.includes(day);
                          return (
                            <button
                              key={day}
                              className={`completion-button ${done ? "done" : ""} ${!isScheduled(habit, day) ? "unscheduled" : ""} ${day > today ? "future" : ""} ${day === today ? "is-today" : ""} ${parseDate(day).getMonth() !== month.getMonth() ? "outside-month" : ""}`}
                              aria-label={`${habit.name}, ${fullDate(day)}: ${done ? "выполнено, отменить с подтверждением" : "отметить выполнение"}`}
                              aria-pressed={done}
                              onClick={() => markDay(habit, day)}
                            >
                              <span>{parseDate(day).getDate()}</span>
                              <Check
                                className="week-check"
                                size={12}
                                aria-hidden="true"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  <button
                    className="row-streak"
                    onClick={() => onOpen(habit.id)}
                    aria-label={`Статистика ${habit.name}: серия ${daysText(current.currentStreak)}`}
                  >
                    <Flame size={16} />
                    <span>Серия: {daysText(current.currentStreak)}</span>
                    <span className="open-calendar">
                      Подробнее <ChevronRight size={18} />
                    </span>
                  </button>
                </div>
              );
            })}
            <button className="add-habit-row" onClick={onAdd}>
              <Plus size={20} />
              Добавить привычку
            </button>
          </div>
        )}
        <div className="table-footnote">
          <span>Отметки сохраняются автоматически</span>
          <span>Снятие отметки требует подтверждения</span>
        </div>
      </section>
      {pendingRemoval && (
        <CompletionRemovalDialog
          name={pendingRemoval.name}
          day={pendingRemoval.day}
          onClose={() => setPendingRemoval(null)}
          onConfirm={() => {
            onSetCompletion(pendingRemoval.id, pendingRemoval.day, false);
            setPendingRemoval(null);
          }}
        />
      )}
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <span className="empty-illustration">
        <Leaf size={34} />
      </span>
      <h3>Пока нет привычек</h3>
      <p>Добавьте привычку и выберите дни выполнения.</p>
      <button className="button button-primary" onClick={onAdd}>
        <Plus size={17} />
        Создать привычку
      </button>
    </div>
  );
}

function HabitDetail({
  habit,
  today,
  weekStartsOn,
  onClose,
  onSetCompletion,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  today: string;
  weekStartsOn: 0 | 1;
  onClose: () => void;
  onSetCompletion: (key: string, completed: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [month, setMonth] = useState(() => parseDate(today));
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const stats = habitStats(habit, today);
  const days = monthDates(month.getFullYear(), month.getMonth(), weekStartsOn);
  const weekdays =
    weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const monthStats = monthlyStats(
    [habit],
    month.getFullYear(),
    month.getMonth(),
    today,
  );
  const [jumpDate, setJumpDate] = useState(today);
  return (
    <>
      <Modal title="Ваша привычка" onClose={onClose} wide>
        <div className="habit-detail" style={styleColor(habit.color)}>
          <div className="detail-title">
            <span className="habit-icon large">{habit.icon}</span>
            <div>
              <h2>{habit.name}</h2>
              <p>
                {habit.category}
                <span>·</span>
                {frequency(habit)}
              </p>
            </div>
            <button
              className="icon-button"
              aria-label="Редактировать привычку"
              onClick={onEdit}
            >
              <Settings2 size={20} />
            </button>
          </div>
          <div className="detail-stats">
            <div>
              <CheckCheck size={17} />
              <strong>{stats.total}</strong>
              <span>Выполнений</span>
            </div>
            <div>
              <Flame size={17} />
              <strong>
                {stats.currentStreak}
                <small> дн.</small>
              </strong>
              <span>Текущая серия</span>
            </div>
            <div>
              <TrendingUp size={17} />
              <strong>
                {stats.longestStreak}
                <small> дн.</small>
              </strong>
              <span>Лучшая серия</span>
            </div>
            <div>
              <Target size={17} />
              <strong>
                {Math.round(stats.rate)}
                <small>%</small>
              </strong>
              <span>За 30 дней</span>
            </div>
          </div>
          <section className="detail-calendar">
            <div className="calendar-heading">
              <h3>{monthTitle(month)}</h3>
              <div>
                <button
                  className="text-button"
                  onClick={() => {
                    setMonth(parseDate(today));
                    setJumpDate(today);
                  }}
                >
                  Сегодня
                </button>
                <button
                  className="icon-button"
                  aria-label="Предыдущий месяц"
                  onClick={() => setMonth(shiftMonth(month, -1))}
                >
                  <ChevronLeft size={19} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Следующий месяц"
                  onClick={() => setMonth(shiftMonth(month, 1))}
                >
                  <ChevronRight size={19} />
                </button>
              </div>
            </div>
            <div className="calendar-grid">
              {weekdays.map((d) => (
                <span className="calendar-weekday" key={d}>
                  {WEEK_LABELS[d]}
                </span>
              ))}
              {days.map((day) => {
                const done = habit.completions.includes(day);
                return (
                  <button
                    key={day}
                    className={`calendar-day ${parseDate(day).getMonth() !== month.getMonth() ? "outside-month" : ""} ${done ? "completed" : ""} ${day === today ? "is-today" : ""} ${!isScheduled(habit, day) ? "not-scheduled" : ""}`}
                    aria-label={`${fullDate(day)}: ${done ? "выполнено, отменить с подтверждением" : "отметить выполнение"}`}
                    aria-pressed={done}
                    onClick={() => {
                      if (done) setPendingRemoval(day);
                      else onSetCompletion(day, true);
                    }}
                  >
                    <span>{parseDate(day).getDate()}</span>
                    <Check
                      size={12}
                      className="calendar-check"
                      aria-hidden="true"
                    />
                    {!done && day === today && <i />}
                  </button>
                );
              })}
            </div>
            <div className="calendar-legend">
              <span>
                <i className="completed-legend" />
                Выполнено
              </span>
              <span>
                <i className="today-legend" />
                Сегодня
              </span>
              <span>
                <i className="scheduled-legend" />
                Вне расписания
              </span>
            </div>
          </section>
          <div className="date-jump">
            <label htmlFor="jump-date">Перейти к дате</label>
            <input
              className="text-input"
              id="jump-date"
              type="date"
              min="0001-01-01"
              max="9998-12-31"
              value={jumpDate}
              onChange={(e) => {
                const value = e.target.value;
                setJumpDate(value);
                if (
                  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
                  value >= "0001-01-01" &&
                  value <= "9998-12-31"
                ) {
                  try {
                    setMonth(parseDate(value));
                  } catch {
                    /* A partially typed date is not yet a valid calendar date. */
                  }
                }
              }}
            />
          </div>
          <p className="calendar-help">
            Нажмите на день, чтобы отметить выполнение. Для снятия отметки
            потребуется подтверждение. Будущие отметки учитываются с
            наступлением этой даты.
          </p>
          <div className="month-summary">
            <div>
              <span>Выполнено по расписанию за месяц</span>
              <strong>
                {monthStats.completed} <span>из {monthStats.scheduled}</span>
              </strong>
            </div>
            <div className="progress-track">
              <span
                style={{
                  width: `${monthStats.rate}%`,
                  background: habit.color,
                }}
              />
            </div>
            <span>{Math.round(monthStats.rate)}% выполнено</span>
          </div>
          <div className="detail-footer">
            <button className="text-button danger-text" onClick={onDelete}>
              <Trash2 size={15} />
              Удалить привычку
            </button>
            <button className="button button-secondary" onClick={onEdit}>
              <Settings2 size={15} />
              Редактировать
            </button>
          </div>
        </div>
      </Modal>
      {pendingRemoval && (
        <CompletionRemovalDialog
          name={habit.name}
          day={pendingRemoval}
          onClose={() => setPendingRemoval(null)}
          onConfirm={() => {
            onSetCompletion(pendingRemoval, false);
            setPendingRemoval(null);
          }}
        />
      )}
    </>
  );
}

function Statistics({
  habits,
  today,
  onOpen,
  onAdd,
}: {
  habits: Habit[];
  today: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const [month, setMonth] = useState(() => parseDate(today));
  const stats = monthlyStats(
    habits,
    month.getFullYear(),
    month.getMonth(),
    today,
  );
  const overall = dashboardStats(habits, today);
  const firstDay = new Date(month);
  firstDay.setDate(1);
  const days = Array.from({ length: 31 }, (_, i) =>
    addDays(dateKey(firstDay), i),
  ).filter((day) => parseDate(day).getMonth() === month.getMonth());
  const activeDays = days.filter(
    (d) => d <= today && habits.some((h) => h.completions.includes(d)),
  ).length;
  const weekdayRates = [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
    let scheduled = 0;
    let done = 0;
    days
      .filter((d) => d <= today && parseDate(d).getDay() === weekday)
      .forEach((d) =>
        habits.forEach((h) => {
          if (d >= h.createdAt && isScheduled(h, d)) {
            scheduled++;
            if (h.completions.includes(d)) done++;
          }
        }),
      );
    return {
      weekday,
      rate: scheduled ? Math.round((done / scheduled) * 100) : 0,
    };
  });
  return (
    <>
      <section className="page-heading">
        <div>
          <h1>Статистика</h1>
          <p>Выполнения и регулярность за выбранный месяц.</p>
        </div>
        <div className="month-picker">
          <button
            className="icon-button"
            aria-label="Предыдущий месяц статистики"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <span>{monthTitle(month)}</span>
          <button
            className="icon-button"
            aria-label="Следующий месяц статистики"
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>
      {habits.length === 0 ? (
        <section className="panel">
          <EmptyState onAdd={onAdd} />
        </section>
      ) : (
        <>
          <div className="summary-grid stats-summary">
            <div className="summary-card">
              <div>
                <span className="summary-label">
                  Выполнено по плану <CheckCheck size={17} />
                </span>
                <div className="summary-value">
                  {stats.completed}
                  <span> / {stats.scheduled}</span>
                </div>
                <p>За выбранный месяц, до сегодня</p>
              </div>
            </div>
            <div className="summary-card">
              <div>
                <span className="summary-label">
                  Регулярность <Target size={17} />
                </span>
                <div className="summary-value">
                  {Math.round(stats.rate)}
                  <span>%</span>
                </div>
                <p>Выполнений от запланированного</p>
              </div>
            </div>
            <div className="summary-card">
              <div>
                <span className="summary-label">
                  Активных дней <CalendarDays size={17} />
                </span>
                <div className="summary-value">
                  {activeDays}
                  <span> {plural(activeDays, ["день", "дня", "дней"])}</span>
                </div>
                <p>Дни с хотя бы одним выполнением</p>
              </div>
            </div>
          </div>
          <section className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <h2>Выполнения по дням</h2>
                <p>Количество выполненных привычек</p>
              </div>
              <span className="chart-legend">
                <i />
                Выполнено
              </span>
            </div>
            <div
              className="bar-chart"
              role="img"
              aria-label={`Выполнения по дням за ${monthTitle(month)}. ${activeDays} активных дней.`}
            >
              <div className="chart-y-axis">
                <span>{habits.length}</span>
                <span>{Math.floor(habits.length / 2)}</span>
                <span>0</span>
              </div>
              <div className="chart-bars">
                {days.map((day, i) => {
                  const count =
                    day <= today
                      ? habits.filter((h) => h.completions.includes(day)).length
                      : 0;
                  return (
                    <div
                      className={`chart-bar-column ${day === today ? "current" : ""}`}
                      key={day}
                      title={`${fullDate(day)}: ${count} выполнений`}
                    >
                      <div className="bar-space">
                        <div
                          className="chart-bar"
                          style={{
                            height: `${(count / Math.max(1, habits.length)) * 100}%`,
                            minHeight: count ? 5 : 0,
                          }}
                        >
                          <span>{count}</span>
                        </div>
                      </div>
                      <span>
                        {i === 0 || (i + 1) % 5 === 0 || i === days.length - 1
                          ? i + 1
                          : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
          <div className="stats-bottom-grid">
            <section className="panel ranking-panel">
              <div className="panel-heading">
                <h2>По привычкам</h2>
                <span className="muted">Последние 30 дней</span>
              </div>
              {[...habits]
                .sort(
                  (a, b) =>
                    habitStats(b, today).rate - habitStats(a, today).rate,
                )
                .map((habit) => {
                  const h = habitStats(habit, today);
                  return (
                    <button
                      className="ranking-row"
                      key={habit.id}
                      style={styleColor(habit.color)}
                      onClick={() => onOpen(habit.id)}
                    >
                      <span className="habit-icon">{habit.icon}</span>
                      <span className="ranking-content">
                        <strong>{habit.name}</strong>
                        <span className="progress-track">
                          <span
                            style={{
                              width: `${h.rate}%`,
                              background: habit.color,
                            }}
                          />
                        </span>
                      </span>
                      <span className="ranking-rate">
                        {Math.round(h.rate)}%
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  );
                })}
            </section>
            <section className="panel weekday-panel">
              <div className="panel-heading">
                <h2>По дням недели</h2>
              </div>
              <p>Регулярность по дням недели за месяц</p>
              {weekdayRates.map(({ weekday, rate }) => (
                <div className="weekday-bar" key={weekday}>
                  <span>{WEEK_LABELS[weekday]}</span>
                  <div className="progress-track">
                    <span style={{ width: `${rate}%` }} />
                  </div>
                  <strong>{rate}%</strong>
                </div>
              ))}
            </section>
          </div>
          <div className="stats-note">
            <Flame size={20} />
            <span>
              Ваша лучшая серия за всё время —{" "}
              <strong>{daysText(overall.bestStreak)}</strong>.
            </span>
          </div>
        </>
      )}
    </>
  );
}

export default App;
