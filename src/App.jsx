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
  { to: "/dashboard", label: "РџР°РЅРµР»СЊ" },
  { to: "/leads", label: "Р—Р°СЏРІРєРё" },
  { to: "/clients", label: "РљР»РёРµРЅС‚С‹" },
  { to: "/tasks", label: "Р—Р°РґР°С‡Рё" },
  { to: "/settings", label: "РќР°СЃС‚СЂРѕР№РєРё" }
];

const roleLabels = {
  owner: "Р”РёСЂРµРєС‚РѕСЂ",
  manager: "РњРµРЅРµРґР¶РµСЂ",
  detailer: "РњР°СЃС‚РµСЂ"
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
  new: "РќРѕРІР°СЏ",
  contacted: "РЎРІСЏР·Р°Р»РёСЃСЊ",
  quoted: "РџСЂРµРґР»РѕР¶РµРЅРёРµ",
  scheduled: "Р—Р°РїР»Р°РЅРёСЂРѕРІР°РЅРѕ",
  in_progress: "Р’ СЂР°Р±РѕС‚Рµ",
  done: "Р“РѕС‚РѕРІРѕ",
  lost: "РћС‚РјРµРЅРµРЅРѕ"
};

const statusGroupLabels = {
  new: "РќРѕРІС‹Рµ",
  in_progress: "Р’ СЂР°Р±РѕС‚Рµ",
  done: "Р“РѕС‚РѕРІРѕ",
  lost: "РћС‚РјРµРЅРµРЅРѕ"
};

const eventLabels = {
  created: "Р—Р°СЏРІРєР° СЃРѕР·РґР°РЅР°",
  status_changed: "РЎС‚Р°С‚СѓСЃ РёР·РјРµРЅС‘РЅ",
  note_added: "Р”РѕР±Р°РІР»РµРЅР° Р·Р°РјРµС‚РєР°",
  follow_up_set: "Follow-up РѕР±РЅРѕРІР»С‘РЅ",
  assigned: "РќР°Р·РЅР°С‡РµРЅРѕ",
  price_updated: "РћР±РЅРѕРІР»РµРЅР° СЃСѓРјРјР°",
  reminder_sent: "РћС‚РїСЂР°РІР»РµРЅРѕ РЅР°РїРѕРјРёРЅР°РЅРёРµ"
};

const sourceLabels = {
  manual: "Р’СЂСѓС‡РЅСѓСЋ",
  landing: "Р›РµРЅРґРёРЅРі",
  instagram: "Instagram",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  phone: "РўРµР»РµС„РѕРЅ",
  facebook: "Facebook",
  other: "Р”СЂСѓРіРѕРµ"
};

