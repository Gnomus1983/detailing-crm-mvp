import { createClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  addLeadNoteRecord,
  createLeadEvent,
  createLeadRecord,
  createOrReuseClient,
  sendAutomationWebhook,
  submitPublicLead,
  updateLeadFollowUpRecord,
  updateLeadStatusRecord
} from "./crm";
import detailLogo from "./detailLogo";
import { supabase } from "./supabase";

const navItems = [
  { to: "/dashboard", label: "Панель" },
  { to: "/leads", label: "Заявки" },
  { to: "/clients", label: "Клиенты" },
  { to: "/tasks", label: "Задачи" },
  { to: "/settings", label: "Настройки" }
];

const roleLabels = {
  owner: "Директор",
  manager: "Менеджер",
  detailer: "Мастер"
};

const roleOptions = ["owner", "manager", "detailer"];

const rolePermissions = {
  owner: {
    nav: ["/dashboard", "/leads", "/clients", "/tasks", "/settings"],
    canCreateLead: true,
    canEditLead: true
  },
  manager: {
    nav: ["/dashboard", "/leads", "/clients", "/tasks"],
    canCreateLead: true,
    canEditLead: true
  },
  detailer: {
    nav: ["/dashboard", "/leads", "/tasks"],
    canCreateLead: false,
    canEditLead: false
  }
};

const statusOptions = ["new", "contacted", "quoted", "scheduled", "in_progress", "done", "lost"];
const sourceOptions = ["manual", "landing", "instagram", "telegram", "whatsapp", "phone", "facebook", "other"];
const clientTabs = ["history", "leads", "notes"];
const settingsSections = ["profile", "team", "billing", "integrations", "security"];
const demoServicePresets = [
  { name: "Spalare exterioara", base_price: 600, duration_minutes: 60 },
  { name: "Curatare salon", base_price: 1200, duration_minutes: 180 },
  { name: "Spalare detaliata", base_price: 800, duration_minutes: 90 },
  { name: "Detailing interior", base_price: 1800, duration_minutes: 180 },
  { name: "Polizare completa", base_price: 2800, duration_minutes: 300 },
  { name: "Detailing complet", base_price: 4200, duration_minutes: 360 },
  { name: "Ceramica", base_price: 4500, duration_minutes: 360 },
  { name: "Polizare + Ceramica", base_price: 6000, duration_minutes: 480 },
  { name: "Consultatie coating ceramic", base_price: 300, duration_minutes: 30 }
];

const statusLabels = {
  new: "Новая",
  contacted: "Связались",
  quoted: "Предложение",
  scheduled: "Запланировано",
  in_progress: "В работе",
  done: "Готово",
  lost: "Отменено"
};

const statusGroupLabels = {
  new: "Новые",
  in_progress: "В работе",
  done: "Готово",
  lost: "Отменено"
};

const eventLabels = {
  created: "Заявка создана",
  status_changed: "Статус изменён",
  note_added: "Добавлена заметка",
  follow_up_set: "Follow-up обновлён",
  assigned: "Назначено",
  price_updated: "Обновлена сумма",
  reminder_sent: "Отправлено напоминание"
};

const sourceLabels = {
  manual: "Вручную",
  landing: "Лендинг",
  instagram: "Instagram",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  phone: "Телефон",
  facebook: "Facebook",
  other: "Другое"
};

const settingsSectionLabels = {
  profile: "Профиль",
  team: "Команда",
  billing: "Тарифы",
  integrations: "Интеграции",
  security: "Безопасность"
};

