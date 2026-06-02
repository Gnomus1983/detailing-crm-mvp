import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  addLeadNoteRecord,
  createLeadEvent,
  createLeadRecord,
  createOrReuseClient,
  sendN8nWebhook,
  submitPublicLead,
  updateLeadFollowUpRecord,
  updateLeadStatusRecord
} from "./crm";
import { supabase } from "./supabase";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/leads", label: "Leads" },
  { to: "/clients", label: "Clients" },
  { to: "/services", label: "Services" },
  { to: "/settings", label: "Settings" }
];

const roleLabels = {
  owner: "Owner",
  manager: "Manager",
  detailer: "Detailer"
};

const rolePermissions = {
  owner: {
    nav: ["/dashboard", "/leads", "/clients", "/services", "/settings"],
    canCreateLead: true,
    canEditLead: true
  },
  manager: {
    nav: ["/dashboard", "/leads", "/clients", "/services"],
    canCreateLead: true,
    canEditLead: true
  },
  detailer: {
    nav: ["/dashboard", "/leads"],
    canCreateLead: false,
    canEditLead: false
  }
};

const statusOptions = ["new", "contacted", "quoted", "scheduled", "in_progress", "done", "lost"];
const sourceOptions = ["manual", "landing", "instagram", "telegram", "whatsapp", "phone", "facebook", "other"];

const statusLabels = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  scheduled: "Scheduled",
  in_progress: "In progress",
  done: "Done",
  lost: "Lost"
};

const eventLabels = {
  created: "Lead created",
  status_changed: "Status changed",
  note_added: "Note added",
  follow_up_set: "Follow-up updated",
  assigned: "Assigned",
  price_updated: "Price updated",
  reminder_sent: "Reminder sent"
};

function formatCurrency(value) {
  if (value == null || value === "") {
    return "EUR 0";
  }

  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(Number(value));
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
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
    return "Not set";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatPreferredSlot(dateValue, timeValue) {
  if (!dateValue) {
    return "Not set";
  }

  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium"
  }).format(new Date(`${dateValue}T00:00:00`));

  return `${formattedDate} ${timeValue || "Time TBD"}`;
}