const settingsSectionLabels = {
  profile: "РџСЂРѕС„РёР»СЊ",
  team: "РљРѕРјР°РЅРґР°",
  billing: "РўР°СЂРёС„С‹",
  integrations: "РРЅС‚РµРіСЂР°С†РёРё",
  security: "Р‘РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ"
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
    return "РќРµ Р·Р°РґР°РЅРѕ";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatShortDate(value) {
  if (!value) {
    return "вЂ”";
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
    return "РќРµ Р·Р°РґР°РЅРѕ";
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
    return "РќРµ СЃРѕРіР»Р°СЃРѕРІР°РЅРѕ";
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
    return "РџРѕР»РЅС‹Р№ РґРѕСЃС‚СѓРї Рє CRM, РєРѕРјР°РЅРґРµ, РЅР°СЃС‚СЂРѕР№РєР°Рј Рё Р°РІС‚РѕРјР°С‚РёР·Р°С†РёСЏРј.";
  }

  if (role === "detailer") {
    return "Р’РёРґРёС‚ С‚РѕР»СЊРєРѕ РЅР°Р·РЅР°С‡РµРЅРЅС‹Рµ Р·Р°СЏРІРєРё Рё СЂР°Р±РѕС‡СѓСЋ РёСЃС‚РѕСЂРёСЋ РєР»РёРµРЅС‚Р°.";
  }

  return "РЈРїСЂР°РІР»СЏРµС‚ Р·Р°СЏРІРєР°РјРё, РєР»РёРµРЅС‚Р°РјРё Рё Р·Р°РґР°С‡Р°РјРё Р±РµР· РґРѕСЃС‚СѓРїР° Рє СЃРёСЃС‚РµРјРЅС‹Рј РЅР°СЃС‚СЂРѕР№РєР°Рј.";
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
  const [googleLoading, setGoogleLoading] = useState(false);
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

        setMessage("РђРєРєР°СѓРЅС‚ СЃРѕР·РґР°РЅ. Р•СЃР»Рё Сѓ РїСЂРѕРµРєС‚Р° РІРєР»СЋС‡РµРЅРѕ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ РїРѕС‡С‚С‹, РїРѕРґС‚РІРµСЂРґРёС‚Рµ email Рё Р·Р°С‚РµРј РІРѕР№РґРёС‚Рµ.");
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
      setError(submitError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ РІРѕР№С‚Рё РІ СЃРёСЃС‚РµРјСѓ.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setGoogleLoading(true);
    setError("");
    setMessage("");

    try {
      const redirectTo = `${window.location.origin}/`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "select_account"
          }
        }
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (submitError) {
      setError(submitError.message || "Не удалось продолжить через Google.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-split">
        <section className="auth-main-card">
          <LogoWordmark />

          <div className="auth-copy">
            <h1>Р’С…РѕРґ РІ СЃРёСЃС‚РµРјСѓ</h1>
            <p>РЈРїСЂР°РІР»СЏР№С‚Рµ Р·Р°СЏРІРєР°РјРё, РєР»РёРµРЅС‚Р°РјРё Рё follow-up Р±РµР· Р»РёС€РЅРµР№ РїРµСЂРµРіСЂСѓР·РєРё.</p>
          </div>

          <div className="auth-switch">
            <button type="button" className={mode === "sign-in" ? "active" : ""} onClick={() => setMode("sign-in")}>
              Р’С…РѕРґ
            </button>
            <button type="button" className={mode === "sign-up" ? "active" : ""} onClick={() => setMode("sign-up")}>
              Р РµРіРёСЃС‚СЂР°С†РёСЏ
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <label>
                РРјСЏ
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="РРјСЏ РІР»Р°РґРµР»СЊС†Р° РёР»Рё РјРµРЅРµРґР¶РµСЂР°"
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
              РџР°СЂРѕР»СЊ
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="РњРёРЅРёРјСѓРј 6 СЃРёРјРІРѕР»РѕРІ"
                required
              />
            </label>

            <button type="submit" className="button button-primary button-full" disabled={loading}>
              {loading ? "Р’С‹РїРѕР»РЅСЏРµС‚СЃСЏ РІС…РѕРґ..." : mode === "sign-up" ? "РЎРѕР·РґР°С‚СЊ Р°РєРєР°СѓРЅС‚" : "Р’РѕР№С‚Рё"}
            </button>
          </form>

          <div className="auth-divider">
            <span>РёР»Рё</span>
          </div>

          <button
            type="button"
            className="button button-outline button-full"
            onClick={handleGoogleAuth}
            disabled={loading || googleLoading}
          >
            {googleLoading
              ? "Переходим в Google..."
              : mode === "sign-up"
                ? "Зарегистрироваться через Google"
                : "Войти через Google"}
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
              вЂњРЎРёСЃС‚РµРјР° РЅР°РєРѕРЅРµС†-С‚Рѕ СЃРѕР±СЂР°Р»Р° Р·Р°СЏРІРєРё, follow-up Рё РєРѕРјР°РЅРґСѓ РІ РѕРґРЅРѕРј РјРµСЃС‚Рµ. РЎС‚Р°Р»Рѕ РїРѕРЅСЏС‚РЅРѕ, РєС‚Рѕ РІРµРґС‘С‚ РєР»РёРµРЅС‚Р° Рё С‡С‚Рѕ РґРµР»Р°С‚СЊ РґР°Р»СЊС€Рµ.вЂќ
            </p>
            <span>Р®СЂРёР№, РІР»Р°РґРµР»РµС† РґРµС‚РµР№Р»РёРЅРі-С†РµРЅС‚СЂР°</span>
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
        setError(servicesError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ СѓСЃР»СѓРіРё.");
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
        setError(webhookError.message || "Р—Р°СЏРІРєР° СЃРѕР·РґР°РЅР°, РЅРѕ РІРЅРµС€РЅРёР№ webhook Р°РІС‚РѕРјР°С‚РёР·Р°С†РёРё РЅРµ РѕС‚СЂР°Р±РѕС‚Р°Р».");
      }

      setSuccessMessage("Р—Р°СЏРІРєР° СѓСЃРїРµС€РЅРѕ РѕС‚РїСЂР°РІР»РµРЅР°. РњРµРЅРµРґР¶РµСЂ СѓР¶Рµ РјРѕР¶РµС‚ РѕР±СЂР°Р±РѕС‚Р°С‚СЊ РµС‘ РІ CRM.");
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
      setError(submitError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ Р·Р°СЏРІРєСѓ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="public-shell">
      <section className="public-landing-card">
        <div className="public-copy-column">
          <LogoWordmark />
          <span className="eyebrow">РћРЅР»Р°Р№РЅ-Р·Р°СЏРІРєР°</span>
          <h1>Р—Р°РїРёС€РёС‚РµСЃСЊ РЅР° РґРµС‚РµР№Р»РёРЅРі Р±РµР· Р·РІРѕРЅРєРѕРІ Рё РѕР¶РёРґР°РЅРёСЏ.</h1>
          <p>
            РћСЃС‚Р°РІСЊС‚Рµ РєРѕРЅС‚Р°РєС‚, СѓСЃР»СѓРіСѓ Рё СѓРґРѕР±РЅС‹Р№ СЃР»РѕС‚. CRM СЃСЂР°Р·Сѓ СЃРѕР·РґР°СЃС‚ РєР°СЂС‚РѕС‡РєСѓ РєР»РёРµРЅС‚Р°, Р·Р°СЏРІРєСѓ Рё follow-up РґР»СЏ РєРѕРјР°РЅРґС‹.
          </p>
          <div className="public-pill-row">
            <span>Р‘С‹СЃС‚СЂС‹Р№ РєРѕРЅС‚Р°РєС‚</span>
            <span>CRM-СЃРёРЅС…СЂРѕРЅРёР·Р°С†РёСЏ</span>
            <span>РђРІС‚РѕРЅРѕРјРЅС‹Р№ follow-up</span>
          </div>
          {isAuthenticated ? <p className="public-auth-hint">Р’С‹ СѓР¶Рµ РІРѕС€Р»Рё РІ CRM Рё СѓРІРёРґРёС‚Рµ РЅРѕРІСѓСЋ Р·Р°СЏРІРєСѓ СЃСЂР°Р·Сѓ РїРѕСЃР»Рµ РѕС‚РїСЂР°РІРєРё.</p> : null}
        </div>

        <div className="public-form-card">
          <div className="section-title">
            <div>
              <span className="eyebrow">Р¤РѕСЂРјР° РєР»РёРµРЅС‚Р°</span>
              <h2>РќРѕРІР°СЏ Р·Р°СЏРІРєР°</h2>
            </div>
          </div>

          {loadingServices ? <p className="hint-text">Р—Р°РіСЂСѓР¶Р°РµРј РґРѕСЃС‚СѓРїРЅС‹Рµ СѓСЃР»СѓРіРё...</p> : null}
          {error ? <div className="notice notice-error">{error}</div> : null}
          {successMessage ? <div className="notice notice-success">{successMessage}</div> : null}

          <form className="form-grid-shell" onSubmit={handleSubmit}>
            <div className="form-grid two-columns">
              <label>
                РРјСЏ
                <input name="client_name" value={form.client_name} onChange={updateField} placeholder="Victor Sandu" required />
              </label>
              <label>
                РўРµР»РµС„РѕРЅ
                <input name="phone" value={form.phone} onChange={updateField} placeholder="+373..." required />
              </label>
              <label>
                РЈСЃР»СѓРіР°
                <select name="service_id" value={form.service_id} onChange={updateField} disabled={loadingServices}>
                  <option value="">Р’С‹Р±РµСЂРёС‚Рµ СѓСЃР»СѓРіСѓ</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                РњР°СЂРєР°
                <input name="car_make" value={form.car_make} onChange={updateField} placeholder="Audi" />
              </label>
              <label>
                РњРѕРґРµР»СЊ / РіРѕРґ
                <div className="split-input">
                  <input name="car_model" value={form.car_model} onChange={updateField} placeholder="Q7" />
                  <input name="car_year" type="number" min="1950" max="2100" value={form.car_year} onChange={updateField} placeholder="2020" />
                </div>
              </label>
              <label>
                РќРѕРјРµСЂ Р°РІС‚Рѕ
                <input name="car_plate" value={form.car_plate} onChange={updateField} placeholder="KCC777" />
              </label>
              <label>
                Р–РµР»Р°РµРјР°СЏ РґР°С‚Р°
                <input name="preferred_date" type="date" value={form.preferred_date} onChange={updateField} />
              </label>
              <label>
                Р–РµР»Р°РµРјРѕРµ РІСЂРµРјСЏ
                <input name="preferred_time" value={form.preferred_time} onChange={updateField} placeholder="РџРѕСЃР»Рµ 18:00" />
              </label>
              <label>
                РђРґСЂРµСЃ
              </label>
            </div>

            <label>
              РљРѕРјРјРµРЅС‚Р°СЂРёР№
              <textarea
                name="comment"
                value={form.comment}
                onChange={updateField}
                rows="4"
                placeholder="РћРїРёС€РёС‚Рµ Р¶РµР»Р°РµРјСѓСЋ СѓСЃР»СѓРіСѓ, СЃРѕСЃС‚РѕСЏРЅРёРµ Р°РІС‚Рѕ Рё РїРѕР¶РµР»Р°РЅРёСЏ."
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
              {saving ? "РћС‚РїСЂР°РІР»СЏРµРј..." : "РћС‚РїСЂР°РІРёС‚СЊ Р·Р°СЏРІРєСѓ"}
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
            РќРѕРІР°СЏ Р·Р°СЏРІРєР°
          </NavLink>
        ) : null}
        {permissions.nav.includes("/settings") ? (
          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? "button button-outline active-outline" : "button button-outline")}
          >
            РќР°СЃС‚СЂРѕР№РєРё
          </NavLink>
        ) : null}
        <div className="topbar-user">
          <div className="user-meta">
            <strong>{roleLabels[role] || roleLabels.manager}</strong>
            <span>{fullName}</span>
          </div>
          <Avatar name={fullName} />
          <button type="button" className="ghost-action" onClick={onSignOut}>
            Р’С‹Р№С‚Рё
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
          <span>{metrics.newCount} РЅРѕРІС‹С…</span>
          <span>{metrics.openTasks} РѕС‚РєСЂС‹С‚С‹С… Р·Р°РґР°С‡</span>
          <span>{metrics.followUpCount} follow-up РЅР° СЃРµРіРѕРґРЅСЏ</span>
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
        <MetricCard icon="CL" label="Р’СЃРµРіРѕ РєР»РёРµРЅС‚РѕРІ" value={metrics.clientsCount} accent />
        <MetricCard icon="TD" label="Р—Р°СЏРІРєРё СЃРµРіРѕРґРЅСЏ" value={metrics.todayLeads} />
        <MetricCard icon="в‚¬" label="Р’С‹СЂСѓС‡РєР° РјРµСЃСЏС†" value={formatCurrency(metrics.monthRevenue)} />
        <MetricCard icon="TK" label="Р—Р°РґР°С‡Рё РѕС‚РєСЂС‹С‚С‹" value={metrics.openTasks} />
      </div>

      <section className="surface-card month-summary-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">Р В¤Р С‘Р Р…Р В°Р Р…РЎРѓРЎвЂ№</span>
            <h2>Р ВРЎвЂљР С•Р С–Р С‘ Р СР ВµРЎРѓРЎРЏРЎвЂ Р В°</h2>
          </div>
        </div>

        <div className="month-summary-grid">
          <article className="month-summary-stat">
            <strong>{metrics.monthClosedLeads}</strong>
            <span>Р вЂ”Р В°Р С”РЎР‚РЎвЂ№РЎвЂљР С• Р В·Р В°РЎРЏР Р†Р С•Р С”</span>
          </article>
          <article className="month-summary-stat">
            <strong>{formatCurrency(metrics.monthAverageTicket)}</strong>
            <span>Р РЋРЎР‚Р ВµР Т‘Р Р…Р С‘Р в„– РЎвЂЎР ВµР С”</span>
          </article>
          <article className="month-summary-stat">
            <strong>{formatCurrency(metrics.monthRevenue)}</strong>
            <span>Р С™Р В°РЎРѓРЎРѓР В° Р В·Р В° Р СР ВµРЎРѓРЎРЏРЎвЂ </span>
          </article>
        </div>

        <div className="data-table compact-table">
          <div className="table-head month-revenue-head">
            <span>Р Р€РЎРѓР В»РЎС“Р С–Р В°</span>
            <span>Р вЂ”Р В°РЎРЏР Р†Р С•Р С”</span>
            <span>Р РЋРЎС“Р СР СР В°</span>
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
            <div className="table-empty-state">Р вЂ™ РЎРЊРЎвЂљР С•Р С Р СР ВµРЎРѓРЎРЏРЎвЂ Р Вµ Р С—Р С•Р С”Р В° Р Р…Р ВµРЎвЂљ Р В·Р В°Р С”РЎР‚РЎвЂ№РЎвЂљРЎвЂ№РЎвЂ¦ Р В·Р В°РЎРЏР Р†Р С•Р С” Р Т‘Р В»РЎРЏ Р С”Р В°РЎРѓРЎРѓРЎвЂ№.</div>
          )}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-title">
          <div>
            <span className="eyebrow">РћРїРµСЂР°С‚РёРІРЅР°СЏ СЃРІРѕРґРєР°</span>
            <h2>РџРѕСЃР»РµРґРЅРёРµ Р·Р°СЏРІРєРё</h2>
          </div>
        </div>

        <div className="data-table">
          <div className="table-head">
            <span>РљР»РёРµРЅС‚</span>
            <span>РЈСЃР»СѓРіР°</span>
            <span>РЎС‚Р°С‚СѓСЃ</span>
            <span>Р”Р°С‚Р°</span>
            <span>РЎСѓРјРјР°</span>
            <span>Р”РµР№СЃС‚РІРёРµ</span>
          </div>

          {leads.length ? (
            leads.slice(0, 6).map((lead) => (
              <div key={lead.id} className="table-body-row">
                <span className="cell-strong">{lead.clients?.name || "Р‘РµР· РёРјРµРЅРё"}</span>
                <span>{lead.services?.name || "РќРµ РІС‹Р±СЂР°РЅР°"}</span>
                <span>
                  <StatusBadge status={lead.status} />
                </span>
                <span>{formatShortDate(lead.created_at)}</span>
                <span className="amount-cell">{formatCurrency(lead.estimated_price)}</span>
                <span>
                  <NavLink to="/leads" className="table-link" onClick={() => onOpenLead(lead.id)}>
                    РћС‚РєСЂС‹С‚СЊ
                  </NavLink>
                </span>
              </div>
            ))
          ) : (
            <div className="table-empty-state">РџРѕРєР° РЅРµС‚ Р·Р°СЏРІРѕРє РґР»СЏ РѕС‚РѕР±СЂР°Р¶РµРЅРёСЏ.</div>
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
          <span className="eyebrow">Р”РѕР±Р°РІР»РµРЅРёРµ</span>
          <h2>РќРѕРІР°СЏ Р·Р°СЏРІРєР°</h2>
        </div>
      </div>

      <form className="form-grid-shell" onSubmit={handleSubmit}>
        <div className="form-grid two-columns">
          <label>
            РРјСЏ РєР»РёРµРЅС‚Р°
            <input name="client_name" value={form.client_name} onChange={updateField} placeholder="Andrei Popa" required />
          </label>
          <label>
            РўРµР»РµС„РѕРЅ
            <input name="phone" value={form.phone} onChange={updateField} placeholder="+373..." required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={updateField} placeholder="optional@email.com" />
          </label>
          <label>
            РЈСЃР»СѓРіР°
            <select name="service_id" value={form.service_id} onChange={updateField}>
              <option value="">Р‘РµР· СѓСЃР»СѓРіРё</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            РСЃС‚РѕС‡РЅРёРє
            <select name="source" value={form.source} onChange={updateField}>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {formatLabel(source)}
                </option>
              ))}
            </select>
          </label>
          <label>
            РЎСѓРјРјР°
            <input name="estimated_price" type="number" min="0" value={form.estimated_price} onChange={updateField} placeholder="120" />
          </label>
          <label>
            Р”Р°С‚Р°
            <input name="preferred_date" type="date" value={form.preferred_date} onChange={updateField} />
          </label>
          <label>
            Р’СЂРµРјСЏ
            <input name="preferred_time" value={form.preferred_time} onChange={updateField} placeholder="РџРѕСЃР»Рµ 18:00" />
          </label>
          <label>
            Follow-up
            <input name="follow_up_at" type="datetime-local" value={form.follow_up_at} onChange={updateField} />
          </label>
          <label>
            РќРѕРјРµСЂ Р°РІС‚Рѕ
            <input name="car_plate" value={form.car_plate} onChange={updateField} placeholder="KAA123" />
          </label>
          <label>
            РњР°СЂРєР°
            <input name="car_make" value={form.car_make} onChange={updateField} placeholder="BMW" />
          </label>
          <label>
            РњРѕРґРµР»СЊ / РіРѕРґ
            <div className="split-input">
              <input name="car_model" value={form.car_model} onChange={updateField} placeholder="X5" />
              <input name="car_year" type="number" min="1950" max="2100" value={form.car_year} onChange={updateField} placeholder="2019" />
            </div>
          </label>
        </div>

        <label>
          РђРґСЂРµСЃ
          <input name="address" value={form.address} onChange={updateField} placeholder="Botanica, Chisinau" />
        </label>

        <label>
          РљРѕРјРјРµРЅС‚Р°СЂРёР№
          <textarea name="comment" value={form.comment} onChange={updateField} rows="4" placeholder="Р§С‚Рѕ РїРѕРїСЂРѕСЃРёР» РєР»РёРµРЅС‚, СЃСЂРѕС‡РЅРѕСЃС‚СЊ, РѕР¶РёРґР°РЅРёСЏ..." />
        </label>

        <button type="submit" className="button button-primary" disabled={creatingLead}>
          {creatingLead ? "РЎРѕР·РґР°С‘Рј..." : "Р”РѕР±Р°РІРёС‚СЊ Р·Р°СЏРІРєСѓ"}
        </button>
      </form>
    </section>
  );
}