function formatCurrency(value) {
  if (value == null || value === "") {
    return "0 MDL";
  }

  return new Intl.NumberFormat("ro-MD", {
    style: "currency",
    currency: "MDL",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function formatDate(value) {
  if (!value) {
    return "Не задано";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatShortDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short"
  }).format(new Date(value));
}

function formatDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatLabel(value) {
  if (!value) {
    return "Не задано";
  }

  if (sourceLabels[value]) {
    return sourceLabels[value];
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePhone(value) {
  return (value || "").replace(/[^\d+]/g, "");
}

function getWhatsAppUrl(phone) {
  const digits = normalizePhone(phone).replace(/^\+/, "");
  return digits ? `https://wa.me/${digits}` : "#";
}

function createInviteSupabaseClient() {
  return createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

function formatPreferredSlot(dateValue, timeValue) {
  if (!dateValue) {
    return "Не согласовано";
  }

  const formattedDate = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium"
  }).format(new Date(`${dateValue}T00:00:00`));

  return `${formattedDate}${timeValue ? `, ${timeValue}` : ""}`;
}

function getRolePermissions(role) {
  return rolePermissions[role] || rolePermissions.manager;
}

function getRoleAccessSummary(role) {
  if (role === "owner") {
    return "Полный доступ к CRM, команде, настройкам и автоматизациям.";
  }

  if (role === "detailer") {
    return "Видит только назначенные заявки и рабочую историю клиента.";
  }

  return "Управляет заявками, клиентами и задачами без доступа к системным настройкам.";
}

function getInitialLeadForm(services) {
  return {
    client_name: "",
    phone: "",
    email: "",
    car_make: "",
    car_model: "",
    car_year: "",
    car_plate: "",
    service_id: services[0]?.id || "",
    source: "manual",
    address: "",
    comment: "",
    preferred_date: "",
    preferred_time: "",
    estimated_price: "",
    follow_up_at: ""
  };
}

function getInitials(value) {
  if (!value) {
    return "DM";
  }

  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getLeadStageKey(status) {
  if (status === "new") {
    return "new";
  }

  if (status === "done") {
    return "done";
  }

  if (status === "lost") {
    return "lost";
  }

  return "in_progress";
}

function isStageHighlighted(stageKey) {
  return stageKey === "in_progress";
}

function Avatar({ name, large = false }) {
  return (
    <span className={large ? "avatar avatar-large" : "avatar"}>
      {getInitials(name)}
    </span>
  );
}

function StatusBadge({ status }) {
  const group = getLeadStageKey(status);
  return (
    <span className={`status-badge status-group-${group}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function MiniIcon({ label, accent = false }) {
  return <span className={accent ? "mini-icon accent" : "mini-icon"}>{label}</span>;
}

function LogoWordmark({ inverse = false }) {
  return (
    <div className={inverse ? "logo-wordmark inverse" : "logo-wordmark"}>
      <img src={detailLogo} alt="DETAIL CRM" className="logo-mark" />
      <div className="logo-copy">
        <strong>DETAIL CRM</strong>
      </div>
    </div>
  );
}

function LoginPage({ onAuthenticated }) {
  const [mode, setMode] = useState("sign-in");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "sign-up") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });

        if (signUpError) {
          throw signUpError;
        }

        setMessage("Аккаунт создан. Если у проекта включено подтверждение почты, подтвердите email и затем войдите.");
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          throw signInError;
        }

        onAuthenticated(data.session);
      }
    } catch (submitError) {
      setError(submitError.message || "Не удалось войти в систему.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-split">
        <section className="auth-main-card">
          <LogoWordmark />

          <div className="auth-copy">
            <h1>Вход в систему</h1>
            <p>Управляйте заявками, клиентами и follow-up без лишней перегрузки.</p>
          </div>

          <div className="auth-switch">
            <button type="button" className={mode === "sign-in" ? "active" : ""} onClick={() => setMode("sign-in")}>
              Вход
            </button>
            <button type="button" className={mode === "sign-up" ? "active" : ""} onClick={() => setMode("sign-up")}>
              Регистрация
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <label>
                Имя
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Имя владельца или менеджера"
                  required
                />
              </label>
            ) : null}

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Пароль
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Минимум 6 символов"
                required
              />
            </label>

            <button type="submit" className="button button-primary button-full" disabled={loading}>
              {loading ? "Выполняется вход..." : mode === "sign-up" ? "Создать аккаунт" : "Войти"}
            </button>
          </form>

          <div className="auth-divider">
            <span>или</span>
          </div>

          <button type="button" className="button button-outline button-full" disabled>
            Продолжить через Google
          </button>

          {message ? <p className="status-note success">{message}</p> : null}
          {error ? <p className="status-note error">{error}</p> : null}
        </section>

        <aside className="auth-side-card">
          <div className="auth-side-top">
            <LogoWordmark inverse />
          </div>
          <div className="auth-side-quote">
            <p>
              “Система наконец-то собрала заявки, follow-up и команду в одном месте. Стало понятно, кто ведёт клиента и что делать дальше.”
            </p>
            <span>Юрий, владелец детейлинг-центра</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PublicRequestPage({ isAuthenticated }) {
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState({
    client_name: "",
    phone: "",
    email: "",
    service_id: "",
    car_make: "",
    car_model: "",
    car_year: "",
    car_plate: "",
    source: "landing",
    address: "",
    comment: "",
    preferred_date: "",
    preferred_time: "",
    estimated_price: "",
    follow_up_at: "",
    website: ""
  });
  const automationWebhookUrl = import.meta.env.VITE_AUTOMATION_WEBHOOK_URL || import.meta.env.VITE_N8N_WEBHOOK_URL;
  const showcaseImage =
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80";

  useEffect(() => {
    let active = true;

    async function loadServices() {
      setLoadingServices(true);
      const { data, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (!active) {
        return;
      }

      if (servicesError) {
        setError(servicesError.message || "Не удалось загрузить услуги.");
      } else {
        setServices(data || []);
        setForm((current) => ({
          ...current,
          service_id: current.service_id || data?.[0]?.id || ""
        }));
      }

      setLoadingServices(false);
    }

    loadServices();

    return () => {
      active = false;
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const result = await submitPublicLead(supabase, form);

      try {
        await sendAutomationWebhook(automationWebhookUrl, {
          event: "lead_created",
          public_entry: true,
          lead: result,
          intake: {
            client_name: form.client_name.trim(),
            phone: form.phone.trim(),
            source: form.source,
            service_id: form.service_id || null
          }
        });
      } catch (webhookError) {
        setError(webhookError.message || "Заявка создана, но внешний webhook автоматизации не отработал.");
      }

      setSuccessMessage("Заявка успешно отправлена. Менеджер уже может обработать её в CRM.");
      setForm({
        client_name: "",
        phone: "",
        email: "",
        service_id: services[0]?.id || "",
        car_make: "",
        car_model: "",
        car_year: "",
        car_plate: "",
        source: "landing",
        address: "",
        comment: "",
        preferred_date: "",
        preferred_time: "",
        estimated_price: "",
        follow_up_at: "",
        website: ""
      });
    } catch (submitError) {
      setError(submitError.message || "Не удалось отправить заявку.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="public-shell">
      <section className="public-landing-card">
        <div className="public-copy-column">
          <LogoWordmark />
          <span className="eyebrow">Онлайн-заявка</span>
          <h1>Запишитесь на детейлинг без звонков и ожидания.</h1>
          <p>
            Оставьте контакт, услугу и удобный слот. CRM сразу создаст карточку клиента, заявку и follow-up для команды.
          </p>
          <div className="public-pill-row">
            <span>Быстрый контакт</span>
            <span>CRM-синхронизация</span>
            <span>Автономный follow-up</span>
          </div>
          {isAuthenticated ? <p className="public-auth-hint">Вы уже вошли в CRM и увидите новую заявку сразу после отправки.</p> : null}
        </div>

        <div className="public-form-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">Форма клиента</span>
              <h2>Новая заявка</h2>
            </div>
          </div>

          {loadingServices ? <p className="hint-text">Загружаем доступные услуги...</p> : null}
          {error ? <div className="notice notice-error">{error}</div> : null}
          {successMessage ? <div className="notice notice-success">{successMessage}</div> : null}

          <form className="form-grid-shell" onSubmit={handleSubmit}>
            <div className="form-grid two-columns">
              <label>
                Имя
                <input name="client_name" value={form.client_name} onChange={updateField} placeholder="Victor Sandu" required />
              </label>
              <label>
                Телефон
                <input name="phone" value={form.phone} onChange={updateField} placeholder="+373..." required />
              </label>
              <label>
                Услуга
                <select name="service_id" value={form.service_id} onChange={updateField} disabled={loadingServices}>
                  <option value="">Выберите услугу</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Марка
                <input name="car_make" value={form.car_make} onChange={updateField} placeholder="Audi" />
              </label>
              <label>
                Модель / год
                <div className="split-input">
                  <input name="car_model" value={form.car_model} onChange={updateField} placeholder="Q7" />
                  <input name="car_year" type="number" min="1950" max="2100" value={form.car_year} onChange={updateField} placeholder="2020" />
                </div>
              </label>
              <label>
                Номер авто
                <input name="car_plate" value={form.car_plate} onChange={updateField} placeholder="KCC777" />
              </label>
              <label>
                Желаемая дата
                <input name="preferred_date" type="date" value={form.preferred_date} onChange={updateField} />
              </label>
              <label>
                Желаемое время
                <input name="preferred_time" value={form.preferred_time} onChange={updateField} placeholder="После 18:00" />
              </label>
              <label>
                Адрес
              </label>
            </div>

            <label>
              Комментарий
              <textarea
                name="comment"
                value={form.comment}
                onChange={updateField}
                rows="4"
                placeholder="Опишите желаемую услугу, состояние авто и пожелания."
              />
            </label>

            <input
              type="text"
              name="website"
              value={form.website}
              onChange={updateField}
              tabIndex="-1"
              autoComplete="off"
              aria-hidden="true"
              className="honeypot-field"
            />

            <button type="submit" className="button button-primary" disabled={saving || loadingServices}>
              {saving ? "Отправляем..." : "Отправить заявку"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function TopBar({ session, role, permissions, onSignOut, currentUserName }) {
  const location = useLocation();
  const centerNavItems = navItems.filter((item) => item.to !== "/settings" && permissions.nav.includes(item.to));
  const fullName = currentUserName || session.user.user_metadata?.full_name || session.user.email;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <LogoWordmark />
      </div>

      <nav className="topbar-nav">
        {centerNavItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "topbar-link active" : "topbar-link")}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="topbar-actions">
        {permissions.canCreateLead ? (
          <NavLink to="/leads" className="button button-primary topbar-cta">
            Новая заявка
          </NavLink>
        ) : null}
        {permissions.nav.includes("/settings") ? (
          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? "button button-outline active-outline" : "button button-outline")}
          >
            Настройки
          </NavLink>
        ) : null}
        <div className="topbar-user">
          <div className="user-meta">
            <strong>{roleLabels[role] || roleLabels.manager}</strong>
            <span>{fullName}</span>
          </div>
          <Avatar name={fullName} />
          <button type="button" className="ghost-action" onClick={onSignOut}>
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}

function AppLayout({ session, metrics, role, children, onSignOut, currentUserName }) {
  const permissions = getRolePermissions(role);

  return (
    <div className="crm-shell">
      <TopBar
        session={session}
        role={role}
        permissions={permissions}
        onSignOut={onSignOut}
        currentUserName={currentUserName}
      />

      <main className="crm-main">
        <div className="crm-summary-bar">
          <span>{metrics.newCount} новых</span>
          <span>{metrics.openTasks} открытых задач</span>
          <span>{metrics.followUpCount} follow-up на сегодня</span>
        </div>
        {children}
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, accent = false }) {
  return (
    <article className={accent ? "metric-card accent" : "metric-card"}>
      <MiniIcon label={icon} accent={accent} />
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function DashboardPage({ metrics, leads, onOpenLead }) {
  return (
    <section className="page-stack">
      <div className="metrics-grid">
        <MetricCard icon="CL" label="Всего клиентов" value={metrics.clientsCount} accent />
        <MetricCard icon="TD" label="Заявки сегодня" value={metrics.todayLeads} />
        <MetricCard icon="€" label="Выручка месяц" value={formatCurrency(metrics.monthRevenue)} />
        <MetricCard icon="TK" label="Задачи открыты" value={metrics.openTasks} />
      </div>

      <section className="surface-card month-summary-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">Р¤РёРЅР°РЅСЃС‹</span>
            <h2>РС‚РѕРіРё РјРµСЃСЏС†Р°</h2>
          </div>
        </div>

        <div className="month-summary-grid">
          <article className="month-summary-stat">
            <strong>{metrics.monthClosedLeads}</strong>
            <span>Р—Р°РєСЂС‹С‚Рѕ Р·Р°СЏРІРѕРє</span>
          </article>
          <article className="month-summary-stat">
            <strong>{formatCurrency(metrics.monthAverageTicket)}</strong>
            <span>РЎСЂРµРґРЅРёР№ С‡РµРє</span>
          </article>
          <article className="month-summary-stat">
            <strong>{formatCurrency(metrics.monthRevenue)}</strong>
            <span>РљР°СЃСЃР° Р·Р° РјРµСЃСЏС†</span>
          </article>
        </div>

        <div className="data-table compact-table">
          <div className="table-head month-revenue-head">
            <span>РЈСЃР»СѓРіР°</span>
            <span>Р—Р°СЏРІРѕРє</span>
            <span>РЎСѓРјРјР°</span>
          </div>
          {metrics.monthServiceRevenue.length ? (
            metrics.monthServiceRevenue.map((item) => (
              <div key={item.name} className="table-body-row month-revenue-row">
                <span className="cell-strong">{item.name}</span>
                <span>{item.count}</span>
                <span className="amount-cell">{formatCurrency(item.total)}</span>
              </div>
            ))
          ) : (
            <div className="table-empty-state">Р’ СЌС‚РѕРј РјРµСЃСЏС†Рµ РїРѕРєР° РЅРµС‚ Р·Р°РєСЂС‹С‚С‹С… Р·Р°СЏРІРѕРє РґР»СЏ РєР°СЃСЃС‹.</div>
          )}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">Оперативная сводка</span>
            <h2>Последние заявки</h2>
          </div>
        </div>

        <div className="data-table">
          <div className="table-head">
            <span>Клиент</span>
            <span>Услуга</span>
            <span>Статус</span>
            <span>Дата</span>
            <span>Сумма</span>
            <span>Действие</span>
          </div>

          {leads.length ? (
            leads.slice(0, 6).map((lead) => (
              <div key={lead.id} className="table-body-row">
                <span className="cell-strong">{lead.clients?.name || "Без имени"}</span>
                <span>{lead.services?.name || "Не выбрана"}</span>
                <span>
                  <StatusBadge status={lead.status} />
                </span>
                <span>{formatShortDate(lead.created_at)}</span>
                <span className="amount-cell">{formatCurrency(lead.estimated_price)}</span>
                <span>
                  <NavLink to="/leads" className="table-link" onClick={() => onOpenLead(lead.id)}>
                    Открыть
                  </NavLink>
                </span>
              </div>
            ))
          ) : (
            <div className="table-empty-state">Пока нет заявок для отображения.</div>
          )}
        </div>
      </section>
    </section>
  );
}

function NewLeadForm({ services, onCreateLead, creatingLead }) {
  const [form, setForm] = useState(() => getInitialLeadForm(services));

  useEffect(() => {
    setForm((current) => ({
      ...current,
      service_id: current.service_id || services[0]?.id || ""
    }));
  }, [services]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const created = await onCreateLead(form);
    if (created) {
      setForm(getInitialLeadForm(services));
    }
  }

  return (
    <section className="surface-card">
      <div className="section-title">
        <div>
          <span className="eyebrow">Добавление</span>
          <h2>Новая заявка</h2>
        </div>
      </div>

      <form className="form-grid-shell" onSubmit={handleSubmit}>
        <div className="form-grid two-columns">
          <label>
            Имя клиента
            <input name="client_name" value={form.client_name} onChange={updateField} placeholder="Andrei Popa" required />
          </label>
          <label>
            Телефон
            <input name="phone" value={form.phone} onChange={updateField} placeholder="+373..." required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={updateField} placeholder="optional@email.com" />
          </label>
          <label>
            Услуга
            <select name="service_id" value={form.service_id} onChange={updateField}>
              <option value="">Без услуги</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Источник
            <select name="source" value={form.source} onChange={updateField}>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {formatLabel(source)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Сумма
            <input name="estimated_price" type="number" min="0" value={form.estimated_price} onChange={updateField} placeholder="120" />
          </label>
          <label>
            Дата
            <input name="preferred_date" type="date" value={form.preferred_date} onChange={updateField} />
          </label>
          <label>
            Время
            <input name="preferred_time" value={form.preferred_time} onChange={updateField} placeholder="После 18:00" />
          </label>
          <label>
            Follow-up
            <input name="follow_up_at" type="datetime-local" value={form.follow_up_at} onChange={updateField} />
          </label>
          <label>
            Номер авто
            <input name="car_plate" value={form.car_plate} onChange={updateField} placeholder="KAA123" />
          </label>
          <label>
            Марка
            <input name="car_make" value={form.car_make} onChange={updateField} placeholder="BMW" />
          </label>
          <label>
            Модель / год
            <div className="split-input">
              <input name="car_model" value={form.car_model} onChange={updateField} placeholder="X5" />
              <input name="car_year" type="number" min="1950" max="2100" value={form.car_year} onChange={updateField} placeholder="2019" />
            </div>
          </label>
        </div>

        <label>
          Адрес
          <input name="address" value={form.address} onChange={updateField} placeholder="Botanica, Chisinau" />
        </label>

        <label>
          Комментарий
          <textarea name="comment" value={form.comment} onChange={updateField} rows="4" placeholder="Что попросил клиент, срочность, ожидания..." />
        </label>

        <button type="submit" className="button button-primary" disabled={creatingLead}>
          {creatingLead ? "Создаём..." : "Добавить заявку"}
        </button>
      </form>
    </section>
  );
}

function LeadCard({ lead, isActive, onClick }) {
  return (
    <button type="button" className={isActive ? "lead-kanban-card active" : "lead-kanban-card"} onClick={onClick}>
      <div className="lead-kanban-header">
        <strong>{lead.clients?.name || "Без имени"}</strong>
        <Avatar name={lead.clients?.name || "Client"} />
      </div>
      <span>{lead.services?.name || "Услуга не выбрана"}</span>
      <div className="lead-kanban-footer">
        <strong>{formatCurrency(lead.estimated_price)}</strong>
        <small>{formatShortDate(lead.created_at)}</small>
      </div>
    </button>
  );
}

function LeadsPage({
  leads,
  leadEvents,
  services,
  currentUserName,
  permissions,
  emptyMessage,
  selectedLeadId,
  setSelectedLeadId,
  createLead,
  creatingLead,
  statusSavingId,
  updateLeadStatus,
  updateLeadFollowUp,
  addLeadNote,
  onPhoneAction
}) {
  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(false);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return leads;
    }

    return leads.filter((lead) => {
      const haystack = [
        lead.clients?.name,
        lead.clients?.phone,
        lead.services?.name,
        lead.comment,
        lead.car_plate
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [leads, search]);

  const groupedLeads = useMemo(
    () => ({
      new: filteredLeads.filter((lead) => getLeadStageKey(lead.status) === "new"),
      in_progress: filteredLeads.filter((lead) => getLeadStageKey(lead.status) === "in_progress"),
      done: filteredLeads.filter((lead) => getLeadStageKey(lead.status) === "done"),
      lost: filteredLeads.filter((lead) => getLeadStageKey(lead.status) === "lost")
    }),
    [filteredLeads]
  );

  const selectedLead = filteredLeads.find((lead) => lead.id === selectedLeadId) || filteredLeads[0] || null;
  const selectedLeadEvents = useMemo(
    () => leadEvents.filter((event) => event.lead_id === selectedLead?.id),
    [leadEvents, selectedLead?.id]
  );

  useEffect(() => {
    if (!selectedLead && filteredLeads.length > 0) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads, selectedLead, setSelectedLeadId]);

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Заявки</h1>
          <p>Pipeline заявок, быстрый выбор клиента и рабочая карточка справа.</p>
        </div>
        <div className="page-header-actions">
          {permissions.canCreateLead ? (
            <button type="button" className="button button-primary" onClick={() => setShowComposer((current) => !current)}>
              {showComposer ? "Скрыть форму" : "Добавить заявку"}
            </button>
          ) : null}
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по клиенту, услуге, номеру"
          />
        </div>
      </div>

      {permissions.canCreateLead && showComposer ? <NewLeadForm services={services} onCreateLead={createLead} creatingLead={creatingLead} /> : null}
      {permissions.canCreateLead && !showComposer ? (
        <section className="surface-card compact-note-card composer-hint-card">
          <span className="eyebrow">Быстрый ввод</span>
          <h2>Новая заявка скрыта</h2>
          <p>Откройте форму только когда нужно внести лид вручную. Так pipeline и рабочая карточка остаются в фокусе во время звонков и обработки входящих заявок.</p>
        </section>
      ) : null}

      {!permissions.canCreateLead ? (
        <section className="surface-card compact-note-card">
          <span className="eyebrow">Роль</span>
          <h2>Операционный доступ</h2>
          <p>Мастер видит только назначенные заявки. Статусы, follow-up и внутренние заметки остаются у менеджера и директора.</p>
        </section>
      ) : null}

      <div className="leads-workspace">
        <div className="kanban-grid">
          {["new", "in_progress", "done", "lost"].map((columnKey) => (
            <section key={columnKey} className={isStageHighlighted(columnKey) ? "kanban-column active" : "kanban-column"}>
              <div className="kanban-column-head">
                <strong>{statusGroupLabels[columnKey]}</strong>
                <span>{groupedLeads[columnKey].length}</span>
              </div>
              <div className="kanban-list">
                {groupedLeads[columnKey].length ? (
                  groupedLeads[columnKey].map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      isActive={lead.id === selectedLead?.id}
                      onClick={() => setSelectedLeadId(lead.id)}
                    />
                  ))
                ) : (
                  <div className="kanban-empty">{leads.length ? "Нет карточек в этой колонке." : emptyMessage}</div>
                )}
              </div>
            </section>
          ))}
        </div>

        <LeadDetailCard
          lead={selectedLead}
          leadEvents={selectedLeadEvents}
          currentUserName={currentUserName}
          permissions={permissions}
          onPhoneAction={onPhoneAction}
          statusSavingId={statusSavingId}
          updateLeadStatus={updateLeadStatus}
          updateLeadFollowUp={updateLeadFollowUp}
          addLeadNote={addLeadNote}
        />
      </div>
    </section>
  );
}

function TimelineEvent({ item, currentUserName }) {
  return (
    <article className="timeline-event">
      <span className="timeline-dot" />
      <div className="timeline-content">
        <div className="timeline-meta">
          <strong>{eventLabels[item.type] || item.type}</strong>
          <span>{formatDate(item.created_at)}</span>
        </div>
        <p>{item.note || "Без дополнительного комментария."}</p>
        <small>{item.created_by ? currentUserName || "Команда CRM" : "Система"}</small>
      </div>
    </article>
  );
}

function LeadDetailCard({ lead, leadEvents, currentUserName, permissions, onPhoneAction, statusSavingId, updateLeadStatus, updateLeadFollowUp, addLeadNote }) {
  const [note, setNote] = useState("");
  const [followUpInput, setFollowUpInput] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    setNote("");
    setFollowUpInput(formatDateTimeLocal(lead?.follow_up_at));
  }, [lead]);

  if (!lead) {
    return (
      <section className="surface-card detail-empty-card">
        <h2>Заявка не выбрана</h2>
        <p>Выберите карточку из pipeline, и здесь откроется полная информация по клиенту и работе.</p>
      </section>
    );
  }

  async function handleFollowUpSubmit(event) {
    event.preventDefault();
    setSavingFollowUp(true);
    try {
      await updateLeadFollowUp(lead, followUpInput);
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function handleClearFollowUp() {
    setSavingFollowUp(true);
    try {
      setFollowUpInput("");
      await updateLeadFollowUp(lead, "");
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function handleAddNote(event) {
    event.preventDefault();
    if (!note.trim()) {
      return;
    }

    setSavingNote(true);
    const saved = await addLeadNote(lead.id, note.trim());
    if (saved) {
      setNote("");
    }
    setSavingNote(false);
  }

  const noteEvents = leadEvents.filter((eventItem) => eventItem.type === "note_added");

  return (
    <section className="surface-card detail-card">
      <div className="client-hero">
        <div className="client-hero-main">
          <Avatar name={lead.clients?.name} large />
          <div>
            <span className="eyebrow">Карточка заявки</span>
            <h2>{lead.clients?.name || "Клиент без имени"}</h2>
            <p>
              {lead.clients?.phone || "Без телефона"}{lead.clients?.email ? ` • ${lead.clients.email}` : ""}
            </p>
          </div>
        </div>

        <div className="client-hero-actions">
          <button type="button" className="button button-outline" onClick={() => onPhoneAction?.(lead.clients?.phone)}>
            Позвонить
          </button>
          <a
            className="button button-outline"
            href={lead.clients?.phone ? getWhatsAppUrl(lead.clients.phone) : "#"}
            target="_blank"
            rel="noreferrer"
          >
            Написать
          </a>
          <StatusBadge status={lead.status} />
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card-item">
          <span>Услуга</span>
          <strong>{lead.services?.name || "Не выбрана"}</strong>
        </div>
        <div className="detail-card-item">
          <span>Сумма</span>
          <strong>{formatCurrency(lead.estimated_price)}</strong>
        </div>
        <div className="detail-card-item">
          <span>Автомобиль</span>
          <strong>{[lead.clients?.car_make, lead.clients?.car_model, lead.clients?.car_year].filter(Boolean).join(" ") || "Не указан"}</strong>
        </div>
        <div className="detail-card-item">
          <span>Источник</span>
          <strong>{formatLabel(lead.source)}</strong>
        </div>
        <div className="detail-card-item">
          <span>Предпочтительный слот</span>
          <strong>{formatPreferredSlot(lead.preferred_date, lead.preferred_time)}</strong>
        </div>
        <div className="detail-card-item">
          <span>Follow-up</span>
          <strong>{lead.follow_up_at ? formatDate(lead.follow_up_at) : "Не назначен"}</strong>
        </div>
      </div>

      <div className="detail-stack">
        <div className="detail-card-item block">
          <span>Адрес</span>
          <p>{lead.address || "Адрес пока не указан."}</p>
        </div>

        <div className="detail-card-item block">
          <span>Комментарий клиента</span>
          <p>{lead.comment || "Комментарий не добавлен."}</p>
        </div>
      </div>

      <div className="detail-tabs">
        <button type="button" className="tab-button active">
          История
        </button>
        <button type="button" className="tab-button">
          Заметки
        </button>
      </div>

      {permissions.canEditLead ? (
        <div className="followup-toolbar">
          <form className="followup-form" onSubmit={handleFollowUpSubmit}>
            <input type="datetime-local" value={followUpInput} onChange={(event) => setFollowUpInput(event.target.value)} />
            <button type="submit" className="button button-primary" disabled={savingFollowUp}>
              {savingFollowUp ? "Сохраняем..." : "Сохранить follow-up"}
            </button>
            <button
              type="button"
              className="button button-outline"
              disabled={savingFollowUp || (!lead.follow_up_at && !followUpInput)}
              onClick={handleClearFollowUp}
            >
              Очистить
            </button>
          </form>

          <div className="status-chip-row">
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                className={status === lead.status ? "status-chip active" : "status-chip"}
                disabled={statusSavingId === lead.id}
                onClick={() => updateLeadStatus(lead.id, status)}
              >
                {statusSavingId === lead.id && status === lead.status ? "Сохраняем..." : statusLabels[status] || status}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="hint-text">У мастера только просмотр. Статус, follow-up и заметки изменяются менеджером или директором.</p>
      )}

      {permissions.canEditLead ? (
        <form className="note-composer" onSubmit={handleAddNote}>
          <label>
            Внутренняя заметка
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows="3" placeholder="Позвонили клиенту, ждём подтверждение..." />
          </label>
          <button type="submit" className="button button-primary" disabled={savingNote}>
            {savingNote ? "Сохраняем..." : "Добавить заметку"}
          </button>
        </form>
      ) : null}

      <div className="timeline-shell">
        <div className="timeline-column">
          {leadEvents.length ? (
            leadEvents.map((item) => <TimelineEvent key={item.id} item={item} currentUserName={currentUserName} />)
          ) : (
            <div className="timeline-empty">История появится здесь после первых изменений по заявке.</div>
          )}
        </div>

        <aside className="notes-sidebar">
          <div className="notes-sidebar-head">
            <strong>Заметки</strong>
            <span>{noteEvents.length}</span>
          </div>
          {noteEvents.length ? (
            noteEvents.map((item) => (
              <article key={item.id} className="note-card">
                <p>{item.note}</p>
                <small>{formatDate(item.created_at)}</small>
              </article>
            ))
          ) : (
            <div className="notes-empty">Пока нет внутренних заметок.</div>
          )}
        </aside>
      </div>
    </section>
  );
}

function ClientsPage({ clients, leads, leadEvents, onPhoneAction }) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || null);
  const [activeTab, setActiveTab] = useState("history");

  useEffect(() => {
    if (!selectedClientId && clients[0]?.id) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  const selectedClient = clients.find((client) => client.id === selectedClientId) || clients[0] || null;
  const clientLeads = useMemo(
    () => leads.filter((lead) => lead.client_id === selectedClient?.id),
    [leads, selectedClient?.id]
  );
  const clientLeadIds = useMemo(() => new Set(clientLeads.map((lead) => lead.id)), [clientLeads]);
  const clientEvents = useMemo(
    () => leadEvents.filter((eventItem) => clientLeadIds.has(eventItem.lead_id)),
    [leadEvents, clientLeadIds]
  );
  const clientNotes = clientEvents.filter((item) => item.type === "note_added");

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Клиенты</h1>
          <p>База клиентов с историей взаимодействий, заявками и заметками команды.</p>
        </div>
      </div>

      <div className="clients-layout">
        <section className="surface-card client-list-card">
          <div className="section-title compact">
            <h2>Список клиентов</h2>
          </div>
          <div className="client-list">
            {clients.map((client) => (
              <button
                type="button"
                key={client.id}
                className={client.id === selectedClient?.id ? "client-list-item active" : "client-list-item"}
                onClick={() => setSelectedClientId(client.id)}
              >
                <Avatar name={client.name} />
                <div>
                  <strong>{client.name}</strong>
                  <span>{client.phone}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="surface-card client-detail-card">
          {selectedClient ? (
            <>
              <div className="client-hero">
                <div className="client-hero-main">
                  <Avatar name={selectedClient.name} large />
                  <div>
                    <span className="eyebrow">Карточка клиента</span>
                    <h2>{selectedClient.name}</h2>
                    <p>
                      {selectedClient.phone || "Телефон не указан"}
                      {selectedClient.email ? ` • ${selectedClient.email}` : ""}
                    </p>
                  </div>
                </div>
                <div className="client-hero-actions">
                  <button type="button" className="button button-outline" onClick={() => onPhoneAction?.(selectedClient.phone)}>
                    Позвонить
                  </button>
                  <a
                    className="button button-outline"
                    href={selectedClient.phone ? getWhatsAppUrl(selectedClient.phone) : "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Написать
                  </a>
                  <NavLink to="/leads" className="button button-primary">
                    Новая заявка
                  </NavLink>
                </div>
              </div>

              <div className="detail-tabs">
                {clientTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={activeTab === tab ? "tab-button active" : "tab-button"}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "history" ? "История" : tab === "leads" ? "Заявки" : "Заметки"}
                  </button>
                ))}
              </div>

              {activeTab === "history" ? (
                <div className="timeline-column">
                  {clientEvents.length ? (
                    clientEvents.map((item) => <TimelineEvent key={item.id} item={item} currentUserName="Команда CRM" />)
                  ) : (
                    <div className="timeline-empty">У этого клиента ещё нет истории взаимодействий.</div>
                  )}
                </div>
              ) : null}

              {activeTab === "leads" ? (
                <div className="data-table compact-table">
                  <div className="table-head">
                    <span>Заявка</span>
                    <span>Услуга</span>
                    <span>Статус</span>
                    <span>Дата</span>
                    <span>Сумма</span>
                    <span>Действие</span>
                  </div>
                  {clientLeads.length ? (
                    clientLeads.map((lead) => (
                      <div key={lead.id} className="table-body-row">
                        <span className="cell-strong">{selectedClient.name}</span>
                        <span>{lead.services?.name || "Не выбрана"}</span>
                        <span>
                          <StatusBadge status={lead.status} />
                        </span>
                        <span>{formatShortDate(lead.created_at)}</span>
                        <span className="amount-cell">{formatCurrency(lead.estimated_price)}</span>
                        <span>
                          <NavLink to="/leads" className="table-link">
                            Открыть
                          </NavLink>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="table-empty-state">У клиента пока нет заявок.</div>
                  )}
                </div>
              ) : null}

              {activeTab === "notes" ? (
                <div className="notes-grid">
                  {clientNotes.length ? (
                    clientNotes.map((item) => (
                      <article key={item.id} className="note-card">
                        <p>{item.note}</p>
                        <small>{formatDate(item.created_at)}</small>
                      </article>
                    ))
                  ) : (
                    <div className="notes-empty">Внутренних заметок по клиенту пока нет.</div>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <div className="table-empty-state">Клиенты пока не загружены.</div>
          )}
        </section>
      </div>
    </section>
  );
}

function TasksPage({ leads }) {
  const tasks = useMemo(
    () =>
      leads
        .filter((lead) => lead.follow_up_at || getLeadStageKey(lead.status) === "in_progress")
        .sort((left, right) => new Date(left.follow_up_at || left.created_at) - new Date(right.follow_up_at || right.created_at)),
    [leads]
  );

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Задачи</h1>
          <p>Открытые follow-up и рабочие заявки, которые требуют действия команды.</p>
        </div>
      </div>

      <section className="surface-card">
        <div className="task-list">
          {tasks.length ? (
            tasks.map((lead) => (
              <article key={lead.id} className="task-item">
                <div className="task-item-main">
                  <MiniIcon label="TK" />
                  <div>
                    <strong>{lead.clients?.name || "Клиент без имени"}</strong>
                    <span>{lead.services?.name || "Без услуги"}</span>
                  </div>
                </div>
                <div className="task-item-side">
                  <StatusBadge status={lead.status} />
                  <small>{lead.follow_up_at ? formatDate(lead.follow_up_at) : formatDate(lead.created_at)}</small>
                </div>
              </article>
            ))
          ) : (
            <div className="table-empty-state">Сейчас нет открытых задач для команды.</div>
          )}
        </div>
      </section>
    </section>
  );
}

function ServicesPage({ services }) {
  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Услуги</h1>
          <p>Каталог услуг с базовой стоимостью и длительностью для менеджера.</p>
        </div>
      </div>

      <div className="service-grid">
        {services.map((service) => (
          <article key={service.id} className="surface-card service-card">
            <MiniIcon label="SR" />
            <strong>{service.name}</strong>
            <span>{formatCurrency(service.base_price)}</span>
            <p>{service.duration_minutes} мин.</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsPage({ webhookEnabled, role }) {
  const [activeSection, setActiveSection] = useState("profile");

  function renderSection() {
    if (activeSection === "profile") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <strong>Текущая роль</strong>
            <p>{roleLabels[role] || roleLabels.manager}</p>
          </article>
          <article className="settings-form-card">
            <strong>Рабочая зона</strong>
            <p>CRM подключена к Supabase и использует браузерную аутентификацию для текущего профиля.</p>
          </article>
        </div>
      );
    }

    if (activeSection === "team") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <strong>Команда</strong>
            <p>Роли уже разведены на директора, менеджера и мастера. Следующий слой — отдельные реальные аккаунты на демо и продажу.</p>
          </article>
        </div>
      );
    }

    if (activeSection === "billing") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <strong>Тариф</strong>
            <p>Сейчас это MVP-слой. Подписочная SaaS-модель закреплена в roadmap и будет вынесена после стабилизации onboarding и UX.</p>
          </article>
        </div>
      );
    }

    if (activeSection === "integrations") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <strong>Автоматизация</strong>
            <p>
              {webhookEnabled
                ? "Внешний webhook автоматизации включён. CRM может отправлять события в дополнительный automation-layer."
                : "Внешний webhook не обязателен. Основные уведомления и напоминания уже переведены на Supabase Edge Functions."}
            </p>
          </article>
          <article className="settings-form-card">
            <strong>Telegram</strong>
            <p>Оповещения по новым заявкам, follow-up и daily digest уже работают через нативные Edge Functions проекта.</p>
          </article>
        </div>
      );
    }

    return (
      <div className="settings-panel-stack">
        <article className="settings-form-card">
          <strong>Безопасность</strong>
          <p>RLS, rate limiting для public request и server-side Zod validation уже внедрены и проверены live.</p>
        </article>
      </div>
    );
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Настройки</h1>
          <p>Блок конфигурации CRM, команды, интеграций и операционной безопасности.</p>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="surface-card settings-nav-card">
          {settingsSections.map((section) => (
            <button
              key={section}
              type="button"
              className={activeSection === section ? "settings-nav-item active" : "settings-nav-item"}
              onClick={() => setActiveSection(section)}
            >
              {settingsSectionLabels[section]}
            </button>
          ))}
        </aside>

        <section className="surface-card settings-content-card">{renderSection()}</section>
      </div>
    </section>
  );
}

function LiveSettingsPage({
  webhookEnabled,
  role,
  profile,
  teamProfiles,
  services,
  profileSaving,
  teamSaving,
  serviceSavingId,
  creatingTeamMember,
  creatingService,
  applyingDemoPricing,
  passwordSaving,
  onSaveProfile,
  onUpdateTeamMember,
  onDeleteTeamMember,
  onCreateTeamMember,
  onUpdateService,
  onCreateService,
  onApplyDemoPricing,
  onChangePassword
}) {
  const [activeSection, setActiveSection] = useState("profile");
  const [profileForm, setProfileForm] = useState({ full_name: "", telegram_chat_id: "" });
  const [draftProfiles, setDraftProfiles] = useState({});
  const [newTeamMember, setNewTeamMember] = useState({ full_name: "", email: "", password: "", role: "manager", telegram_chat_id: "" });
  const [draftServices, setDraftServices] = useState({});
  const [newService, setNewService] = useState({ name: "", base_price: "", duration_minutes: "", is_active: true });
  const [passwordForm, setPasswordForm] = useState({ next: "", confirm: "" });

  async function saveProfileSettings(input) {
    setProfileSaving(true);
    setError("");
    setSaveMessage("");

    const payload = {
      full_name: input.full_name.trim(),
      telegram_chat_id: input.telegram_chat_id.trim() || null
    };

    const { data, error: updateError } = await supabase.from("profiles").update(payload).eq("id", session.user.id).select("*").maybeSingle();

    if (updateError) {
      setError(updateError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РїСЂРѕС„РёР»СЊ.");
      setProfileSaving(false);
      return false;
    }

    setProfile(data || null);
    setTeamProfiles((current) => current.map((member) => (member.id === session.user.id ? { ...member, ...payload } : member)));
    setSaveMessage("РџСЂРѕС„РёР»СЊ РѕР±РЅРѕРІР»С‘РЅ.");
    setProfileSaving(false);
    return true;
  }

  async function updateTeamMember(memberId, input) {
    setTeamSaving(true);
    setError("");
    setSaveMessage("");

    const payload = {
      full_name: input.full_name.trim(),
      role: input.role,
      telegram_chat_id: input.telegram_chat_id.trim() || null
    };

    const { data, error: updateError } = await supabase.from("profiles").update(payload).eq("id", memberId).select("*").maybeSingle();

    if (updateError) {
      setError(updateError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ СѓС‡Р°СЃС‚РЅРёРєР°.");
      setTeamSaving(false);
      return false;
    }

    setTeamProfiles((current) => current.map((member) => (member.id === memberId ? { ...member, ...data } : member)));
    if (memberId === session.user.id) {
      setProfile((current) => (current ? { ...current, ...data } : current));
    }
    setSaveMessage("РљРѕРјР°РЅРґР° РѕР±РЅРѕРІР»РµРЅР°.");
    setTeamSaving(false);
    return true;
  }

  async function deleteTeamMember(memberId) {
    setTeamSaving(true);
    setError("");
    setSaveMessage("");

    const { error: deleteError } = await supabase.from("profiles").delete().eq("id", memberId);

    if (deleteError) {
      setError(deleteError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ СѓС‡Р°СЃС‚РЅРёРєР°.");
      setTeamSaving(false);
      return false;
    }

    setTeamProfiles((current) => current.filter((member) => member.id !== memberId));
    setSaveMessage("РЈС‡Р°СЃС‚РЅРёРє СѓРґР°Р»С‘РЅ.");
    setTeamSaving(false);
    return true;
  }

  async function createTeamMember(input) {
    setCreatingTeamMember(true);
    setError("");
    setSaveMessage("");

    try {
      const inviteClient = createInviteSupabaseClient();
      const { data: signUpData, error: signUpError } = await inviteClient.auth.signUp({
        email: input.email.trim(),
        password: input.password.trim(),
        options: {
          data: {
            full_name: input.full_name.trim()
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      const nextUserId = signUpData.user?.id;
      if (!nextUserId) {
        throw new Error("РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ id РЅРѕРІРѕРіРѕ Р°РєРєР°СѓРЅС‚Р°.");
      }

      const payload = {
        id: nextUserId,
        email: input.email.trim(),
        full_name: input.full_name.trim(),
        role: input.role,
        telegram_chat_id: input.telegram_chat_id.trim() || null
      };

      const { data, error: upsertError } = await supabase.from("profiles").upsert(payload).select("*").maybeSingle();

      if (upsertError) {
        throw upsertError;
      }

      setTeamProfiles((current) => {
        const exists = current.some((member) => member.id === nextUserId);
        if (exists) {
          return current.map((member) => (member.id === nextUserId ? { ...member, ...data } : member));
        }
        return [...current, data || payload];
      });
      setSaveMessage("РќРѕРІС‹Р№ СѓС‡Р°СЃС‚РЅРёРє СЃРѕР·РґР°РЅ.");
      return true;
    } catch (createError) {
      setError(createError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ СѓС‡Р°СЃС‚РЅРёРєР°.");
      return false;
    } finally {
      setCreatingTeamMember(false);
    }
  }

  async function updateServiceSettings(serviceId, input) {
    setServiceSavingId(serviceId);
    setError("");
    setSaveMessage("");

    const payload = {
      name: input.name.trim(),
      base_price: Number(input.base_price || 0),
      duration_minutes: Number(input.duration_minutes || 0),
      is_active: Boolean(input.is_active)
    };

    const { data, error: updateError } = await supabase.from("services").update(payload).eq("id", serviceId).select("*").maybeSingle();

    if (updateError) {
      setError(updateError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ СѓСЃР»СѓРіСѓ.");
      setServiceSavingId(null);
      return false;
    }

    setServices((current) => current.map((service) => (service.id === serviceId ? { ...service, ...data } : service)));
    setSaveMessage("РЈСЃР»СѓРіР° РѕР±РЅРѕРІР»РµРЅР°.");
    setServiceSavingId(null);
    return true;
  }

  async function createServiceSettings(input) {
    setCreatingService(true);
    setError("");
    setSaveMessage("");

    const payload = {
      name: input.name.trim(),
      base_price: Number(input.base_price || 0),
      duration_minutes: Number(input.duration_minutes || 0),
      is_active: Boolean(input.is_active)
    };

    const { data, error: insertError } = await supabase.from("services").insert(payload).select("*").maybeSingle();

    if (insertError) {
      setError(insertError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ РґРѕР±Р°РІРёС‚СЊ СѓСЃР»СѓРіСѓ.");
      setCreatingService(false);
      return false;
    }

    setServices((current) => [...current, data || payload].sort((a, b) => a.name.localeCompare(b.name)));
    setSaveMessage("РќРѕРІР°СЏ СѓСЃР»СѓРіР° РґРѕР±Р°РІР»РµРЅР°.");
    setCreatingService(false);
    return true;
  }

  async function applyDemoPricing() {
    setApplyingDemoPricing(true);
    setError("");
    setSaveMessage("");

    try {
      for (const preset of demoServicePresets) {
        const existing = services.find((service) => service.name.toLowerCase() === preset.name.toLowerCase());
        if (existing) {
          const { error: updateError } = await supabase
            .from("services")
            .update({
              base_price: preset.base_price,
              duration_minutes: preset.duration_minutes,
              is_active: true
            })
            .eq("id", existing.id);
          if (updateError) {
            throw updateError;
          }
        } else {
          const { error: insertError } = await supabase.from("services").insert({
            name: preset.name,
            base_price: preset.base_price,
            duration_minutes: preset.duration_minutes,
            is_active: true
          });
          if (insertError) {
            throw insertError;
          }
        }
      }

      await loadData(selectedLeadId);
      setSaveMessage("Р”РµРјРѕ-С†РµРЅС‹ Рё РІСЂРµРјСЏ РЅР° СѓСЃР»СѓРіРё РѕР±РЅРѕРІР»РµРЅС‹.");
      return true;
    } catch (applyError) {
      setError(applyError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРёРјРµРЅРёС‚СЊ РґРµРјРѕ-С†РµРЅС‹.");
      return false;
    } finally {
      setApplyingDemoPricing(false);
    }
  }

  async function changePassword(nextPassword) {
    setPasswordSaving(true);
    setError("");
    setSaveMessage("");

    const { error: updateError } = await supabase.auth.updateUser({ password: nextPassword });

    if (updateError) {
      setError(updateError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРјРµРЅРёС‚СЊ РїР°СЂРѕР»СЊ.");
      setPasswordSaving(false);
      return false;
    }

    setSaveMessage("РџР°СЂРѕР»СЊ РѕР±РЅРѕРІР»С‘РЅ.");
    setPasswordSaving(false);
    return true;
  }

  async function handlePhoneAction(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("РЈ РєР»РёРµРЅС‚Р° РЅРµС‚ РЅРѕРјРµСЂР° С‚РµР»РµС„РѕРЅР°.");
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalized);
      }
    } catch {
      // ignore clipboard errors
    }

    window.location.href = `tel:${normalized}`;
    setSaveMessage(`РќРѕРјРµСЂ ${normalized} РїРµСЂРµРґР°РЅ РІ СЃРёСЃС‚РµРјРЅС‹Р№ РЅР°Р±РѕСЂ.`);
  }

  useEffect(() => {
    setProfileForm({
      full_name: profile?.full_name || "",
      telegram_chat_id: profile?.telegram_chat_id || ""
    });
  }, [profile?.full_name, profile?.telegram_chat_id]);

  useEffect(() => {
    setDraftProfiles(
      Object.fromEntries(
        (teamProfiles || []).map((member) => [
          member.id,
          {
            full_name: member.full_name || "",
            role: member.role || "manager",
            telegram_chat_id: member.telegram_chat_id || ""
          }
        ])
      )
    );
  }, [teamProfiles]);

  useEffect(() => {
    setDraftServices(
      Object.fromEntries(
        (services || []).map((service) => [
          service.id,
          {
            name: service.name || "",
            base_price: service.base_price ?? "",
            duration_minutes: service.duration_minutes ?? "",
            is_active: service.is_active !== false
          }
        ])
      )
    );
  }, [services]);

  const managerProfiles = (teamProfiles || []).filter((member) => member.role === "manager");

  async function handleProfileSubmit(event) {
    event.preventDefault();
    await onSaveProfile(profileForm);
  }

  async function handleCreateTeamMember(event) {
    event.preventDefault();
    const created = await onCreateTeamMember(newTeamMember);
    if (created) {
      setNewTeamMember({ full_name: "", email: "", password: "", role: "manager", telegram_chat_id: "" });
    }
  }

  async function handleCreateService(event) {
    event.preventDefault();
    const created = await onCreateService(newService);
    if (created) {
      setNewService({ name: "", base_price: "", duration_minutes: "", is_active: true });
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (!passwordForm.next || passwordForm.next !== passwordForm.confirm) {
      return;
    }

    const changed = await onChangePassword(passwordForm.next);
    if (changed) {
      setPasswordForm({ next: "", confirm: "" });
    }
  }

  function renderSection() {
    if (activeSection === "profile") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <strong>РџСЂРѕС„РёР»СЊ</strong>
            <form className="settings-edit-form" onSubmit={handleProfileSubmit}>
              <label>
                РРјСЏ РІ CRM
                <input
                  value={profileForm.full_name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, full_name: event.target.value }))}
                  placeholder="РРјСЏ РІР»Р°РґРµР»СЊС†Р° РёР»Рё РјРµРЅРµРґР¶РµСЂР°"
                />
              </label>
              <label>
                Telegram chat id
                <input
                  value={profileForm.telegram_chat_id}
                  onChange={(event) => setProfileForm((current) => ({ ...current, telegram_chat_id: event.target.value }))}
                  placeholder="Р”Р»СЏ Р»РёС‡РЅС‹С… СѓРІРµРґРѕРјР»РµРЅРёР№"
                />
              </label>
              <div className="settings-action-row">
                <span className="hint-text">Р¢РµРєСѓС‰Р°СЏ СЂРѕР»СЊ: {roleLabels[role] || roleLabels.manager}</span>
                <button type="submit" className="button button-primary" disabled={profileSaving}>
                  {profileSaving ? "РЎРѕС…СЂР°РЅСЏРµРј..." : "РЎРѕС…СЂР°РЅРёС‚СЊ РїСЂРѕС„РёР»СЊ"}
                </button>
              </div>
            </form>
          </article>
        </div>
      );
    }

    if (activeSection === "team") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <div className="settings-toolbar-card">
              <div>
                <strong>РљРѕРјР°РЅРґР°</strong>
                <p>РњРµРЅСЏР№С‚Рµ РёРјСЏ, СЂРѕР»СЊ Рё Telegram РґР»СЏ owner, manager Рё detailer.</p>
              </div>
            </div>
            <div className="service-grid settings-service-grid">
              {(teamProfiles || []).map((member) => {
                const draft = draftProfiles[member.id] || {
                  full_name: member.full_name || "",
                  role: member.role || "manager",
                  telegram_chat_id: member.telegram_chat_id || ""
                };

                return (
                  <article key={member.id} className="service-card">
                    <div className="service-card-head">
                      <strong>{member.full_name || member.email || "РЈС‡Р°СЃС‚РЅРёРє"}</strong>
                      <span>{member.email || "Р‘РµР· email"}</span>
                    </div>
                    <div className="settings-edit-form">
                      <label>
                        РРјСЏ
                        <input
                          value={draft.full_name}
                          onChange={(event) =>
                            setDraftProfiles((current) => ({
                              ...current,
                              [member.id]: { ...draft, full_name: event.target.value }
                            }))
                          }
                        />
                      </label>
                      <label>
                        Р РѕР»СЊ
                        <select
                          value={draft.role}
                          onChange={(event) =>
                            setDraftProfiles((current) => ({
                              ...current,
                              [member.id]: { ...draft, role: event.target.value }
                            }))
                          }
                        >
                          {roleOptions.map((option) => (
                            <option key={option} value={option}>
                              {roleLabels[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Telegram chat id
                        <input
                          value={draft.telegram_chat_id}
                          onChange={(event) =>
                            setDraftProfiles((current) => ({
                              ...current,
                              [member.id]: { ...draft, telegram_chat_id: event.target.value }
                            }))
                          }
                        />
                      </label>
                      <div className="settings-action-row">
                        <button
                          type="button"
                          className="button button-primary"
                          disabled={teamSaving}
                          onClick={() => onUpdateTeamMember(member.id, draft)}
                        >
                          {teamSaving ? "РЎРѕС…СЂР°РЅСЏРµРј..." : "РЎРѕС…СЂР°РЅРёС‚СЊ"}
                        </button>
                        {profile?.id !== member.id ? (
                          <button
                            type="button"
                            className="button button-outline"
                            disabled={teamSaving}
                            onClick={() => onDeleteTeamMember(member.id)}
                          >
                            РЈРґР°Р»РёС‚СЊ
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="settings-form-card">
            <strong>Р”РѕР±Р°РІРёС‚СЊ СѓС‡Р°СЃС‚РЅРёРєР°</strong>
            <form className="settings-edit-form" onSubmit={handleCreateTeamMember}>
              <label>
                РРјСЏ
                <input
                  value={newTeamMember.full_name}
                  onChange={(event) => setNewTeamMember((current) => ({ ...current, full_name: event.target.value }))}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={newTeamMember.email}
                  onChange={(event) => setNewTeamMember((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label>
                Р’СЂРµРјРµРЅРЅС‹Р№ РїР°СЂРѕР»СЊ
                <input
                  type="password"
                  value={newTeamMember.password}
                  onChange={(event) => setNewTeamMember((current) => ({ ...current, password: event.target.value }))}
                />
              </label>
              <label>
                Р РѕР»СЊ
                <select
                  value={newTeamMember.role}
                  onChange={(event) => setNewTeamMember((current) => ({ ...current, role: event.target.value }))}
                >
                  {roleOptions.map((option) => (
                    <option key={option} value={option}>
                      {roleLabels[option]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Telegram chat id
                <input
                  value={newTeamMember.telegram_chat_id}
                  onChange={(event) => setNewTeamMember((current) => ({ ...current, telegram_chat_id: event.target.value }))}
                />
              </label>
              <button type="submit" className="button button-primary" disabled={creatingTeamMember}>
                {creatingTeamMember ? "РЎРѕР·РґР°С‘Рј..." : "РЎРѕР·РґР°С‚СЊ Р°РєРєР°СѓРЅС‚"}
              </button>
            </form>
          </article>
        </div>
      );
    }

    if (activeSection === "billing") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <div className="settings-toolbar-card">
              <div>
                <strong>Р”РµРјРѕ-РїСЂР°Р№СЃ</strong>
                <p>РџРѕРґС‚СЏРіРёРІР°РµРј СЂРµР°Р»РёСЃС‚РёС‡РЅС‹Рµ С†РµРЅС‹ Рё РІСЂРµРјСЏ РЅР° СѓСЃР»СѓРіРё, С‡С‚РѕР±С‹ РїРѕРєР°Р·Р°С‚СЊ РєР°СЃСЃСѓ Рё СЃСЂРµРґРЅРёР№ С‡РµРє Р·Р° РјРµСЃСЏС†.</p>
              </div>
              <button type="button" className="button button-primary" disabled={applyingDemoPricing} onClick={onApplyDemoPricing}>
                {applyingDemoPricing ? "РћР±РЅРѕРІР»СЏРµРј..." : "Р—Р°РіСЂСѓР·РёС‚СЊ РґРµРјРѕ-С†РµРЅС‹"}
              </button>
            </div>
          </article>

          <article className="settings-form-card">
            <strong>РЈСЃР»СѓРіРё</strong>
            <div className="service-grid settings-service-grid">
              {(services || []).map((service) => {
                const draft = draftServices[service.id] || {
                  name: service.name || "",
                  base_price: service.base_price ?? "",
                  duration_minutes: service.duration_minutes ?? "",
                  is_active: service.is_active !== false
                };

                return (
                  <article key={service.id} className="service-card">
                    <div className="settings-edit-form">
                      <label>
                        РќР°Р·РІР°РЅРёРµ
                        <input
                          value={draft.name}
                          onChange={(event) =>
                            setDraftServices((current) => ({
                              ...current,
                              [service.id]: { ...draft, name: event.target.value }
                            }))
                          }
                        />
                      </label>
                      <label>
                        Р¦РµРЅР° (MDL)
                        <input
                          type="number"
                          min="0"
                          value={draft.base_price}
                          onChange={(event) =>
                            setDraftServices((current) => ({
                              ...current,
                              [service.id]: { ...draft, base_price: event.target.value }
                            }))
                          }
                        />
                      </label>
                      <label>
                        Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ (РјРёРЅ)
                        <input
                          type="number"
                          min="0"
                          value={draft.duration_minutes}
                          onChange={(event) =>
                            setDraftServices((current) => ({
                              ...current,
                              [service.id]: { ...draft, duration_minutes: event.target.value }
                            }))
                          }
                        />
                      </label>
                      <label className="settings-checkbox">
                        <input
                          type="checkbox"
                          checked={draft.is_active}
                          onChange={(event) =>
                            setDraftServices((current) => ({
                              ...current,
                              [service.id]: { ...draft, is_active: event.target.checked }
                            }))
                          }
                        />
                        <span>РђРєС‚РёРІРЅР°СЏ СѓСЃР»СѓРіР°</span>
                      </label>
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={serviceSavingId === service.id}
                        onClick={() => onUpdateService(service.id, draft)}
                      >
                        {serviceSavingId === service.id ? "РЎРѕС…СЂР°РЅСЏРµРј..." : "РЎРѕС…СЂР°РЅРёС‚СЊ СѓСЃР»СѓРіСѓ"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="settings-form-card">
            <strong>РќРѕРІР°СЏ СѓСЃР»СѓРіР°</strong>
            <form className="settings-edit-form" onSubmit={handleCreateService}>
              <label>
                РќР°Р·РІР°РЅРёРµ
                <input value={newService.name} onChange={(event) => setNewService((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                Р¦РµРЅР° (MDL)
                <input
                  type="number"
                  min="0"
                  value={newService.base_price}
                  onChange={(event) => setNewService((current) => ({ ...current, base_price: event.target.value }))}
                />
              </label>
              <label>
                Р”Р»РёС‚РµР»СЊРЅРѕСЃС‚СЊ (РјРёРЅ)
                <input
                  type="number"
                  min="0"
                  value={newService.duration_minutes}
                  onChange={(event) => setNewService((current) => ({ ...current, duration_minutes: event.target.value }))}
                />
              </label>
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={newService.is_active}
                  onChange={(event) => setNewService((current) => ({ ...current, is_active: event.target.checked }))}
                />
                <span>РЎСЂР°Р·Сѓ Р°РєС‚РёРІРёСЂРѕРІР°С‚СЊ</span>
              </label>
              <button type="submit" className="button button-primary" disabled={creatingService}>
                {creatingService ? "РЎРѕР·РґР°С‘Рј..." : "Р”РѕР±Р°РІРёС‚СЊ СѓСЃР»СѓРіСѓ"}
              </button>
            </form>
          </article>
        </div>
      );
    }

    if (activeSection === "integrations") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <strong>Webhook automation</strong>
            <p>
              {webhookEnabled
                ? "Р’РЅРµС€РЅРёР№ webhook РІРєР»СЋС‡С‘РЅ. CRM РѕС‚РїСЂР°РІР»СЏРµС‚ СЃРѕР±С‹С‚РёСЏ РїРѕ Р·Р°СЏРІРєР°Рј РІ automation-layer."
                : "Webhook РЅРµ РЅР°СЃС‚СЂРѕРµРЅ. РћСЃРЅРѕРІРЅРѕР№ follow-up Рё Telegram live-РѕРїРѕРІРµС‰РµРЅРёСЏ РѕСЃС‚Р°СЋС‚СЃСЏ РЅР° Supabase Edge Functions."}
            </p>
          </article>
          <article className="settings-form-card">
            <strong>Telegram</strong>
            <p>Chat id РјРµРЅРµРґР¶РµСЂРѕРІ: {managerProfiles.length ? managerProfiles.map((member) => member.telegram_chat_id || "РЅРµ СѓРєР°Р·Р°РЅ").join(", ") : "РїРѕРєР° РЅРµС‚"}.</p>
          </article>
        </div>
      );
    }

    return (
      <div className="settings-panel-stack">
        <article className="settings-form-card">
          <strong>РЎРјРµРЅР° РїР°СЂРѕР»СЏ</strong>
          <form className="settings-edit-form" onSubmit={handlePasswordSubmit}>
            <label>
              РќРѕРІС‹Р№ РїР°СЂРѕР»СЊ
              <input
                type="password"
                value={passwordForm.next}
                onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))}
              />
            </label>
            <label>
              РџРѕРІС‚РѕСЂРёС‚Рµ РїР°СЂРѕР»СЊ
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))}
              />
            </label>
            <button
              type="submit"
              className="button button-primary"
              disabled={passwordSaving || !passwordForm.next || passwordForm.next !== passwordForm.confirm}
            >
              {passwordSaving ? "РћР±РЅРѕРІР»СЏРµРј..." : "РЎРјРµРЅРёС‚СЊ РїР°СЂРѕР»СЊ"}
            </button>
          </form>
        </article>
      </div>
    );
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>РќР°СЃС‚СЂРѕР№РєРё</h1>
          <p>Р‘Р»РѕРє РєРѕРЅС„РёРіСѓСЂР°С†РёРё CRM, РєРѕРјР°РЅРґС‹, РёРЅС‚РµРіСЂР°С†РёР№ Рё РѕРїРµСЂР°С†РёРѕРЅРЅРѕР№ Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё.</p>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="surface-card settings-nav-card">
          {settingsSections.map((section) => (
            <button
              key={section}
              type="button"
              className={activeSection === section ? "settings-nav-item active" : "settings-nav-item"}
              onClick={() => setActiveSection(section)}
            >
              {settingsSectionLabels[section]}
            </button>
          ))}
        </aside>

        <section className="surface-card settings-content-card">{renderSection()}</section>
      </div>
    </section>
  );
}

function ProtectedApp({ session, onSignOut }) {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [leadEvents, setLeadEvents] = useState([]);
  const [profile, setProfile] = useState(null);
  const [teamProfiles, setTeamProfiles] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [creatingLead, setCreatingLead] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [teamSaving, setTeamSaving] = useState(false);
  const [serviceSavingId, setServiceSavingId] = useState(null);
  const [creatingTeamMember, setCreatingTeamMember] = useState(false);
  const [creatingService, setCreatingService] = useState(false);
  const [applyingDemoPricing, setApplyingDemoPricing] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const automationWebhookUrl = import.meta.env.VITE_AUTOMATION_WEBHOOK_URL || import.meta.env.VITE_N8N_WEBHOOK_URL;
  const role = profile?.role || "manager";
  const permissions = getRolePermissions(role);

  async function loadData(preferredLeadId = null) {
    setLoading(true);
    setError("");

    try {
      const [
        { data: leadsData, error: leadsError },
        { data: clientsData, error: clientsError },
        { data: servicesData, error: servicesError },
        { data: leadEventsData, error: leadEventsError },
        { data: profileData, error: profileError },
        { data: teamProfilesData, error: teamProfilesError }
      ] = await Promise.all([
        supabase
          .from("leads")
          .select("*, clients(*), services(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("clients")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("services")
          .select("*")
          .order("name", { ascending: true }),
        supabase
          .from("lead_events")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: true })
      ]);

      if (leadsError) {
        throw leadsError;
      }

      if (clientsError) {
        throw clientsError;
      }

      if (servicesError) {
        throw servicesError;
      }

      if (leadEventsError) {
        throw leadEventsError;
      }

      if (profileError) {
        throw profileError;
      }

      if (teamProfilesError) {
        throw teamProfilesError;
      }

      setLeads(leadsData || []);
      setClients(clientsData || []);
      setServices(servicesData || []);
      setLeadEvents(leadEventsData || []);
      setProfile(profileData || null);
      setTeamProfiles(teamProfilesData || []);
      setSelectedLeadId((current) => preferredLeadId || current || leadsData?.[0]?.id || null);
    } catch (loadError) {
      setError(loadError.message || "Не удалось загрузить данные.");
    } finally {
      setLoading(false);
    }
  }

  async function createTimelineEvent(eventInput) {
    const { data, error: eventError } = await createLeadEvent(supabase, eventInput);

    if (!eventError && data) {
      setLeadEvents((current) => [data, ...current]);
    }

    return { data, error: eventError };
  }

  async function createLead(form) {
    setCreatingLead(true);
    setError("");
    setSaveMessage("");

    try {
      const { client: clientRecord, reused } = await createOrReuseClient(supabase, form);
      setClients((current) => {
        const exists = current.some((client) => client.id === clientRecord.id);
        if (exists) {
          return current.map((client) => (client.id === clientRecord.id ? clientRecord : client));
        }

        return [clientRecord, ...current];
      });

      const createdLead = await createLeadRecord(supabase, clientRecord.id, form);

      setLeads((current) => [createdLead, ...current]);
      setSelectedLeadId(createdLead.id);

      await createTimelineEvent({
        lead_id: createdLead.id,
        type: "created",
        note: `Заявка создана из источника ${formatLabel(form.source)}`,
        payload: {
          source: form.source,
          service_id: createdLead.service_id,
          follow_up_at: createdLead.follow_up_at
        },
        created_by: session.user.id
      });

      if (form.comment.trim()) {
        await createTimelineEvent({
          lead_id: createdLead.id,
          type: "note_added",
          note: form.comment.trim(),
          payload: {
            origin: "lead_create"
          },
          created_by: session.user.id
        });
      }

      try {
        await sendAutomationWebhook(automationWebhookUrl, {
          event: "lead_created",
          lead: createdLead,
          client: clientRecord
        });
      } catch (webhookError) {
        setError(webhookError.message || "Заявка создана, но внешний automation webhook не отработал.");
      }

      setSaveMessage(reused ? "Заявка создана, существующий клиент обновлён." : "Заявка успешно создана.");
      return true;
    } catch (createError) {
      setError(createError.message || "Не удалось создать заявку.");
      return false;
    } finally {
      setCreatingLead(false);
    }
  }

  async function updateLeadStatus(leadId, nextStatus) {
    const previousLeads = leads;
    const previousLead = previousLeads.find((lead) => lead.id === leadId);
    if (!previousLead || previousLead.status === nextStatus) {
      return;
    }

    const optimistic = previousLeads.map((lead) => (lead.id === leadId ? { ...lead, status: nextStatus } : lead));
    setLeads(optimistic);
    setError("");
    setSaveMessage("");
    setStatusSavingId(leadId);

    try {
      const { error: updateError } = await updateLeadStatusRecord(supabase, leadId, nextStatus);

      if (updateError) {
        setLeads(previousLeads);
        setError(updateError.message || "Не удалось обновить заявку.");
        return;
      }

      await createTimelineEvent({
        lead_id: leadId,
        type: "status_changed",
        note: `Статус изменён с "${statusLabels[previousLead.status] || previousLead.status}" на "${statusLabels[nextStatus] || nextStatus}"`,
        payload: {
          from: previousLead.status,
          to: nextStatus
        },
        created_by: session.user.id
      });
      setSaveMessage(`Статус обновлён: ${statusLabels[nextStatus] || nextStatus}.`);
    } finally {
      setStatusSavingId(null);
    }
  }

  async function updateLeadFollowUp(lead, followUpInput) {
    const previousLeads = leads;
    const nextFollowUpAt = followUpInput ? new Date(followUpInput).toISOString() : null;

    if ((lead.follow_up_at || null) === nextFollowUpAt) {
      return true;
    }

    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              follow_up_at: nextFollowUpAt
            }
          : item
      )
    );
    setError("");
    setSaveMessage("");

    const { error: updateError } = await updateLeadFollowUpRecord(supabase, lead.id, followUpInput);

    if (updateError) {
      setLeads(previousLeads);
      setError(updateError.message || "Не удалось обновить follow-up.");
      return false;
    }

    await createTimelineEvent({
      lead_id: lead.id,
      type: "follow_up_set",
      note: nextFollowUpAt ? `Follow-up назначен на ${formatDate(nextFollowUpAt)}` : "Follow-up очищен",
      payload: {
        follow_up_at: nextFollowUpAt
      },
      created_by: session.user.id
    });

    try {
      await sendAutomationWebhook(automationWebhookUrl, {
        event: "follow_up_updated",
        lead: {
          ...lead,
          follow_up_at: nextFollowUpAt
        }
      });
    } catch (webhookError) {
      setError(webhookError.message || "Follow-up обновлён, но внешний automation webhook не отработал.");
    }

    setSaveMessage(nextFollowUpAt ? "Follow-up сохранён." : "Follow-up очищен.");
    return true;
  }

  async function addLeadNote(leadId, note) {
    setError("");
    setSaveMessage("");

    const { data, error: noteError } = await addLeadNoteRecord(supabase, leadId, note, session.user.id);

    if (noteError) {
      setError(noteError.message || "Не удалось добавить заметку.");
      return false;
    }

    if (data) {
      setLeadEvents((current) => [data, ...current]);
    }

    setSaveMessage("Заметка добавлена.");
    return true;
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!saveMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveMessage("");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [saveMessage]);

  const visibleLeads = useMemo(() => {
    if (role === "detailer") {
      return leads.filter((lead) => lead.assigned_to === session.user.id);
    }

    return leads;
  }, [leads, role, session.user.id]);

  const visibleLeadIds = useMemo(() => new Set(visibleLeads.map((lead) => lead.id)), [visibleLeads]);
  const visibleLeadEvents = useMemo(
    () => leadEvents.filter((event) => visibleLeadIds.has(event.lead_id)),
    [leadEvents, visibleLeadIds]
  );

  const metrics = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const clientsCount = clients.length;
    const todayLeads = visibleLeads.filter((lead) => new Date(lead.created_at).toDateString() === now.toDateString()).length;
    const newCount = visibleLeads.filter((lead) => lead.status === "new").length;
    const followUpCount = visibleLeads.filter((lead) => lead.follow_up_at && new Date(lead.follow_up_at) <= now).length;
    const openTasks = visibleLeads.filter((lead) => getLeadStageKey(lead.status) === "in_progress" || lead.follow_up_at).length;
    const monthDoneLeads = visibleLeads.filter(
      (lead) => getLeadStageKey(lead.status) === "done" && String(lead.updated_at || lead.created_at || "").slice(0, 7) === monthKey
    );
    const monthRevenue = monthDoneLeads.reduce((total, lead) => total + Number(lead.estimated_price || 0), 0);
    const monthClosedLeads = monthDoneLeads.length;
    const monthAverageTicket = monthClosedLeads ? monthRevenue / monthClosedLeads : 0;
    const monthServiceRevenue = Object.values(
      monthDoneLeads.reduce((accumulator, lead) => {
        const key = lead.services?.name || "Р‘РµР· СѓСЃР»СѓРіРё";
        if (!accumulator[key]) {
          accumulator[key] = { name: key, count: 0, total: 0 };
        }
        accumulator[key].count += 1;
        accumulator[key].total += Number(lead.estimated_price || 0);
        return accumulator;
      }, {})
    ).sort((a, b) => b.total - a.total);

    return { clientsCount, todayLeads, newCount, followUpCount, openTasks, monthRevenue, monthClosedLeads, monthAverageTicket, monthServiceRevenue };
  }, [clients.length, visibleLeads]);

  const defaultRoute = permissions.nav[0] || "/dashboard";
  const leadsEmptyMessage =
    role === "detailer"
      ? "Назначенных заявок пока нет. Как только менеджер назначит работу, она появится здесь."
      : "Пока нет заявок. Создайте первую, и pipeline заполнится автоматически.";

  if (loading) {
    return <div className="loading-screen">Загружаем CRM...</div>;
  }

  return (
    <AppLayout
      session={session}
      metrics={metrics}
      role={role}
      onSignOut={onSignOut}
      currentUserName={profile?.full_name || session.user.email}
    >
      {error ? <div className="notice notice-error">{error}</div> : null}
      {saveMessage ? <div className="notice notice-success">{saveMessage}</div> : null}

      <Routes>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        {permissions.nav.includes("/dashboard") ? (
          <Route path="/dashboard" element={<DashboardPage metrics={metrics} leads={visibleLeads} onOpenLead={setSelectedLeadId} />} />
        ) : null}
        {permissions.nav.includes("/leads") ? (
          <Route
            path="/leads"
            element={
              <LeadsPage
                leads={visibleLeads}
                leadEvents={visibleLeadEvents}
                services={services}
                currentUserName={profile?.full_name || session.user.email}
                permissions={permissions}
                emptyMessage={leadsEmptyMessage}
                selectedLeadId={selectedLeadId}
                setSelectedLeadId={setSelectedLeadId}
                createLead={createLead}
                creatingLead={creatingLead}
                statusSavingId={statusSavingId}
                updateLeadStatus={updateLeadStatus}
                updateLeadFollowUp={updateLeadFollowUp}
                addLeadNote={addLeadNote}
                onPhoneAction={handlePhoneAction}
              />
            }
          />
        ) : null}
        {permissions.nav.includes("/clients") ? (
          <Route
            path="/clients"
            element={<ClientsPage clients={clients} leads={visibleLeads} leadEvents={visibleLeadEvents} onPhoneAction={handlePhoneAction} />}
          />
        ) : null}
        {permissions.nav.includes("/tasks") ? <Route path="/tasks" element={<TasksPage leads={visibleLeads} />} /> : null}
        {permissions.nav.includes("/settings") ? (
          <Route
            path="/settings"
            element={
              <LiveSettingsPage
                webhookEnabled={Boolean(import.meta.env.VITE_AUTOMATION_WEBHOOK_URL || import.meta.env.VITE_N8N_WEBHOOK_URL)}
                role={role}
                profile={profile}
                teamProfiles={teamProfiles}
                services={services}
                profileSaving={profileSaving}
                teamSaving={teamSaving}
                serviceSavingId={serviceSavingId}
                creatingTeamMember={creatingTeamMember}
                creatingService={creatingService}
                applyingDemoPricing={applyingDemoPricing}
                passwordSaving={passwordSaving}
                onSaveProfile={saveProfileSettings}
                onUpdateTeamMember={updateTeamMember}
                onDeleteTeamMember={deleteTeamMember}
                onCreateTeamMember={createTeamMember}
                onUpdateService={updateServiceSettings}
                onCreateService={createServiceSettings}
                onApplyDemoPricing={applyDemoPricing}
                onChangePassword={changePassword}
              />
            }
          />
        ) : null}
        <Route path="/services" element={<Navigate to="/leads" replace />} />
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const isPublicRequestRoute = location.pathname === "/request";

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setBooting(false);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setBooting(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (booting && !isPublicRequestRoute) {
    return <div className="loading-screen">Подготавливаем рабочее пространство...</div>;
  }

  if (isPublicRequestRoute) {
    return <PublicRequestPage isAuthenticated={Boolean(session)} />;
  }

  if (!session) {
    return <LoginPage onAuthenticated={setSession} />;
  }

  return <ProtectedApp session={session} onSignOut={handleSignOut} />;
}