function getRolePermissions(role) {
  return rolePermissions[role] || rolePermissions.manager;
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

        setMessage("Account created. If email confirmation is enabled, confirm your inbox and sign in.");
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
      setError(submitError.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <span className="auth-kicker">Detailing CRM MVP</span>
          <h1>Run your detailing leads like a real front desk.</h1>
          <p>
            Sign in to manage new requests, track follow-ups, and keep every car lead moving toward booking.
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button type="button" className={mode === "sign-in" ? "active" : ""} onClick={() => setMode("sign-in")}>
              Sign in
            </button>
            <button type="button" className={mode === "sign-up" ? "active" : ""} onClick={() => setMode("sign-up")}>
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "sign-up" ? (
              <label>
                Full name
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Owner or manager name"
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
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 characters"
                required
              />
            </label>

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? "Please wait..." : mode === "sign-up" ? "Create account" : "Sign in"}
            </button>
          </form>

          {message ? <p className="status-note success">{message}</p> : null}
          {error ? <p className="status-note error">{error}</p> : null}
        </div>
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
    follow_up_at: ""
  });
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

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
        setError(servicesError.message || "Failed to load services.");
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
        await sendN8nWebhook(webhookUrl, {
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
        setError(webhookError.message || "Request was created, but n8n webhook failed.");
      }

      setSuccessMessage("Request sent successfully. The detailing team can now follow up from the CRM.");
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
        follow_up_at: ""
      });
    } catch (submitError) {
      setError(submitError.message || "Failed to send request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="public-shell">
      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="page-kicker">Detailing request</span>
          <h1>Book your car detailing request in one step.</h1>
          <p>
            Send your preferred service, car details, and timing. The team will receive the request in the CRM and follow up quickly.
          </p>
          <div className="public-badges">
            <span>Fast intake</span>
            <span>CRM synced</span>
            <span>Follow-up ready</span>
          </div>
          {isAuthenticated ? <p className="public-helper">You are signed in. After submit, you can review the new lead inside the CRM workspace.</p> : null}
        </div>

        <div className="public-card">
          <div className="section-heading compact">
            <div>
              <span className="page-kicker">Public form</span>
              <h3>Request detailing</h3>
            </div>
          </div>

          {loadingServices ? <p className="access-note">Loading available services...</p> : null}
          {error ? <div className="banner error">{error}</div> : null}
          {successMessage ? <div className="banner success">{successMessage}</div> : null}

          <form className="inline-form" onSubmit={handleSubmit}>
            <div className="form-grid two-columns">
              <label>
                Full name
                <input name="client_name" value={form.client_name} onChange={updateField} placeholder="Victor Sandu" required />
              </label>
              <label>
                Phone
                <input name="phone" value={form.phone} onChange={updateField} placeholder="+373..." required />
              </label>
              <label>
                Email
                <input name="email" type="email" value={form.email} onChange={updateField} placeholder="optional@email.com" />
              </label>
              <label>
                Service
                <select name="service_id" value={form.service_id} onChange={updateField} disabled={loadingServices}>
                  <option value="">Choose a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Car make
                <input name="car_make" value={form.car_make} onChange={updateField} placeholder="Audi" />
              </label>
              <label>
                Model / year
                <div className="split-input">
                  <input name="car_model" value={form.car_model} onChange={updateField} placeholder="Q7" />
                  <input name="car_year" type="number" min="1950" max="2100" value={form.car_year} onChange={updateField} placeholder="2020" />
                </div>
              </label>
              <label>
                Plate
                <input name="car_plate" value={form.car_plate} onChange={updateField} placeholder="KCC777" />
              </label>
              <label>
                Preferred date
                <input name="preferred_date" type="date" value={form.preferred_date} onChange={updateField} />
              </label>
              <label>
                Preferred time
                <input name="preferred_time" value={form.preferred_time} onChange={updateField} placeholder="After 18:00" />
              </label>
              <label>
                Address
                <input name="address" value={form.address} onChange={updateField} placeholder="Ciocana, Chisinau" />
              </label>
            </div>

            <label>
              Request details
              <textarea
                name="comment"
                value={form.comment}
                onChange={updateField}
                rows="4"
                placeholder="Tell us what service you need, the car condition, and any timing details."
              />
            </label>

            <button type="submit" className="primary-button" disabled={saving || loadingServices}>
              {saving ? "Sending request..." : "Send request"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function AppLayout({ session, metrics, role, children, onSignOut }) {
  const location = useLocation();
  const permissions = getRolePermissions(role);
  const allowedNavItems = navItems.filter((item) => permissions.nav.includes(item.to));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-block">
            <span className="brand-badge">DC</span>
            <div>
              <strong>Detailing CRM</strong>
              <span>MVP control room</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {allowedNavItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-card">
            <strong>{roleLabels[role] || roleLabels.manager}</strong>
            <span>{session.user.email}</span>
            <button type="button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="page-kicker">Live workspace</span>
            <h2>{allowedNavItems.find((item) => location.pathname.startsWith(item.to))?.label || "Dashboard"}</h2>
          </div>

          <div className="topbar-chip">
            <span>{metrics.newCount} new</span>
            <span>{metrics.followUpCount} follow-ups</span>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

function DashboardPage({ metrics, leads, role }) {
  return (
    <section className="page-grid">
      <div className="stats-grid">
        <article className="stat-card">
          <span>New leads</span>
          <strong>{metrics.newCount}</strong>
          <p>Fresh requests that still need a first response.</p>
        </article>
        <article className="stat-card">
          <span>In progress</span>
          <strong>{metrics.activeCount}</strong>
          <p>Deals moving through quote, schedule, or active service.</p>
        </article>
        <article className="stat-card">
          <span>Done value</span>
          <strong>{formatCurrency(metrics.doneRevenue)}</strong>
          <p>Total value marked as completed in the current dataset.</p>
        </article>
        <article className="stat-card">
          <span>Follow-ups due</span>
          <strong>{metrics.followUpCount}</strong>
          <p>Requests that should be nudged before they cool down.</p>
        </article>
      </div>

      <div className="feature-panel">
        <div className="section-heading">
          <div>
            <span className="page-kicker">Priority queue</span>
            <h3>{role === "detailer" ? "Assigned jobs" : "Next moves for the desk"}</h3>
          </div>
        </div>

        <div className="priority-list">
          {leads.length ? (
            leads.slice(0, 4).map((lead) => (
              <article className="priority-item" key={lead.id}>
                <div>
                  <strong>{lead.clients?.name || "Unknown client"}</strong>
                  <span>{lead.services?.name || "No service selected"}</span>
                </div>
                <div className="priority-meta">
                  <span className={`status-pill status-${lead.status}`}>{statusLabels[lead.status] || lead.status}</span>
                  <span>{lead.preferred_time || "Time not set"}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="table-empty">
              {role === "detailer"
                ? "No assigned jobs yet. When a lead is assigned to this detailer, it will appear here."
                : "No leads in the queue yet."}
            </div>
          )}
        </div>
      </div>
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
    <div className="feature-panel">
      <div className="section-heading compact">
        <div>
          <span className="page-kicker">New request</span>
          <h3>New lead</h3>
          <p className="section-subcopy">Create a realistic inbound request and the CRM will reuse the client by phone if they already exist.</p>
        </div>
      </div>

      <form className="inline-form" onSubmit={handleSubmit}>
        <div className="form-grid two-columns">
          <label>
            Client name
            <input name="client_name" value={form.client_name} onChange={updateField} placeholder="Andrei Popa" required />
          </label>
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={updateField} placeholder="+373..." required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={updateField} placeholder="optional@email.com" />
          </label>
          <label>
            Service
            <select name="service_id" value={form.service_id} onChange={updateField}>
              <option value="">No service yet</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Source
            <select name="source" value={form.source} onChange={updateField}>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {formatLabel(source)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estimated price
            <input name="estimated_price" type="number" min="0" value={form.estimated_price} onChange={updateField} placeholder="120" />
          </label>
          <label>
            Preferred date
            <input name="preferred_date" type="date" value={form.preferred_date} onChange={updateField} />
          </label>
          <label>
            Preferred time
            <input name="preferred_time" value={form.preferred_time} onChange={updateField} placeholder="After 18:00" />
          </label>
          <label>
            Follow-up at
            <input name="follow_up_at" type="datetime-local" value={form.follow_up_at} onChange={updateField} />
          </label>
          <label>
            Plate
            <input name="car_plate" value={form.car_plate} onChange={updateField} placeholder="KAA123" />
          </label>
          <label>
            Make
            <input name="car_make" value={form.car_make} onChange={updateField} placeholder="BMW" />
          </label>
          <label>
            Model / year
            <div className="split-input">
              <input name="car_model" value={form.car_model} onChange={updateField} placeholder="X5" />
              <input name="car_year" type="number" min="1950" max="2100" value={form.car_year} onChange={updateField} placeholder="2019" />
            </div>
          </label>
        </div>

        <label>
          Address
          <input name="address" value={form.address} onChange={updateField} placeholder="Botanica, Chisinau" />
        </label>

        <label>
          Lead comment
          <textarea
            name="comment"
            value={form.comment}
            onChange={updateField}
            rows="4"
            placeholder="What the client asked for, urgency, expectations..."
          />
        </label>

        <button type="submit" className="primary-button" disabled={creatingLead}>
          {creatingLead ? "Creating..." : "Create lead"}
        </button>
      </form>
    </div>
  );
}

function LeadsPage({
  leads,
  leadEvents,
  services,
  currentUserName,
  permissions,
  emptyMessage,
  statusFilter,
  setStatusFilter,
  selectedLeadId,
  setSelectedLeadId,
  createLead,
  creatingLead,
  statusSavingId,
  updateLeadStatus,
  updateLeadFollowUp,
  addLeadNote
}) {
  const filteredLeads = useMemo(() => {
    if (statusFilter === "all") {
      return leads;
    }

    return leads.filter((lead) => lead.status === statusFilter);
  }, [leads, statusFilter]);

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
    <section className="page-grid">
      {permissions.canCreateLead ? <NewLeadForm services={services} onCreateLead={createLead} creatingLead={creatingLead} /> : null}

      <section className="page-grid leads-layout">
        <div className="feature-panel">
          <div className="section-heading compact">
            <div>
              <span className="page-kicker">Pipeline</span>
              <h3>Lead queue</h3>
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status] || status}
                </option>
              ))}
            </select>
          </div>

          <div className="table-list">
            {filteredLeads.length ? (
              filteredLeads.map((lead) => (
                <button
                  type="button"
                  key={lead.id}
                  className={lead.id === selectedLead?.id ? "table-row active" : "table-row"}
                  onClick={() => setSelectedLeadId(lead.id)}
                >
                  <div>
                    <strong>{lead.clients?.name}</strong>
                    <span>{lead.services?.name || "No service"}</span>
                  </div>
                  <div className="table-meta">
                    <span className={`status-pill status-${lead.status}`}>{statusLabels[lead.status] || lead.status}</span>
                    <span>{formatCurrency(lead.estimated_price)}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="table-empty">{leads.length ? "No leads match this status yet." : emptyMessage}</div>
            )}
          </div>
        </div>

        <LeadDetailCard
          lead={selectedLead}
          leadEvents={selectedLeadEvents}
          currentUserName={currentUserName}
          permissions={permissions}
          statusSavingId={statusSavingId}
          updateLeadStatus={updateLeadStatus}
          updateLeadFollowUp={updateLeadFollowUp}
          addLeadNote={addLeadNote}
        />
      </section>
    </section>
  );
}

function LeadDetailCard({ lead, leadEvents, currentUserName, permissions, statusSavingId, updateLeadStatus, updateLeadFollowUp, addLeadNote }) {
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
      <div className="detail-panel empty">
        <h3>No lead selected</h3>
        <p>Create or filter leads, and the selected request will appear here.</p>
      </div>
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

  return (
    <div className="detail-panel">
      <div className="section-heading compact">
        <div>
          <span className="page-kicker">Lead card</span>
          <h3>{lead.clients?.name}</h3>
        </div>
        <span className={`status-pill status-${lead.status}`}>{statusLabels[lead.status] || lead.status}</span>
      </div>

      <div className="detail-grid">
        <div>
          <span>Phone</span>
          <strong>{lead.clients?.phone || "No phone"}</strong>
        </div>
        <div>
          <span>Service</span>
          <strong>{lead.services?.name || "Not chosen"}</strong>
        </div>
        <div>
          <span>Car</span>
          <strong>
            {[lead.clients?.car_make, lead.clients?.car_model, lead.clients?.car_year].filter(Boolean).join(" ") || "No car details"}
          </strong>
        </div>
        <div>
          <span>Source</span>
          <strong>{formatLabel(lead.source)}</strong>
        </div>
        <div>
          <span>Preferred slot</span>
          <strong>{formatPreferredSlot(lead.preferred_date, lead.preferred_time)}</strong>
        </div>
        <div>
          <span>Follow-up</span>
          <strong>{lead.follow_up_at ? formatDate(lead.follow_up_at) : "Not set"}</strong>
        </div>
      </div>

      <div className="detail-block">
        <span>Address</span>
        <p>{lead.address || "No address added yet."}</p>
      </div>

      <div className="detail-block">
        <span>Comment</span>
        <p>{lead.comment || "No client comment."}</p>
      </div>

      <div className="detail-block">
        <span>Estimated price</span>
        <p>{formatCurrency(lead.estimated_price)}</p>
      </div>

      <div className="detail-block">
        <span>Follow-up control</span>
        {permissions.canEditLead ? (
          <form className="inline-form compact-form" onSubmit={handleFollowUpSubmit}>
            <div className="follow-up-row">
              <input type="datetime-local" value={followUpInput} onChange={(event) => setFollowUpInput(event.target.value)} />
              <button type="submit" className="primary-button" disabled={savingFollowUp}>
                {savingFollowUp ? "Saving..." : "Save follow-up"}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={savingFollowUp || (!lead.follow_up_at && !followUpInput)}
                onClick={handleClearFollowUp}
              >
                Clear
              </button>
            </div>
          </form>
        ) : (
          <p className="access-note">Only owners and managers can change follow-up timing.</p>
        )}
      </div>

      {permissions.canEditLead ? (
        <div className="status-actions">
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              className={status === lead.status ? "chip active" : "chip"}
              disabled={statusSavingId === lead.id}
              onClick={() => updateLeadStatus(lead.id, status)}
            >
              {statusSavingId === lead.id && status === lead.status ? "Saving..." : statusLabels[status] || status}
            </button>
          ))}
        </div>
      ) : null}

      <div className="timeline-panel">
        <div className="section-heading compact">
          <div>
            <span className="page-kicker">History</span>
            <h3>Timeline & notes</h3>
          </div>
        </div>

        {permissions.canEditLead ? (
          <form className="inline-form compact-form" onSubmit={handleAddNote}>
            <label>
              Add internal note
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows="3" placeholder="Called client, waiting for answer..." />
            </label>
            <button type="submit" className="primary-button" disabled={savingNote}>
              {savingNote ? "Saving..." : "Add note"}
            </button>
          </form>
        ) : (
          <p className="access-note">Detailers can view timeline history, while notes stay manager-owned in this MVP.</p>
        )}

        <div className="timeline-list">
          {leadEvents.length ? (
            leadEvents.map((eventItem) => (
              <article key={eventItem.id} className="timeline-item">
                <div className="timeline-head">
                  <strong>{eventLabels[eventItem.type] || eventItem.type}</strong>
                  <span>{formatDate(eventItem.created_at)}</span>
                </div>
                <p>{eventItem.note || "No note provided."}</p>
                <span className="timeline-author">{eventItem.created_by ? currentUserName || "Team member" : "System"}</span>
              </article>
            ))
          ) : (
            <div className="timeline-empty">No timeline entries yet. Status changes and notes will appear here.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClientsPage({ clients }) {
  return (
    <section className="feature-panel">
      <div className="section-heading">
        <div>
          <span className="page-kicker">Customer base</span>
          <h3>Client list</h3>
        </div>
      </div>

      <div className="card-grid">
        {clients.map((client) => (
          <article key={client.id} className="profile-card">
            <strong>{client.name}</strong>
            <span>{client.phone}</span>
            <p>{[client.car_make, client.car_model, client.car_year].filter(Boolean).join(" ") || "No car details yet"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ServicesPage({ services }) {
  return (
    <section className="feature-panel">
      <div className="section-heading">
        <div>
          <span className="page-kicker">Offer stack</span>
          <h3>Service catalog</h3>
        </div>
      </div>

      <div className="card-grid">
        {services.map((service) => (
          <article key={service.id} className="profile-card">
            <strong>{service.name}</strong>
            <span>{formatCurrency(service.base_price)}</span>
            <p>{service.duration_minutes} minutes</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsPage({ webhookEnabled, role }) {
  return (
    <section className="feature-panel">
      <div className="section-heading">
        <div>
          <span className="page-kicker">Integrations</span>
          <h3>Supabase and n8n setup</h3>
        </div>
      </div>

      <div className="settings-list">
        <article>
          <strong>Current role</strong>
          <p>{roleLabels[role] || roleLabels.manager}</p>
        </article>
        <article>
          <strong>Supabase</strong>
          <p>Connected with publishable key and browser auth.</p>
        </article>
        <article>
          <strong>n8n webhook</strong>
          <p>
            {webhookEnabled
              ? "Webhook URL is configured through VITE_N8N_WEBHOOK_URL. New leads and follow-up updates can now be posted to n8n."
              : "Add VITE_N8N_WEBHOOK_URL to .env to send new leads and follow-up updates into n8n."}
          </p>
        </article>
        <article>
          <strong>Telegram alerts</strong>
          <p>Manager chat IDs can be stored in the profiles table and used by n8n notifications.</p>
        </article>
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [creatingLead, setCreatingLead] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [error, setError] = useState("");
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
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
        { data: profileData, error: profileError }
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
          .maybeSingle()
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

      setLeads(leadsData || []);
      setClients(clientsData || []);
      setServices(servicesData || []);
      setLeadEvents(leadEventsData || []);
      setProfile(profileData || null);
      setSelectedLeadId((current) => preferredLeadId || current || leadsData?.[0]?.id || null);
    } catch (loadError) {
      setError(loadError.message || "Failed to load data.");
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
        note: `Lead created from ${form.source}`,
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
        await sendN8nWebhook(webhookUrl, {
          event: "lead_created",
          lead: createdLead,
          client: clientRecord
        });
      } catch (webhookError) {
        setError(webhookError.message || "Lead was created, but n8n webhook failed.");
      }

      setSaveMessage(reused ? "Lead created and existing client was updated." : "Lead created successfully.");
      return true;
    } catch (createError) {
      setError(createError.message || "Failed to create lead.");
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
        setError(updateError.message || "Failed to update lead.");
        return;
      }

      await createTimelineEvent({
        lead_id: leadId,
        type: "status_changed",
        note: `Status changed from ${previousLead.status} to ${nextStatus}`,
        payload: {
          from: previousLead.status,
          to: nextStatus
        },
        created_by: session.user.id
      });
      setSaveMessage(`Lead status updated to ${statusLabels[nextStatus] || nextStatus}.`);
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
      setError(updateError.message || "Failed to update follow-up.");
      return false;
    }

    await createTimelineEvent({
      lead_id: lead.id,
      type: "follow_up_set",
      note: nextFollowUpAt ? `Follow-up set for ${formatDate(nextFollowUpAt)}` : "Follow-up cleared",
      payload: {
        follow_up_at: nextFollowUpAt
      },
      created_by: session.user.id
    });

    try {
      await sendN8nWebhook(webhookUrl, {
        event: "follow_up_updated",
        lead: {
          ...lead,
          follow_up_at: nextFollowUpAt
        }
      });
    } catch (webhookError) {
      setError(webhookError.message || "Follow-up updated, but n8n webhook failed.");
    }

    setSaveMessage(nextFollowUpAt ? "Follow-up saved." : "Follow-up cleared.");
    return true;
  }

  async function addLeadNote(leadId, note) {
    setError("");
    setSaveMessage("");

    const { data, error: noteError } = await addLeadNoteRecord(supabase, leadId, note, session.user.id);

    if (noteError) {
      setError(noteError.message || "Failed to add note.");
      return false;
    }

    if (data) {
      setLeadEvents((current) => [data, ...current]);
    }

    setSaveMessage("Internal note added.");
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
    const newCount = visibleLeads.filter((lead) => lead.status === "new").length;
    const activeCount = visibleLeads.filter((lead) => ["contacted", "quoted", "scheduled", "in_progress"].includes(lead.status)).length;
    const followUpCount = visibleLeads.filter((lead) => lead.follow_up_at && new Date(lead.follow_up_at) <= new Date()).length;
    const doneRevenue = visibleLeads
      .filter((lead) => lead.status === "done")
      .reduce((total, lead) => total + Number(lead.estimated_price || 0), 0);

    return { newCount, activeCount, followUpCount, doneRevenue };
  }, [visibleLeads]);

  const defaultRoute = permissions.nav[0] || "/dashboard";
  const leadsEmptyMessage =
    role === "detailer"
      ? "No assigned jobs yet. Assigned detailing work will appear here."
      : "No leads yet. Create the first inbound detailing request above.";

  if (loading) {
    return <div className="loading-screen">Loading CRM workspace...</div>;
  }

  return (
    <AppLayout session={session} metrics={metrics} role={role} onSignOut={onSignOut}>
      {error ? <div className="banner error">{error}</div> : null}
      {saveMessage ? <div className="banner success">{saveMessage}</div> : null}

      <Routes>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        {permissions.nav.includes("/dashboard") ? <Route path="/dashboard" element={<DashboardPage metrics={metrics} leads={visibleLeads} role={role} />} /> : null}
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
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                selectedLeadId={selectedLeadId}
                setSelectedLeadId={setSelectedLeadId}
                createLead={createLead}
                creatingLead={creatingLead}
                statusSavingId={statusSavingId}
                updateLeadStatus={updateLeadStatus}
                updateLeadFollowUp={updateLeadFollowUp}
                addLeadNote={addLeadNote}
              />
            }
          />
        ) : null}
        {permissions.nav.includes("/clients") ? <Route path="/clients" element={<ClientsPage clients={clients} />} /> : null}
        {permissions.nav.includes("/services") ? <Route path="/services" element={<ServicesPage services={services} />} /> : null}
        {permissions.nav.includes("/settings") ? (
          <Route path="/settings" element={<SettingsPage webhookEnabled={Boolean(import.meta.env.VITE_N8N_WEBHOOK_URL)} role={role} />} />
        ) : null}
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
    return <div className="loading-screen">Preparing workspace...</div>;
  }

  if (isPublicRequestRoute) {
    return <PublicRequestPage isAuthenticated={Boolean(session)} />;
  }

  if (!session) {
    return <LoginPage onAuthenticated={setSession} />;
  }

  return <ProtectedApp session={session} onSignOut={handleSignOut} />;
}