function LeadCard({ lead, isActive, onClick }) {
  return (
    <button type="button" className={isActive ? "lead-kanban-card active" : "lead-kanban-card"} onClick={onClick}>
      <div className="lead-kanban-header">
        <strong>{lead.clients?.name || "Р‘РµР· РёРјРµРЅРё"}</strong>
        <Avatar name={lead.clients?.name || "Client"} />
      </div>
      <span>{lead.services?.name || "РЈСЃР»СѓРіР° РЅРµ РІС‹Р±СЂР°РЅР°"}</span>
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
          <h1>Р—Р°СЏРІРєРё</h1>
          <p>Pipeline Р·Р°СЏРІРѕРє, Р±С‹СЃС‚СЂС‹Р№ РІС‹Р±РѕСЂ РєР»РёРµРЅС‚Р° Рё СЂР°Р±РѕС‡Р°СЏ РєР°СЂС‚РѕС‡РєР° СЃРїСЂР°РІР°.</p>
        </div>
        <div className="page-header-actions">
          {permissions.canCreateLead ? (
            <button type="button" className="button button-primary" onClick={() => setShowComposer((current) => !current)}>
              {showComposer ? "РЎРєСЂС‹С‚СЊ С„РѕСЂРјСѓ" : "Р”РѕР±Р°РІРёС‚СЊ Р·Р°СЏРІРєСѓ"}
            </button>
          ) : null}
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="РџРѕРёСЃРє РїРѕ РєР»РёРµРЅС‚Сѓ, СѓСЃР»СѓРіРµ, РЅРѕРјРµСЂСѓ"
          />
        </div>
      </div>

      {permissions.canCreateLead && showComposer ? <NewLeadForm services={services} onCreateLead={createLead} creatingLead={creatingLead} /> : null}
      {permissions.canCreateLead && !showComposer ? (
        <section className="surface-card compact-note-card composer-hint-card">
          <span className="eyebrow">Р‘С‹СЃС‚СЂС‹Р№ РІРІРѕРґ</span>
          <h2>РќРѕРІР°СЏ Р·Р°СЏРІРєР° СЃРєСЂС‹С‚Р°</h2>
          <p>РћС‚РєСЂРѕР№С‚Рµ С„РѕСЂРјСѓ С‚РѕР»СЊРєРѕ РєРѕРіРґР° РЅСѓР¶РЅРѕ РІРЅРµСЃС‚Рё Р»РёРґ РІСЂСѓС‡РЅСѓСЋ. РўР°Рє pipeline Рё СЂР°Р±РѕС‡Р°СЏ РєР°СЂС‚РѕС‡РєР° РѕСЃС‚Р°СЋС‚СЃСЏ РІ С„РѕРєСѓСЃРµ РІРѕ РІСЂРµРјСЏ Р·РІРѕРЅРєРѕРІ Рё РѕР±СЂР°Р±РѕС‚РєРё РІС…РѕРґСЏС‰РёС… Р·Р°СЏРІРѕРє.</p>
        </section>
      ) : null}

      {!permissions.canCreateLead ? (
        <section className="surface-card compact-note-card">
          <span className="eyebrow">Р РѕР»СЊ</span>
          <h2>РћРїРµСЂР°С†РёРѕРЅРЅС‹Р№ РґРѕСЃС‚СѓРї</h2>
          <p>РњР°СЃС‚РµСЂ РІРёРґРёС‚ С‚РѕР»СЊРєРѕ РЅР°Р·РЅР°С‡РµРЅРЅС‹Рµ Р·Р°СЏРІРєРё. РЎС‚Р°С‚СѓСЃС‹, follow-up Рё РІРЅСѓС‚СЂРµРЅРЅРёРµ Р·Р°РјРµС‚РєРё РѕСЃС‚Р°СЋС‚СЃСЏ Сѓ РјРµРЅРµРґР¶РµСЂР° Рё РґРёСЂРµРєС‚РѕСЂР°.</p>
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
                  <div className="kanban-empty">{leads.length ? "РќРµС‚ РєР°СЂС‚РѕС‡РµРє РІ СЌС‚РѕР№ РєРѕР»РѕРЅРєРµ." : emptyMessage}</div>
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
        <p>{item.note || "Р‘РµР· РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅРѕРіРѕ РєРѕРјРјРµРЅС‚Р°СЂРёСЏ."}</p>
        <small>{item.created_by ? currentUserName || "РљРѕРјР°РЅРґР° CRM" : "РЎРёСЃС‚РµРјР°"}</small>
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
        <h2>Р—Р°СЏРІРєР° РЅРµ РІС‹Р±СЂР°РЅР°</h2>
        <p>Р’С‹Р±РµСЂРёС‚Рµ РєР°СЂС‚РѕС‡РєСѓ РёР· pipeline, Рё Р·РґРµСЃСЊ РѕС‚РєСЂРѕРµС‚СЃСЏ РїРѕР»РЅР°СЏ РёРЅС„РѕСЂРјР°С†РёСЏ РїРѕ РєР»РёРµРЅС‚Сѓ Рё СЂР°Р±РѕС‚Рµ.</p>
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
            <span className="eyebrow">РљР°СЂС‚РѕС‡РєР° Р·Р°СЏРІРєРё</span>
            <h2>{lead.clients?.name || "РљР»РёРµРЅС‚ Р±РµР· РёРјРµРЅРё"}</h2>
            <p>
              {lead.clients?.phone || "Р‘РµР· С‚РµР»РµС„РѕРЅР°"}{lead.clients?.email ? ` вЂў ${lead.clients.email}` : ""}
            </p>
          </div>
        </div>

        <div className="client-hero-actions">
          <button type="button" className="button button-outline" onClick={() => onPhoneAction?.(lead.clients?.phone)}>
            РџРѕР·РІРѕРЅРёС‚СЊ
          </button>
          <a
            className="button button-outline"
            href={lead.clients?.phone ? getWhatsAppUrl(lead.clients.phone) : "#"}
            target="_blank"
            rel="noreferrer"
          >
            РќР°РїРёСЃР°С‚СЊ
          </a>
          <StatusBadge status={lead.status} />
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-card-item">
          <span>РЈСЃР»СѓРіР°</span>
          <strong>{lead.services?.name || "РќРµ РІС‹Р±СЂР°РЅР°"}</strong>
        </div>
        <div className="detail-card-item">
          <span>РЎСѓРјРјР°</span>
          <strong>{formatCurrency(lead.estimated_price)}</strong>
        </div>
        <div className="detail-card-item">
          <span>РђРІС‚РѕРјРѕР±РёР»СЊ</span>
          <strong>{[lead.clients?.car_make, lead.clients?.car_model, lead.clients?.car_year].filter(Boolean).join(" ") || "РќРµ СѓРєР°Р·Р°РЅ"}</strong>
        </div>
        <div className="detail-card-item">
          <span>РСЃС‚РѕС‡РЅРёРє</span>
          <strong>{formatLabel(lead.source)}</strong>
        </div>
        <div className="detail-card-item">
          <span>РџСЂРµРґРїРѕС‡С‚РёС‚РµР»СЊРЅС‹Р№ СЃР»РѕС‚</span>
          <strong>{formatPreferredSlot(lead.preferred_date, lead.preferred_time)}</strong>
        </div>
        <div className="detail-card-item">
          <span>Follow-up</span>
          <strong>{lead.follow_up_at ? formatDate(lead.follow_up_at) : "РќРµ РЅР°Р·РЅР°С‡РµРЅ"}</strong>
        </div>
      </div>

      <div className="detail-stack">
        <div className="detail-card-item block">
          <span>РђРґСЂРµСЃ</span>
          <p>{lead.address || "РђРґСЂРµСЃ РїРѕРєР° РЅРµ СѓРєР°Р·Р°РЅ."}</p>
        </div>

        <div className="detail-card-item block">
          <span>РљРѕРјРјРµРЅС‚Р°СЂРёР№ РєР»РёРµРЅС‚Р°</span>
          <p>{lead.comment || "РљРѕРјРјРµРЅС‚Р°СЂРёР№ РЅРµ РґРѕР±Р°РІР»РµРЅ."}</p>
        </div>
      </div>

      <div className="detail-tabs">
        <button type="button" className="tab-button active">
          РСЃС‚РѕСЂРёСЏ
        </button>
        <button type="button" className="tab-button">
          Р—Р°РјРµС‚РєРё
        </button>
      </div>

      {permissions.canEditLead ? (
        <div className="followup-toolbar">
          <form className="followup-form" onSubmit={handleFollowUpSubmit}>
            <input type="datetime-local" value={followUpInput} onChange={(event) => setFollowUpInput(event.target.value)} />
            <button type="submit" className="button button-primary" disabled={savingFollowUp}>
              {savingFollowUp ? "РЎРѕС…СЂР°РЅСЏРµРј..." : "РЎРѕС…СЂР°РЅРёС‚СЊ follow-up"}
            </button>
            <button
              type="button"
              className="button button-outline"
              disabled={savingFollowUp || (!lead.follow_up_at && !followUpInput)}
              onClick={handleClearFollowUp}
            >
              РћС‡РёСЃС‚РёС‚СЊ
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
                {statusSavingId === lead.id && status === lead.status ? "РЎРѕС…СЂР°РЅСЏРµРј..." : statusLabels[status] || status}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="hint-text">РЈ РјР°СЃС‚РµСЂР° С‚РѕР»СЊРєРѕ РїСЂРѕСЃРјРѕС‚СЂ. РЎС‚Р°С‚СѓСЃ, follow-up Рё Р·Р°РјРµС‚РєРё РёР·РјРµРЅСЏСЋС‚СЃСЏ РјРµРЅРµРґР¶РµСЂРѕРј РёР»Рё РґРёСЂРµРєС‚РѕСЂРѕРј.</p>
      )}

      {permissions.canEditLead ? (
        <form className="note-composer" onSubmit={handleAddNote}>
          <label>
            Р’РЅСѓС‚СЂРµРЅРЅСЏСЏ Р·Р°РјРµС‚РєР°
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows="3" placeholder="РџРѕР·РІРѕРЅРёР»Рё РєР»РёРµРЅС‚Сѓ, Р¶РґС‘Рј РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ..." />
          </label>
          <button type="submit" className="button button-primary" disabled={savingNote}>
            {savingNote ? "РЎРѕС…СЂР°РЅСЏРµРј..." : "Р”РѕР±Р°РІРёС‚СЊ Р·Р°РјРµС‚РєСѓ"}
          </button>
        </form>
      ) : null}

      <div className="timeline-shell">
        <div className="timeline-column">
          {leadEvents.length ? (
            leadEvents.map((item) => <TimelineEvent key={item.id} item={item} currentUserName={currentUserName} />)
          ) : (
            <div className="timeline-empty">РСЃС‚РѕСЂРёСЏ РїРѕСЏРІРёС‚СЃСЏ Р·РґРµСЃСЊ РїРѕСЃР»Рµ РїРµСЂРІС‹С… РёР·РјРµРЅРµРЅРёР№ РїРѕ Р·Р°СЏРІРєРµ.</div>
          )}
        </div>

        <aside className="notes-sidebar">
          <div className="notes-sidebar-head">
            <strong>Р—Р°РјРµС‚РєРё</strong>
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
            <div className="notes-empty">РџРѕРєР° РЅРµС‚ РІРЅСѓС‚СЂРµРЅРЅРёС… Р·Р°РјРµС‚РѕРє.</div>
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
          <h1>РљР»РёРµРЅС‚С‹</h1>
          <p>Р‘Р°Р·Р° РєР»РёРµРЅС‚РѕРІ СЃ РёСЃС‚РѕСЂРёРµР№ РІР·Р°РёРјРѕРґРµР№СЃС‚РІРёР№, Р·Р°СЏРІРєР°РјРё Рё Р·Р°РјРµС‚РєР°РјРё РєРѕРјР°РЅРґС‹.</p>
        </div>
      </div>

      <div className="clients-layout">
        <section className="surface-card client-list-card">
          <div className="section-title compact">
            <h2>РЎРїРёСЃРѕРє РєР»РёРµРЅС‚РѕРІ</h2>
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
                    <span className="eyebrow">РљР°СЂС‚РѕС‡РєР° РєР»РёРµРЅС‚Р°</span>
                    <h2>{selectedClient.name}</h2>
                    <p>
                      {selectedClient.phone || "РўРµР»РµС„РѕРЅ РЅРµ СѓРєР°Р·Р°РЅ"}
                      {selectedClient.email ? ` вЂў ${selectedClient.email}` : ""}
                    </p>
                  </div>
                </div>
                <div className="client-hero-actions">
                  <button type="button" className="button button-outline" onClick={() => onPhoneAction?.(selectedClient.phone)}>
                    РџРѕР·РІРѕРЅРёС‚СЊ
                  </button>
                  <a
                    className="button button-outline"
                    href={selectedClient.phone ? getWhatsAppUrl(selectedClient.phone) : "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    РќР°РїРёСЃР°С‚СЊ
                  </a>
                  <NavLink to="/leads" className="button button-primary">
                    РќРѕРІР°СЏ Р·Р°СЏРІРєР°
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
                    {tab === "history" ? "РСЃС‚РѕСЂРёСЏ" : tab === "leads" ? "Р—Р°СЏРІРєРё" : "Р—Р°РјРµС‚РєРё"}
                  </button>
                ))}
              </div>

              {activeTab === "history" ? (
                <div className="timeline-column">
                  {clientEvents.length ? (
                    clientEvents.map((item) => <TimelineEvent key={item.id} item={item} currentUserName="РљРѕРјР°РЅРґР° CRM" />)
                  ) : (
                    <div className="timeline-empty">РЈ СЌС‚РѕРіРѕ РєР»РёРµРЅС‚Р° РµС‰С‘ РЅРµС‚ РёСЃС‚РѕСЂРёРё РІР·Р°РёРјРѕРґРµР№СЃС‚РІРёР№.</div>
                  )}
                </div>
              ) : null}

              {activeTab === "leads" ? (
                <div className="data-table compact-table">
                  <div className="table-head">
                    <span>Р—Р°СЏРІРєР°</span>
                    <span>РЈСЃР»СѓРіР°</span>
                    <span>РЎС‚Р°С‚СѓСЃ</span>
                    <span>Р”Р°С‚Р°</span>
                    <span>РЎСѓРјРјР°</span>
                    <span>Р”РµР№СЃС‚РІРёРµ</span>
                  </div>
                  {clientLeads.length ? (
                    clientLeads.map((lead) => (
                      <div key={lead.id} className="table-body-row">
                        <span className="cell-strong">{selectedClient.name}</span>
                        <span>{lead.services?.name || "РќРµ РІС‹Р±СЂР°РЅР°"}</span>
                        <span>
                          <StatusBadge status={lead.status} />
                        </span>
                        <span>{formatShortDate(lead.created_at)}</span>
                        <span className="amount-cell">{formatCurrency(lead.estimated_price)}</span>
                        <span>
                          <NavLink to="/leads" className="table-link">
                            РћС‚РєСЂС‹С‚СЊ
                          </NavLink>
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="table-empty-state">РЈ РєР»РёРµРЅС‚Р° РїРѕРєР° РЅРµС‚ Р·Р°СЏРІРѕРє.</div>
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
                    <div className="notes-empty">Р’РЅСѓС‚СЂРµРЅРЅРёС… Р·Р°РјРµС‚РѕРє РїРѕ РєР»РёРµРЅС‚Сѓ РїРѕРєР° РЅРµС‚.</div>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <div className="table-empty-state">РљР»РёРµРЅС‚С‹ РїРѕРєР° РЅРµ Р·Р°РіСЂСѓР¶РµРЅС‹.</div>
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
          <h1>Р—Р°РґР°С‡Рё</h1>
          <p>РћС‚РєСЂС‹С‚С‹Рµ follow-up Рё СЂР°Р±РѕС‡РёРµ Р·Р°СЏРІРєРё, РєРѕС‚РѕСЂС‹Рµ С‚СЂРµР±СѓСЋС‚ РґРµР№СЃС‚РІРёСЏ РєРѕРјР°РЅРґС‹.</p>
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
                    <strong>{lead.clients?.name || "РљР»РёРµРЅС‚ Р±РµР· РёРјРµРЅРё"}</strong>
                    <span>{lead.services?.name || "Р‘РµР· СѓСЃР»СѓРіРё"}</span>
                  </div>
                </div>
                <div className="task-item-side">
                  <StatusBadge status={lead.status} />
                  <small>{lead.follow_up_at ? formatDate(lead.follow_up_at) : formatDate(lead.created_at)}</small>
                </div>
              </article>
            ))
          ) : (
            <div className="table-empty-state">РЎРµР№С‡Р°СЃ РЅРµС‚ РѕС‚РєСЂС‹С‚С‹С… Р·Р°РґР°С‡ РґР»СЏ РєРѕРјР°РЅРґС‹.</div>
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
          <h1>РЈСЃР»СѓРіРё</h1>
          <p>РљР°С‚Р°Р»РѕРі СѓСЃР»СѓРі СЃ Р±Р°Р·РѕРІРѕР№ СЃС‚РѕРёРјРѕСЃС‚СЊСЋ Рё РґР»РёС‚РµР»СЊРЅРѕСЃС‚СЊСЋ РґР»СЏ РјРµРЅРµРґР¶РµСЂР°.</p>
        </div>
      </div>

      <div className="service-grid">
        {services.map((service) => (
          <article key={service.id} className="surface-card service-card">
            <MiniIcon label="SR" />
            <strong>{service.name}</strong>
            <span>{formatCurrency(service.base_price)}</span>
            <p>{service.duration_minutes} РјРёРЅ.</p>
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
            <strong>РўРµРєСѓС‰Р°СЏ СЂРѕР»СЊ</strong>
            <p>{roleLabels[role] || roleLabels.manager}</p>
          </article>
          <article className="settings-form-card">
            <strong>Р Р°Р±РѕС‡Р°СЏ Р·РѕРЅР°</strong>
            <p>CRM РїРѕРґРєР»СЋС‡РµРЅР° Рє Supabase Рё РёСЃРїРѕР»СЊР·СѓРµС‚ Р±СЂР°СѓР·РµСЂРЅСѓСЋ Р°СѓС‚РµРЅС‚РёС„РёРєР°С†РёСЋ РґР»СЏ С‚РµРєСѓС‰РµРіРѕ РїСЂРѕС„РёР»СЏ.</p>
          </article>
        </div>
      );
    }

    if (activeSection === "team") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <strong>РљРѕРјР°РЅРґР°</strong>
            <p>Р РѕР»Рё СѓР¶Рµ СЂР°Р·РІРµРґРµРЅС‹ РЅР° РґРёСЂРµРєС‚РѕСЂР°, РјРµРЅРµРґР¶РµСЂР° Рё РјР°СЃС‚РµСЂР°. РЎР»РµРґСѓСЋС‰РёР№ СЃР»РѕР№ вЂ” РѕС‚РґРµР»СЊРЅС‹Рµ СЂРµР°Р»СЊРЅС‹Рµ Р°РєРєР°СѓРЅС‚С‹ РЅР° РґРµРјРѕ Рё РїСЂРѕРґР°Р¶Сѓ.</p>
          </article>
        </div>
      );
    }

    if (activeSection === "billing") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <strong>РўР°СЂРёС„</strong>
            <p>РЎРµР№С‡Р°СЃ СЌС‚Рѕ MVP-СЃР»РѕР№. РџРѕРґРїРёСЃРѕС‡РЅР°СЏ SaaS-РјРѕРґРµР»СЊ Р·Р°РєСЂРµРїР»РµРЅР° РІ roadmap Рё Р±СѓРґРµС‚ РІС‹РЅРµСЃРµРЅР° РїРѕСЃР»Рµ СЃС‚Р°Р±РёР»РёР·Р°С†РёРё onboarding Рё UX.</p>
          </article>
        </div>
      );
    }

    if (activeSection === "integrations") {
      return (
        <div className="settings-panel-stack">
          <article className="settings-form-card">
            <strong>РђРІС‚РѕРјР°С‚РёР·Р°С†РёСЏ</strong>
            <p>
              {webhookEnabled
                ? "Р’РЅРµС€РЅРёР№ webhook Р°РІС‚РѕРјР°С‚РёР·Р°С†РёРё РІРєР»СЋС‡С‘РЅ. CRM РјРѕР¶РµС‚ РѕС‚РїСЂР°РІР»СЏС‚СЊ СЃРѕР±С‹С‚РёСЏ РІ РґРѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Р№ automation-layer."
                : "Р’РЅРµС€РЅРёР№ webhook РЅРµ РѕР±СЏР·Р°С‚РµР»РµРЅ. РћСЃРЅРѕРІРЅС‹Рµ СѓРІРµРґРѕРјР»РµРЅРёСЏ Рё РЅР°РїРѕРјРёРЅР°РЅРёСЏ СѓР¶Рµ РїРµСЂРµРІРµРґРµРЅС‹ РЅР° Supabase Edge Functions."}
            </p>
          </article>
          <article className="settings-form-card">
            <strong>Telegram</strong>
            <p>РћРїРѕРІРµС‰РµРЅРёСЏ РїРѕ РЅРѕРІС‹Рј Р·Р°СЏРІРєР°Рј, follow-up Рё daily digest СѓР¶Рµ СЂР°Р±РѕС‚Р°СЋС‚ С‡РµСЂРµР· РЅР°С‚РёРІРЅС‹Рµ Edge Functions РїСЂРѕРµРєС‚Р°.</p>
          </article>
        </div>
      );
    }

    return (
      <div className="settings-panel-stack">
        <article className="settings-form-card">
          <strong>Р‘РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ</strong>
          <p>RLS, rate limiting РґР»СЏ public request Рё server-side Zod validation СѓР¶Рµ РІРЅРµРґСЂРµРЅС‹ Рё РїСЂРѕРІРµСЂРµРЅС‹ live.</p>
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
            <strong>Р СџРЎР‚Р С•РЎвЂћР С‘Р В»РЎРЉ</strong>
            <form className="settings-edit-form" onSubmit={handleProfileSubmit}>
              <label>
                Р ВР СРЎРЏ Р Р† CRM
                <input
                  value={profileForm.full_name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, full_name: event.target.value }))}
                  placeholder="Р ВР СРЎРЏ Р Р†Р В»Р В°Р Т‘Р ВµР В»РЎРЉРЎвЂ Р В° Р С‘Р В»Р С‘ Р СР ВµР Р…Р ВµР Т‘Р В¶Р ВµРЎР‚Р В°"
                />
              </label>
              <label>
                Telegram chat id
                <input
                  value={profileForm.telegram_chat_id}
                  onChange={(event) => setProfileForm((current) => ({ ...current, telegram_chat_id: event.target.value }))}
                  placeholder="Р вЂќР В»РЎРЏ Р В»Р С‘РЎвЂЎР Р…РЎвЂ№РЎвЂ¦ РЎС“Р Р†Р ВµР Т‘Р С•Р СР В»Р ВµР Р…Р С‘Р в„–"
                />
              </label>
              <div className="settings-action-row">
                <span className="hint-text">Р ВўР ВµР С”РЎС“РЎвЂ°Р В°РЎРЏ РЎР‚Р С•Р В»РЎРЉ: {roleLabels[role] || roleLabels.manager}</span>
                <button type="submit" className="button button-primary" disabled={profileSaving}>
                  {profileSaving ? "Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎРЏР ВµР С..." : "Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРЉ Р С—РЎР‚Р С•РЎвЂћР С‘Р В»РЎРЉ"}
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
                <strong>Р С™Р С•Р СР В°Р Р…Р Т‘Р В°</strong>
                <p>Р СљР ВµР Р…РЎРЏР в„–РЎвЂљР Вµ Р С‘Р СРЎРЏ, РЎР‚Р С•Р В»РЎРЉ Р С‘ Telegram Р Т‘Р В»РЎРЏ owner, manager Р С‘ detailer.</p>
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
                      <strong>{member.full_name || member.email || "Р Р€РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”"}</strong>
                      <span>{member.email || "Р вЂР ВµР В· email"}</span>
                    </div>
                    <div className="settings-edit-form">
                      <label>
                        Р ВР СРЎРЏ
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
                        Р В Р С•Р В»РЎРЉ
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
                          {teamSaving ? "Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎРЏР ВµР С..." : "Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРЉ"}
                        </button>
                        {profile?.id !== member.id ? (
                          <button
                            type="button"
                            className="button button-outline"
                            disabled={teamSaving}
                            onClick={() => onDeleteTeamMember(member.id)}
                          >
                            Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ
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
            <strong>Р вЂќР С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”Р В°</strong>
            <form className="settings-edit-form" onSubmit={handleCreateTeamMember}>
              <label>
                Р ВР СРЎРЏ
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
                Р вЂ™РЎР‚Р ВµР СР ВµР Р…Р Р…РЎвЂ№Р в„– Р С—Р В°РЎР‚Р С•Р В»РЎРЉ
                <input
                  type="password"
                  value={newTeamMember.password}
                  onChange={(event) => setNewTeamMember((current) => ({ ...current, password: event.target.value }))}
                />
              </label>
              <label>
                Р В Р С•Р В»РЎРЉ
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
                {creatingTeamMember ? "Р РЋР С•Р В·Р Т‘Р В°РЎвЂР С..." : "Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В°Р С”Р С”Р В°РЎС“Р Р…РЎвЂљ"}
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
                <strong>Р вЂќР ВµР СР С•-Р С—РЎР‚Р В°Р в„–РЎРѓ</strong>
                <p>Р СџР С•Р Т‘РЎвЂљРЎРЏР С–Р С‘Р Р†Р В°Р ВµР С РЎР‚Р ВµР В°Р В»Р С‘РЎРѓРЎвЂљР С‘РЎвЂЎР Р…РЎвЂ№Р Вµ РЎвЂ Р ВµР Р…РЎвЂ№ Р С‘ Р Р†РЎР‚Р ВµР СРЎРЏ Р Р…Р В° РЎС“РЎРѓР В»РЎС“Р С–Р С‘, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С—Р С•Р С”Р В°Р В·Р В°РЎвЂљРЎРЉ Р С”Р В°РЎРѓРЎРѓРЎС“ Р С‘ РЎРѓРЎР‚Р ВµР Т‘Р Р…Р С‘Р в„– РЎвЂЎР ВµР С” Р В·Р В° Р СР ВµРЎРѓРЎРЏРЎвЂ .</p>
              </div>
              <button type="button" className="button button-primary" disabled={applyingDemoPricing} onClick={onApplyDemoPricing}>
                {applyingDemoPricing ? "Р С›Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С..." : "Р вЂ”Р В°Р С–РЎР‚РЎС“Р В·Р С‘РЎвЂљРЎРЉ Р Т‘Р ВµР СР С•-РЎвЂ Р ВµР Р…РЎвЂ№"}
              </button>
            </div>
          </article>

          <article className="settings-form-card">
            <strong>Р Р€РЎРѓР В»РЎС“Р С–Р С‘</strong>
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
                        Р СњР В°Р В·Р Р†Р В°Р Р…Р С‘Р Вµ
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
                        Р В¦Р ВµР Р…Р В° (MDL)
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
                        Р вЂќР В»Р С‘РЎвЂљР ВµР В»РЎРЉР Р…Р С•РЎРѓРЎвЂљРЎРЉ (Р СР С‘Р Р…)
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
                        <span>Р С’Р С”РЎвЂљР С‘Р Р†Р Р…Р В°РЎРЏ РЎС“РЎРѓР В»РЎС“Р С–Р В°</span>
                      </label>
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={serviceSavingId === service.id}
                        onClick={() => onUpdateService(service.id, draft)}
                      >
                        {serviceSavingId === service.id ? "Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎРЏР ВµР С..." : "Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРЉ РЎС“РЎРѓР В»РЎС“Р С–РЎС“"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>

          <article className="settings-form-card">
            <strong>Р СњР С•Р Р†Р В°РЎРЏ РЎС“РЎРѓР В»РЎС“Р С–Р В°</strong>
            <form className="settings-edit-form" onSubmit={handleCreateService}>
              <label>
                Р СњР В°Р В·Р Р†Р В°Р Р…Р С‘Р Вµ
                <input value={newService.name} onChange={(event) => setNewService((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                Р В¦Р ВµР Р…Р В° (MDL)
                <input
                  type="number"
                  min="0"
                  value={newService.base_price}
                  onChange={(event) => setNewService((current) => ({ ...current, base_price: event.target.value }))}
                />
              </label>
              <label>
                Р вЂќР В»Р С‘РЎвЂљР ВµР В»РЎРЉР Р…Р С•РЎРѓРЎвЂљРЎРЉ (Р СР С‘Р Р…)
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
                <span>Р РЋРЎР‚Р В°Р В·РЎС“ Р В°Р С”РЎвЂљР С‘Р Р†Р С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ</span>
              </label>
              <button type="submit" className="button button-primary" disabled={creatingService}>
                {creatingService ? "Р РЋР С•Р В·Р Т‘Р В°РЎвЂР С..." : "Р вЂќР С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ РЎС“РЎРѓР В»РЎС“Р С–РЎС“"}
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
                ? "Р вЂ™Р Р…Р ВµРЎв‚¬Р Р…Р С‘Р в„– webhook Р Р†Р С”Р В»РЎР‹РЎвЂЎРЎвЂР Р…. CRM Р С•РЎвЂљР С—РЎР‚Р В°Р Р†Р В»РЎРЏР ВµРЎвЂљ РЎРѓР С•Р В±РЎвЂ№РЎвЂљР С‘РЎРЏ Р С—Р С• Р В·Р В°РЎРЏР Р†Р С”Р В°Р С Р Р† automation-layer."
                : "Webhook Р Р…Р Вµ Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р ВµР Р…. Р С›РЎРѓР Р…Р С•Р Р†Р Р…Р С•Р в„– follow-up Р С‘ Telegram live-Р С•Р С—Р С•Р Р†Р ВµРЎвЂ°Р ВµР Р…Р С‘РЎРЏ Р С•РЎРѓРЎвЂљР В°РЎР‹РЎвЂљРЎРѓРЎРЏ Р Р…Р В° Supabase Edge Functions."}
            </p>
          </article>
          <article className="settings-form-card">
            <strong>Telegram</strong>
            <p>Chat id Р СР ВµР Р…Р ВµР Т‘Р В¶Р ВµРЎР‚Р С•Р Р†: {managerProfiles.length ? managerProfiles.map((member) => member.telegram_chat_id || "Р Р…Р Вµ РЎС“Р С”Р В°Р В·Р В°Р Р…").join(", ") : "Р С—Р С•Р С”Р В° Р Р…Р ВµРЎвЂљ"}.</p>
          </article>
        </div>
      );
    }

    return (
      <div className="settings-panel-stack">
        <article className="settings-form-card">
          <strong>Р РЋР СР ВµР Р…Р В° Р С—Р В°РЎР‚Р С•Р В»РЎРЏ</strong>
          <form className="settings-edit-form" onSubmit={handlePasswordSubmit}>
            <label>
              Р СњР С•Р Р†РЎвЂ№Р в„– Р С—Р В°РЎР‚Р С•Р В»РЎРЉ
              <input
                type="password"
                value={passwordForm.next}
                onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))}
              />
            </label>
            <label>
              Р СџР С•Р Р†РЎвЂљР С•РЎР‚Р С‘РЎвЂљР Вµ Р С—Р В°РЎР‚Р С•Р В»РЎРЉ
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
              {passwordSaving ? "Р С›Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С..." : "Р РЋР СР ВµР Р…Р С‘РЎвЂљРЎРЉ Р С—Р В°РЎР‚Р С•Р В»РЎРЉ"}
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
          <h1>Р СњР В°РЎРѓРЎвЂљРЎР‚Р С•Р в„–Р С”Р С‘</h1>
          <p>Р вЂР В»Р С•Р С” Р С”Р С•Р Р…РЎвЂћР С‘Р С–РЎС“РЎР‚Р В°РЎвЂ Р С‘Р С‘ CRM, Р С”Р С•Р СР В°Р Р…Р Т‘РЎвЂ№, Р С‘Р Р…РЎвЂљР ВµР С–РЎР‚Р В°РЎвЂ Р С‘Р в„– Р С‘ Р С•Р С—Р ВµРЎР‚Р В°РЎвЂ Р С‘Р С•Р Р…Р Р…Р С•Р в„– Р В±Р ВµР В·Р С•Р С—Р В°РЎРѓР Р…Р С•РЎРѓРЎвЂљР С‘.</p>
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
      setError(loadError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РґР°РЅРЅС‹Рµ.");
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
        note: `Р—Р°СЏРІРєР° СЃРѕР·РґР°РЅР° РёР· РёСЃС‚РѕС‡РЅРёРєР° ${formatLabel(form.source)}`,
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
        setError(webhookError.message || "Р—Р°СЏРІРєР° СЃРѕР·РґР°РЅР°, РЅРѕ РІРЅРµС€РЅРёР№ automation webhook РЅРµ РѕС‚СЂР°Р±РѕС‚Р°Р».");
      }

      setSaveMessage(reused ? "Р—Р°СЏРІРєР° СЃРѕР·РґР°РЅР°, СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№ РєР»РёРµРЅС‚ РѕР±РЅРѕРІР»С‘РЅ." : "Р—Р°СЏРІРєР° СѓСЃРїРµС€РЅРѕ СЃРѕР·РґР°РЅР°.");
      return true;
    } catch (createError) {
      setError(createError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕР·РґР°С‚СЊ Р·Р°СЏРІРєСѓ.");
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
        setError(updateError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ Р·Р°СЏРІРєСѓ.");
        return;
      }

      await createTimelineEvent({
        lead_id: leadId,
        type: "status_changed",
        note: `РЎС‚Р°С‚СѓСЃ РёР·РјРµРЅС‘РЅ СЃ "${statusLabels[previousLead.status] || previousLead.status}" РЅР° "${statusLabels[nextStatus] || nextStatus}"`,
        payload: {
          from: previousLead.status,
          to: nextStatus
        },
        created_by: session.user.id
      });
      setSaveMessage(`РЎС‚Р°С‚СѓСЃ РѕР±РЅРѕРІР»С‘РЅ: ${statusLabels[nextStatus] || nextStatus}.`);
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
      setError(updateError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ follow-up.");
      return false;
    }

    await createTimelineEvent({
      lead_id: lead.id,
      type: "follow_up_set",
      note: nextFollowUpAt ? `Follow-up РЅР°Р·РЅР°С‡РµРЅ РЅР° ${formatDate(nextFollowUpAt)}` : "Follow-up РѕС‡РёС‰РµРЅ",
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
      setError(webhookError.message || "Follow-up РѕР±РЅРѕРІР»С‘РЅ, РЅРѕ РІРЅРµС€РЅРёР№ automation webhook РЅРµ РѕС‚СЂР°Р±РѕС‚Р°Р».");
    }

    setSaveMessage(nextFollowUpAt ? "Follow-up СЃРѕС…СЂР°РЅС‘РЅ." : "Follow-up РѕС‡РёС‰РµРЅ.");
    return true;
  }

  async function addLeadNote(leadId, note) {
    setError("");
    setSaveMessage("");

    const { data, error: noteError } = await addLeadNoteRecord(supabase, leadId, note, session.user.id);

    if (noteError) {
      setError(noteError.message || "РќРµ СѓРґР°Р»РѕСЃСЊ РґРѕР±Р°РІРёС‚СЊ Р·Р°РјРµС‚РєСѓ.");
      return false;
    }

    if (data) {
      setLeadEvents((current) => [data, ...current]);
    }

    setSaveMessage("Р—Р°РјРµС‚РєР° РґРѕР±Р°РІР»РµРЅР°.");
    return true;
  }

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
      setError(updateError.message || "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРЉ Р С—РЎР‚Р С•РЎвЂћР С‘Р В»РЎРЉ.");
      setProfileSaving(false);
      return false;
    }

    setProfile(data || null);
    setTeamProfiles((current) => current.map((member) => (member.id === session.user.id ? { ...member, ...payload } : member)));
    setSaveMessage("Р СџРЎР‚Р С•РЎвЂћР С‘Р В»РЎРЉ Р С•Р В±Р Р…Р С•Р Р†Р В»РЎвЂР Р….");
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
      setError(updateError.message || "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С•Р В±Р Р…Р С•Р Р†Р С‘РЎвЂљРЎРЉ РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”Р В°.");
      setTeamSaving(false);
      return false;
    }

    setTeamProfiles((current) => current.map((member) => (member.id === memberId ? { ...member, ...data } : member)));
    if (memberId === session.user.id) {
      setProfile((current) => (current ? { ...current, ...data } : current));
    }
    setSaveMessage("Р С™Р С•Р СР В°Р Р…Р Т‘Р В° Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р В°.");
    setTeamSaving(false);
    return true;
  }

  async function deleteTeamMember(memberId) {
    setTeamSaving(true);
    setError("");
    setSaveMessage("");

    const { error: deleteError } = await supabase.from("profiles").delete().eq("id", memberId);

    if (deleteError) {
      setError(deleteError.message || "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ РЎС“Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”Р В°.");
      setTeamSaving(false);
      return false;
    }

    setTeamProfiles((current) => current.filter((member) => member.id !== memberId));
    setSaveMessage("Р Р€РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С” РЎС“Р Т‘Р В°Р В»РЎвЂР Р….");
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
        throw new Error("Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—Р С•Р В»РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉ id Р Р…Р С•Р Р†Р С•Р С–Р С• Р В°Р С”Р С”Р В°РЎС“Р Р…РЎвЂљР В°.");
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
      setSaveMessage("Р СњР С•Р Р†РЎвЂ№Р в„– РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С” РЎРѓР С•Р В·Р Т‘Р В°Р Р….");
      return true;
    } catch (createError) {
      setError(createError.message || "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ РЎРѓР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ РЎС“РЎвЂЎР В°РЎРѓРЎвЂљР Р…Р С‘Р С”Р В°.");
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
      setError(updateError.message || "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С•Р В±Р Р…Р С•Р Р†Р С‘РЎвЂљРЎРЉ РЎС“РЎРѓР В»РЎС“Р С–РЎС“.");
      setServiceSavingId(null);
      return false;
    }

    setServices((current) => current.map((service) => (service.id === serviceId ? { ...service, ...data } : service)));
    setSaveMessage("Р Р€РЎРѓР В»РЎС“Р С–Р В° Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р В°.");
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
      setError(insertError.message || "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р Т‘Р С•Р В±Р В°Р Р†Р С‘РЎвЂљРЎРЉ РЎС“РЎРѓР В»РЎС“Р С–РЎС“.");
      setCreatingService(false);
      return false;
    }

    setServices((current) => [...current, data || payload].sort((a, b) => a.name.localeCompare(b.name)));
    setSaveMessage("Р СњР С•Р Р†Р В°РЎРЏ РЎС“РЎРѓР В»РЎС“Р С–Р В° Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р В°.");
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
      setSaveMessage("Р вЂќР ВµР СР С•-РЎвЂ Р ВµР Р…РЎвЂ№ Р С‘ Р Р†РЎР‚Р ВµР СРЎРЏ Р Р…Р В° РЎС“РЎРѓР В»РЎС“Р С–Р С‘ Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…РЎвЂ№.");
      return true;
    } catch (applyError) {
      setError(applyError.message || "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—РЎР‚Р С‘Р СР ВµР Р…Р С‘РЎвЂљРЎРЉ Р Т‘Р ВµР СР С•-РЎвЂ Р ВµР Р…РЎвЂ№.");
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
      setError(updateError.message || "Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ РЎРѓР СР ВµР Р…Р С‘РЎвЂљРЎРЉ Р С—Р В°РЎР‚Р С•Р В»РЎРЉ.");
      setPasswordSaving(false);
      return false;
    }

    setSaveMessage("Р СџР В°РЎР‚Р С•Р В»РЎРЉ Р С•Р В±Р Р…Р С•Р Р†Р В»РЎвЂР Р….");
    setPasswordSaving(false);
    return true;
  }

  async function handlePhoneAction(phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError("Р Р€ Р С”Р В»Р С‘Р ВµР Р…РЎвЂљР В° Р Р…Р ВµРЎвЂљ Р Р…Р С•Р СР ВµРЎР‚Р В° РЎвЂљР ВµР В»Р ВµРЎвЂћР С•Р Р…Р В°.");
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
    setSaveMessage(`Р СњР С•Р СР ВµРЎР‚ ${normalized} Р С—Р ВµРЎР‚Р ВµР Т‘Р В°Р Р… Р Р† РЎРѓР С‘РЎРѓРЎвЂљР ВµР СР Р…РЎвЂ№Р в„– Р Р…Р В°Р В±Р С•РЎР‚.`);
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
        const key = lead.services?.name || "Р вЂР ВµР В· РЎС“РЎРѓР В»РЎС“Р С–Р С‘";
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
      ? "РќР°Р·РЅР°С‡РµРЅРЅС‹С… Р·Р°СЏРІРѕРє РїРѕРєР° РЅРµС‚. РљР°Рє С‚РѕР»СЊРєРѕ РјРµРЅРµРґР¶РµСЂ РЅР°Р·РЅР°С‡РёС‚ СЂР°Р±РѕС‚Сѓ, РѕРЅР° РїРѕСЏРІРёС‚СЃСЏ Р·РґРµСЃСЊ."
      : "РџРѕРєР° РЅРµС‚ Р·Р°СЏРІРѕРє. РЎРѕР·РґР°Р№С‚Рµ РїРµСЂРІСѓСЋ, Рё pipeline Р·Р°РїРѕР»РЅРёС‚СЃСЏ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё.";

  if (loading) {
    return <div className="loading-screen">Р—Р°РіСЂСѓР¶Р°РµРј CRM...</div>;
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
    return <div className="loading-screen">РџРѕРґРіРѕС‚Р°РІР»РёРІР°РµРј СЂР°Р±РѕС‡РµРµ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІРѕ...</div>;
  }

  if (isPublicRequestRoute) {
    return <PublicRequestPage isAuthenticated={Boolean(session)} />;
  }

  if (!session) {
    return <LoginPage onAuthenticated={setSession} />;
  }

  return <ProtectedApp session={session} onSignOut={handleSignOut} />;
}
