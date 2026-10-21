import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Flame,
  Flower2,
  LayoutGrid,
  Leaf,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
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
  toggleCompletion,
  validateAppData,
  weekDates,
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
const shortDate = (key: string) =>
  parseDate(key)
    .toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    .replace(".", "");
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

function SproutArt() {
  return (
    <svg
      className="sprout-art"
      width="170"
      height="150"
      viewBox="0 0 170 150"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="85" cy="136" rx="51" ry="7" fill="#d9dfcd" />
      <path
        d="M86 129C85 96 82 62 98 25"
        stroke="#496848"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M86 103C53 104 35 84 38 65C64 62 84 77 86 103Z" fill="#91ab78" />
      <path
        d="M87 78C112 77 135 54 128 36C103 36 88 52 87 78Z"
        fill="#5c8058"
      />
      <path d="M91 53C72 49 61 33 65 19C84 21 95 34 91 53Z" fill="#b3c593" />
      <path
        d="M45 72L85 103M121 43L87 78M70 26L91 53"
        stroke="#f3f5e7"
        strokeWidth="1"
        opacity=".65"
      />
      <path d="M65 117H106L101 139H70L65 117Z" fill="#e6d9bd" />
      <path d="M62 116H109V122H62V116Z" fill="#d5c4a2" />
      <circle cx="135" cy="91" r="2.5" fill="#9ba97c" />
      <path
        d="M37 33V41M33 37H41M131 13V21M127 17H135"
        stroke="#a2af8e"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
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
  const [mobileNav, setMobileNav] = useState(false);
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
      setMobileNav(false);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigate(next: Page) {
    setPage(next);
    location.hash = next;
    setMobileNav(false);
    setSearch("");
    setSearchOpen(false);
  }
  function toggle(id: string, key: string) {
    setData((old) => ({
      ...old,
      habits: old.habits.map((h) =>
        h.id === id ? toggleCompletion(h, key) : h,
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
    setToast(
      exists ? "Изменения сохранены" : "Новая привычка — новый маленький шаг",
    );
  }
  function clearAll() {
    setConfirm({
      title: data.demo ? "Начнём вашу историю?" : "Удалить все данные?",
      text: data.demo
        ? "Все привычки и отметки, включая пример и внесённые вами изменения, будут удалены. После этого можно добавить свои привычки."
        : "Все привычки и отметки будут удалены с этого устройства. Перед удалением можно сохранить экспорт в настройках.",
      label: data.demo ? "Начать с чистого листа" : "Удалить данные",
      action: () => {
        setData((old) => ({ ...createEmptyData(), settings: old.settings }));
        setStorageBlocked(false);
        setStorageError("");
        setDetailId(null);
        setConfirm(null);
        setToast("Готово. Впереди ваша новая история");
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
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside className={`sidebar ${mobileNav ? "is-open" : ""}`}>
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
        <div className="sidebar-caption">ПРОСТРАНСТВО ДЛЯ РОСТА</div>
        <nav className="main-nav" aria-label="Основная навигация">
          <button
            className={page === "habits" ? "active" : ""}
            onClick={() => navigate("habits")}
          >
            <LayoutGrid size={19} />
            <span>Мои привычки</span>
            <span className="nav-count">{data.habits.length}</span>
          </button>
          <button
            className={page === "stats" ? "active" : ""}
            onClick={() => navigate("stats")}
          >
            <BarChart3 size={19} />
            <span>Статистика</span>
          </button>
          <button
            className={page === "settings" ? "active" : ""}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={19} />
            <span>Настройки</span>
          </button>
        </nav>
        <div className="sidebar-growth">
          <SproutArt />
          <h3>Растите в своём ритме</h3>
          <p>
            Даже маленький шаг —<br />
            это движение вперёд.
          </p>
          <span className="growth-line" />
        </div>
        <div className="sidebar-bottom">
          <span className="local-avatar">
            <Leaf size={18} />
          </span>
          <div>
            <strong>Моё пространство</strong>
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
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileNav(true)}
              aria-label="Открыть меню"
            >
              <Menu size={21} />
            </button>
            <Sun size={18} />
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
            <span className="today-pill">
              <span />
              Сегодня — хороший день
            </span>
            <button
              className="profile-button"
              aria-label="Настройки приложения"
              onClick={() => navigate("settings")}
            >
              Я
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
                  <div className="eyebrow">
                    <span />
                    КАЖДЫЙ ДЕНЬ ИМЕЕТ ЗНАЧЕНИЕ
                  </div>
                  <h1>
                    Маленькие шаги,
                    <br className="mobile-break" /> большие перемены
                    <span>.</span>
                  </h1>
                  <p>Место, где хорошие намерения становятся привычками.</p>
                </div>
                <button
                  className="button button-primary new-habit-button"
                  onClick={() => setForm("new")}
                >
                  <Plus size={18} />
                  Новая привычка
                </button>
              </section>
              {data.demo && (
                <div className="demo-banner">
                  <span>
                    <Sparkles size={16} />
                    <strong>Немного вдохновения</strong>
                    <span>Это пример вашего будущего прогресса.</span>
                  </span>
                  <button onClick={clearAll}>
                    Начать с чистого листа <ArrowRight size={15} />
                  </button>
                </div>
              )}
              <section className="summary-grid" aria-label="Краткая статистика">
                <div className="summary-card today-card">
                  <div>
                    <span className="summary-label">
                      Сегодня выполнено <CheckCheck size={16} />
                    </span>
                    <div className="summary-value">
                      {stats.todayDone}
                      <span> / {stats.todayTotal}</span>
                    </div>
                    <p>
                      {stats.todayTotal > 0 &&
                      stats.todayDone === stats.todayTotal
                        ? "Всё получилось. Вы молодец!"
                        : stats.todayDone > 0
                          ? "Отличное начало. Продолжайте!"
                          : "Ваш следующий шаг — прямо здесь"}
                    </p>
                  </div>
                  <div
                    className="donut"
                    style={
                      {
                        "--progress": `${stats.todayTotal ? (stats.todayDone / stats.todayTotal) * 100 : 0}%`,
                      } as CSSProperties
                    }
                  >
                    <span>
                      {stats.todayTotal
                        ? Math.round((stats.todayDone / stats.todayTotal) * 100)
                        : 0}
                      <small>%</small>
                    </span>
                  </div>
                </div>
                <div className="summary-card">
                  <div>
                    <span className="summary-label">
                      Лучшая серия <Flame size={16} />
                    </span>
                    <div className="summary-value">
                      {stats.bestStreak}
                      <span>
                        {" "}
                        {plural(stats.bestStreak, ["день", "дня", "дней"])}
                      </span>
                    </div>
                    <p>Ваша последовательность вдохновляет</p>
                  </div>
                  <div className="stat-art streak-art">
                    <Flame size={36} strokeWidth={1.4} />
                    <span className="spark spark-one">✦</span>
                    <span className="spark spark-two">✦</span>
                  </div>
                </div>
                <div className="summary-card">
                  <div>
                    <span className="summary-label">
                      Всего выполнений <TrendingUp size={16} />
                    </span>
                    <div className="summary-value">
                      {stats.total}
                      <span>
                        {" "}
                        {plural(stats.total, ["шаг", "шага", "шагов"])}
                      </span>
                    </div>
                    <p>Каждое действие приближает к цели</p>
                  </div>
                  <div className="mini-bars" aria-hidden="true">
                    {[30, 45, 38, 62, 52, 75, 92].map((h, i) => (
                      <i key={i} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </section>
              <HabitList
                habits={data.habits}
                search={search}
                today={today}
                weekStartsOn={data.settings.weekStartsOn}
                onToggle={toggle}
                onOpen={setDetailId}
                onAdd={() => setForm("new")}
              />
              <section className="bottom-grid">
                <Activity
                  habits={data.habits}
                  today={today}
                  onStats={() => navigate("stats")}
                />
                <div className="quote-card">
                  <span className="quote-decoration">“</span>
                  <span className="quote-eyebrow">
                    <Flower2 size={17} />
                    МЫСЛЬ НА СЕГОДНЯ
                  </span>
                  <blockquote>
                    Вам не нужно быть идеальными.
                    <br />
                    Достаточно быть постоянными.
                  </blockquote>
                  <p>Возвращайтесь к тому, что важно для вас.</p>
                  <Flower2
                    className="quote-flower"
                    size={150}
                    strokeWidth={0.7}
                    aria-hidden="true"
                  />
                </div>
              </section>
              <div className="page-footnote">
                <Leaf size={13} />
                Не гонитесь за идеалом. Найдите свой ритм.
              </div>
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
                  <div className="eyebrow">ПРОСТРАНСТВО ПОД ВАС</div>
                  <h1>
                    Настройки<span>.</span>
                  </h1>
                  <p>Пусть всё работает в вашем ритме.</p>
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
                      <p>Выберите комфортное оформление.</p>
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
                  <h2>Новый старт</h2>
                  <div className="setting-row">
                    <div>
                      <h3>
                        {data.demo ? "Очистить пример" : "Удалить все данные"}
                      </h3>
                      <p>
                        {data.demo
                          ? "Начните собственную историю с пустого списка."
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
                    <p>Маленькие действия. Большие перемены.</p>
                    <span>
                      Версия 1.0 · Сделано для вашего спокойного роста
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
      {detail && !form && !confirm && (
        <HabitDetail
          habit={detail}
          today={today}
          weekStartsOn={data.settings.weekStartsOn}
          onClose={() => setDetailId(null)}
          onToggle={(key) => toggle(detail.id, key)}
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

function HabitList({
  habits,
  search,
  today,
  weekStartsOn,
  onToggle,
  onOpen,
  onAdd,
}: {
  habits: Habit[];
  search: string;
  today: string;
  weekStartsOn: 0 | 1;
  onToggle: (id: string, key: string) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<"week" | "today">("week");
  const [category, setCategory] = useState("all");
  const week = weekDates(addDays(today, weekOffset * 7), weekStartsOn);
  const dates = view === "week" ? week : [today];
  const filtered = habits.filter(
    (h) =>
      (category === "all" || h.category === category) &&
      h.name.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru")),
  );
  return (
    <section className="panel habits-panel">
      <div className="panel-heading">
        <div className="heading-with-count">
          <h2>Мои привычки</h2>
          <span>{habits.length}</span>
        </div>
        <div className="segmented-control" aria-label="Вид списка">
          <button
            className={view === "week" ? "selected" : ""}
            aria-pressed={view === "week"}
            onClick={() => setView("week")}
          >
            <CalendarDays size={15} />
            Неделя
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
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Фильтр привычек по категории"
        >
          <option value="all">Все привычки</option>
          {[...new Set(habits.map((h) => h.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {view === "week" ? (
          <div className="week-navigation">
            <button
              className="icon-button"
              onClick={() => setWeekOffset((n) => n - 1)}
              aria-label="Предыдущая неделя"
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              {shortDate(week[0])} — {shortDate(week[6])}
              {parseDate(week[0]).getFullYear() !==
              parseDate(today).getFullYear()
                ? ` ${parseDate(week[0]).getFullYear()}`
                : ""}
            </span>
            <button
              className="icon-button"
              onClick={() => setWeekOffset((n) => n + 1)}
              aria-label="Следующая неделя"
            >
              <ChevronRight size={17} />
            </button>
            {weekOffset !== 0 && (
              <button className="text-button" onClick={() => setWeekOffset(0)}>
                Текущая
              </button>
            )}
          </div>
        ) : (
          <span className="muted toolbar-hint">
            Ваши маленькие победы за сегодня
          </span>
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
          <div className="habit-table-header">
            <span>ПРИВЫЧКА</span>
            <div className="week-cells">
              {dates.map((day) => (
                <div key={day} className={day === today ? "current-day" : ""}>
                  <span>{WEEK_LABELS[parseDate(day).getDay()]}</span>
                  <strong>{parseDate(day).getDate()}</strong>
                </div>
              ))}
            </div>
            <span className="streak-heading">СЕРИЯ</span>
          </div>
          {filtered.map((habit) => {
            const current = habitStats(habit, today);
            return (
              <div
                className="habit-row"
                key={habit.id}
                style={styleColor(habit.color)}
              >
                <button
                  className="habit-name-button"
                  onClick={() => onOpen(habit.id)}
                >
                  <span className="habit-icon">{habit.icon}</span>
                  <span className="habit-name">
                    <strong>{habit.name}</strong>
                    <span>
                      <i />
                      {habit.category}
                      <span className="name-divider">·</span>
                      {frequency(habit)}
                    </span>
                  </span>
                  <ChevronRight size={15} className="habit-name-arrow" />
                </button>
                <div className="week-cells">
                  {dates.map((day) => {
                    const done = habit.completions.includes(day);
                    return (
                      <div
                        key={day}
                        data-day={`${WEEK_LABELS[parseDate(day).getDay()]} ${parseDate(day).getDate()}`}
                        className={day === today ? "today-column" : ""}
                      >
                        <button
                          className={`completion-button ${done ? "done" : ""} ${!isScheduled(habit, day) ? "unscheduled" : ""} ${day > today ? "future" : ""}`}
                          aria-label={`${habit.name}, ${fullDate(day)}: ${done ? "выполнено, отменить" : "отметить выполнение"}`}
                          aria-pressed={done}
                          title={`${fullDate(day)}${!isScheduled(habit, day) ? " · вне расписания" : ""}`}
                          onClick={() => onToggle(habit.id, day)}
                        >
                          {done ? (
                            <Check size={17} strokeWidth={2.4} />
                          ) : !isScheduled(habit, day) ? (
                            <span className="off-day">–</span>
                          ) : (
                            <span className="empty-check" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  className={`row-streak ${current.currentStreak > 0 ? "has-streak" : ""}`}
                  onClick={() => onOpen(habit.id)}
                  aria-label={`Статистика ${habit.name}: серия ${daysText(current.currentStreak)}`}
                >
                  <Flame size={16} />
                  <span>{current.currentStreak}</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            );
          })}
          <button className="add-habit-row" onClick={onAdd}>
            <span>
              <Plus size={17} />
            </span>
            Добавить ещё одну привычку
          </button>
        </div>
      )}
      <div className="table-footnote">
        <span>
          <span className="legend-dot" />
          Один клик — один шаг вперёд
        </span>
        <span>
          Нажмите на привычку, чтобы открыть календарь{" "}
          <ArrowUpRight size={13} />
        </span>
      </div>
    </section>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <span className="empty-illustration">
        <Leaf size={34} />
      </span>
      <h3>Всё начинается с маленького шага</h3>
      <p>
        Стакан воды, несколько страниц или прогулка.
        <br />
        Какой будет ваша первая привычка?
      </p>
      <button className="button button-primary" onClick={onAdd}>
        <Plus size={17} />
        Создать привычку
      </button>
    </div>
  );
}

function Activity({
  habits,
  today,
  onStats,
}: {
  habits: Habit[];
  today: string;
  onStats: () => void;
}) {
  const start = addDays(weekDates(today, 1)[0], -84);
  const days = Array.from({ length: 91 }, (_, i) => addDays(start, i));
  const active = days.filter(
    (d) => d <= today && habits.some((h) => h.completions.includes(d)),
  ).length;
  return (
    <div className="panel activity-panel">
      <div className="panel-heading">
        <h2>Ваш ритм</h2>
        <button className="text-button" onClick={onStats}>
          Статистика <ArrowUpRight size={14} />
        </button>
      </div>
      <p className="activity-description">
        <strong>
          {active}{" "}
          {plural(active, ["активный день", "активных дня", "активных дней"])}
        </strong>{" "}
        за последние 13 недель
      </p>
      <div className="heatmap-wrap">
        <div className="heatmap-week-labels">
          <span>Пн</span>
          <span>Ср</span>
          <span>Пт</span>
        </div>
        <div className="heatmap">
          {days.map((day) => {
            const count =
              day <= today
                ? habits.filter((h) => h.completions.includes(day)).length
                : 0;
            const intensity = count
              ? Math.min(4, Math.ceil((count / Math.max(1, habits.length)) * 4))
              : 0;
            return (
              <span
                key={day}
                className={`heat-cell heat-${intensity}`}
                title={`${fullDate(day)}: ${count} выполнений`}
                aria-label={`${fullDate(day)}: ${count} выполнений`}
              />
            );
          })}
        </div>
      </div>
      <div className="heatmap-footer">
        <span>
          {shortDate(days[0])} — {shortDate(today)}
        </span>
        <div>
          Меньше
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n} className={`heat-cell heat-${n}`} />
          ))}
          Больше
        </div>
      </div>
    </div>
  );
}

function HabitDetail({
  habit,
  today,
  weekStartsOn,
  onClose,
  onToggle,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  today: string;
  weekStartsOn: 0 | 1;
  onClose: () => void;
  onToggle: (key: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [month, setMonth] = useState(() => parseDate(today));
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
                  aria-label={`${fullDate(day)}: ${done ? "выполнено, отменить" : "отметить выполнение"}`}
                  aria-pressed={done}
                  onClick={() => onToggle(day)}
                >
                  <span>{parseDate(day).getDate()}</span>
                  {done && <Check size={12} />}
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
          Нажмите на любой день, чтобы добавить или отменить отметку. Будущие
          отметки учитываются в статистике с наступлением этой даты.
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
              style={{ width: `${monthStats.rate}%`, background: habit.color }}
            />
          </div>
          <span>{Math.round(monthStats.rate)}% — ваш прогресс на сегодня</span>
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
          <div className="eyebrow">ВАШИ УСИЛИЯ ИМЕЮТ ЗНАЧЕНИЕ</div>
          <h1>
            Прогресс в деталях<span>.</span>
          </h1>
          <p>Посмотрите, как маленькие действия меняют вашу жизнь.</p>
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
                <p>Хотя бы один шаг навстречу себе</p>
              </div>
            </div>
          </div>
          <section className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <h2>День за днём</h2>
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
                <h2>Привычки в фокусе</h2>
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
                <h2>Ваши сильные дни</h2>
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
              <strong>{daysText(overall.bestStreak)}</strong>. Каждый новый день
              — возможность продолжить.
            </span>
          </div>
        </>
      )}
    </>
  );
}

export default App;
