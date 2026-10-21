import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Check } from "lucide-react";
import type { Habit } from "../lib/habits";
import { dateKey } from "../lib/habits";
import Modal from "./Modal";

type HabitFormProps = {
  habit?: Habit;
  onSave: (habit: Habit) => void;
  onClose: () => void;
};

const emojis = ["🌿", "📖", "💧", "🧘", "🏃", "☀️", "🎨", "💪", "🌙", "🚶"];
const colors = [
  "#719b82",
  "#89a1c4",
  "#c6a66e",
  "#ad8fba",
  "#ce8d78",
  "#8197a1",
];
const categories = [
  "Здоровье",
  "Развитие",
  "Осознанность",
  "Движение",
  "Личное",
];
const weekdays = [
  { value: 1, short: "Пн", full: "Понедельник" },
  { value: 2, short: "Вт", full: "Вторник" },
  { value: 3, short: "Ср", full: "Среда" },
  { value: 4, short: "Чт", full: "Четверг" },
  { value: 5, short: "Пт", full: "Пятница" },
  { value: 6, short: "Сб", full: "Суббота" },
  { value: 0, short: "Вс", full: "Воскресенье" },
];

export default function HabitForm({ habit, onSave, onClose }: HabitFormProps) {
  const id = useId();
  const [name, setName] = useState(habit?.name ?? "");
  const [category, setCategory] = useState(habit?.category ?? "Личное");
  const [icon, setIcon] = useState(habit?.icon ?? "🌿");
  const [color, setColor] = useState(habit?.color ?? colors[0]);
  const [days, setDays] = useState(habit?.weekdays ?? [1, 2, 3, 4, 5, 6, 0]);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Введите название привычки.");
      document.getElementById(`${id}-name`)?.focus();
      return;
    }
    if (days.length === 0) {
      setError("Выберите хотя бы один день недели.");
      return;
    }
    onSave({
      id: habit?.id ?? crypto.randomUUID(),
      name: name.trim(),
      category,
      icon,
      color,
      weekdays: [...days],
      createdAt: habit?.createdAt ?? dateKey(),
      completions: habit?.completions ?? [],
    });
  }

  function toggleDay(day: number) {
    setDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day],
    );
    setError("");
  }

  return (
    <Modal
      title={habit ? "Редактировать привычку" : "Новая привычка"}
      onClose={onClose}
    >
      <p className="muted">
        Маленькое действие, которое станет частью вашего дня.
      </p>
      <form onSubmit={submit}>
        <div className="form-field">
          <label className="form-label" htmlFor={`${id}-name`}>
            Название привычки
          </label>
          <input
            id={`${id}-name`}
            className="text-input"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="Например, читать 20 минут"
            maxLength={80}
            required
            data-modal-autofocus
            autoComplete="off"
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor={`${id}-category`}>
            Категория
          </label>
          <select
            id={`${id}-category`}
            className="select-input"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {!categories.includes(category) && (
              <option value={category}>{category}</option>
            )}
            {categories.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div
          className="form-field"
          role="group"
          aria-labelledby={`${id}-icon-label`}
        >
          <span className="form-label" id={`${id}-icon-label`}>
            Значок
          </span>
          <div className="choice-row">
            {emojis.map((emoji) => (
              <button
                type="button"
                key={emoji}
                className={`emoji-choice${icon === emoji ? " selected" : ""}`}
                aria-label={`Значок ${emoji}`}
                aria-pressed={icon === emoji}
                onClick={() => setIcon(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div
          className="form-field"
          role="group"
          aria-labelledby={`${id}-color-label`}
        >
          <span className="form-label" id={`${id}-color-label`}>
            Цвет привычки
          </span>
          <div className="choice-row">
            {colors.map((value, index) => (
              <button
                type="button"
                key={value}
                className={`color-choice${color === value ? " selected" : ""}`}
                style={{ backgroundColor: value }}
                aria-label={
                  [
                    "Зелёный",
                    "Голубой",
                    "Песочный",
                    "Сиреневый",
                    "Коралловый",
                    "Серо-голубой",
                  ][index]
                }
                aria-pressed={color === value}
                onClick={() => setColor(value)}
              >
                {color === value && <Check size={18} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>

        <div
          className="form-field"
          role="group"
          aria-labelledby={`${id}-days-label`}
        >
          <span className="form-label" id={`${id}-days-label`}>
            Повторять
          </span>
          <div className="choice-row">
            {weekdays.map((day) => (
              <button
                type="button"
                key={day.value}
                className={`weekday-choice${days.includes(day.value) ? " selected" : ""}`}
                aria-label={day.full}
                aria-pressed={days.includes(day.value)}
                onClick={() => toggleDay(day.value)}
              >
                {day.short}
              </button>
            ))}
          </div>
          <small className="muted">
            {days.length === 7
              ? "Каждый день — в своём ритме"
              : "Отмечайте выполнение в выбранные дни"}
          </small>
        </div>

        <div
          className="habit-preview"
          style={{ backgroundColor: `${color}18` }}
        >
          <span aria-hidden="true">{icon}</span>
          <span>{name.trim() || "Ваша новая привычка"}</span>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Отмена
          </button>
          <button type="submit" className="button button-primary">
            {habit ? "Сохранить" : "Создать привычку"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
