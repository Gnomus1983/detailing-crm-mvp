import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { supabase } from "./supabase";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/leads", label: "Leads" },
  { to: "/clients", label: "Clients" },
  { to: "/services", label: "Services" },
  { to: "/settings", label: "Settings" }
];

const statusLabels = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  scheduled: "Scheduled",
  in_progress: "In progress",
  done: "Done",
  lost: "Lost"
};

function formatCurrency(value) {
  if (value == null) {
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
            <button
              type="button"
              className={mode === "sign-in" ? "active" : ""}
              onClick={() => setMode("sign-in")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "sign-up" ? "active" : ""}
              onClick={() => setMode("sign-up")}
            >
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

function AppLayout({ session, metrics, children, onSignOut }) {
  const location = useLocation();

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
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-card">
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
            <h2>{navItems.find((item) => location.pathname.startsWith(item.to))?.label || "Dashboard"}</h2>
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

function DashboardPage({ metrics, leads }) {
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
            <h3>Next moves for the desk</h3>
          </div>
        </div>

        <div className="priority-list">
          {leads.slice(0, 4).map((lead) => (
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
          ))}
        </div>
      </div>
    </section>
  );
}

function LeadsPage({ leads, statusFilter, setStatusFilter, selectedLeadId, setSelectedLeadId, updateLeadStatus }) {
  const filteredLeads = useMemo(() => {
    if (statusFilter === "all") {
      return leads;
    }

    return leads.filter((lead) => lead.status === statusFilter);
  }, [leads, statusFilter]);

  const selectedLead = filteredLeads.find((lead) => lead.id === selectedLeadId) || filteredLeads[0] || null;

  useEffect(() => {
    if (!selectedLead && filteredLeads.length > 0) {
      setSelectedLeadId(filteredLeads[0].id);
    }
  }, [filteredLeads, selectedLead, setSelectedLeadId]);

  return (
    <section className="page-grid leads-layout">
      <div className="feature-panel">
        <div className="section-heading compact">
          <div>
            <span className="page-kicker">Pipeline</span>
            <h3>Lead queue</h3>
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="quoted">Quoted</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="lost">Lost</option>
          </select>
        </div>

        <div className="table-list">
          {filteredLeads.map((lead) => (
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
          ))}
        </div>
      </div>

      <LeadDetailCard lead={selectedLead} updateLeadStatus={updateLeadStatus} />
    </section>
  );
}

function LeadDetailCard({ lead, updateLeadStatus }) {
  if (!lead) {
    return (
      <div className="detail-panel empty">
        <h3>No lead selected</h3>
        <p>Create or filter leads, and the selected request will appear here.</p>
      </div>
    );
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
            {[lead.clients?.car_make, lead.clients?.car_model, lead.clients?.car_year].filter(Boolean).join(" ")}
          </strong>
        </div>
        <div>
          <span>Source</span>
          <strong>{lead.source}</strong>
        </div>
        <div>
          <span>Preferred slot</span>
          <strong>{lead.preferred_date ? `${lead.preferred_date} · ${lead.preferred_time || "Time TBD"}` : "Not set"}</strong>
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

      <div className="status-actions">
        {["new", "contacted", "quoted", "scheduled", "in_progress", "done", "lost"].map((status) => (
          <button
            key={status}
            type="button"
            className={status === lead.status ? "chip active" : "chip"}
            onClick={() => updateLeadStatus(lead.id, status)}
          >
            {statusLabels[status] || status}
          </button>
        ))}
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

function SettingsPage() {
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
          <strong>Supabase</strong>
          <p>Connected with publishable key and browser auth.</p>
        </article>
        <article>
          <strong>n8n webhook</strong>
          <p>Next step is to send new leads and follow-up reminders through your workflow engine.</p>
        </article>
        <article>
          <strong>Telegram alerts</strong>
          <p>Manager chat IDs can be stored in the `profiles` table and used by n8n notifications.</p>
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [{ data: leadsData, error: leadsError }, { data: clientsData, error: clientsError }, { data: servicesData, error: servicesError }] =
        await Promise.all([
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
            .order("name", { ascending: true })
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

      setLeads(leadsData || []);
      setClients(clientsData || []);
      setServices(servicesData || []);
      setSelectedLeadId((current) => current || leadsData?.[0]?.id || null);
    } catch (loadError) {
      setError(loadError.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  async function updateLeadStatus(leadId, nextStatus) {
    const previousLead = leads.find((lead) => lead.id === leadId);
    if (!previousLead || previousLead.status === nextStatus) {
      return;
    }

    const optimistic = leads.map((lead) => (lead.id === leadId ? { ...lead, status: nextStatus } : lead));
    setLeads(optimistic);

    const { error: updateError } = await supabase
      .from("leads")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    if (updateError) {
      setLeads(leads);
      setError(updateError.message || "Failed to update lead.");
      return;
    }

    await supabase.from("lead_events").insert({
      lead_id: leadId,
      type: "status_changed",
      note: `Status changed from ${previousLead.status} to ${nextStatus}`
    });
  }

  useEffect(() => {
    loadData();
  }, []);

  const metrics = useMemo(() => {
    const newCount = leads.filter((lead) => lead.status === "new").length;
    const activeCount = leads.filter((lead) => ["contacted", "quoted", "scheduled", "in_progress"].includes(lead.status)).length;
    const followUpCount = leads.filter((lead) => lead.follow_up_at && new Date(lead.follow_up_at) <= new Date()).length;
    const doneRevenue = leads
      .filter((lead) => lead.status === "done")
      .reduce((total, lead) => total + Number(lead.estimated_price || 0), 0);

    return { newCount, activeCount, followUpCount, doneRevenue };
  }, [leads]);

  if (loading) {
    return <div className="loading-screen">Loading CRM workspace...</div>;
  }

  return (
    <AppLayout session={session} metrics={metrics} onSignOut={onSignOut}>
      {error ? <div className="banner error">{error}</div> : null}

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage metrics={metrics} leads={leads} />} />
        <Route
          path="/leads"
          element={
            <LeadsPage
              leads={leads}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              selectedLeadId={selectedLeadId}
              setSelectedLeadId={setSelectedLeadId}
              updateLeadStatus={updateLeadStatus}
            />
          }
        />
        <Route path="/clients" element={<ClientsPage clients={clients} />} />
        <Route path="/services" element={<ServicesPage services={services} />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

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

  if (booting) {
    return <div className="loading-screen">Preparing workspace...</div>;
  }

  if (!session) {
    return <LoginPage onAuthenticated={setSession} />;
  }

  return <ProtectedApp session={session} onSignOut={handleSignOut} />;
}
