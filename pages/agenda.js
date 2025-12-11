// pages/agenda.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AgendaPage() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [appointments, setAppointments] = useState([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [error, setError] = useState("");

  const [showNewModal, setShowNewModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formService, setFormService] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [savingAppt, setSavingAppt] = useState(false);
  const [formError, setFormError] = useState("");

  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Carrega usuário logado
  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        window.location.href = "/login";
        return;
      }

      setUser(data.user);
      setLoadingUser(false);
    }

    loadUser();
  }, []);

  // Carrega agenda do dia quando tiver user
  useEffect(() => {
    if (!user) return;
    fetchAgenda(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedDate]);

  async function fetchAgenda(dateStr) {
    try {
      setLoadingAgenda(true);
      setError("");

      const params = new URLSearchParams({
        date: dateStr,
        userId: user.id,
      });

      const res = await fetch(`/api/appointments/by-day?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Erro ao carregar agenda.");
      }

      setAppointments(json.appointments || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erro ao carregar agenda.");
    } finally {
      setLoadingAgenda(false);
    }
  }

  async function handleCreateAppointment(e) {
    e.preventDefault();
    setFormError("");
    setSavingAppt(true);

    try {
      if (!formTime) {
        setFormError("Escolha um horário para o agendamento.");
        setSavingAppt(false);
        return;
      }

      const [hourStr, minuteStr] = formTime.split(":");
      const dateObj = new Date(selectedDate);
      dateObj.setHours(Number(hourStr), Number(minuteStr), 0, 0);

      const payload = {
        userId: user.id,
        customerName: formName || null,
        customerPhone: formPhone || null,
        service: formService || null,
        notes: formNotes || null,
        startsAt: dateObj.toISOString(),
      };

      const res = await fetch("/api/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Erro ao criar agendamento.");
      }

      setShowNewModal(false);
      setFormName("");
      setFormPhone("");
      setFormService("");
      setFormNotes("");
      setFormTime("09:00");

      await fetchAgenda(selectedDate);
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Erro ao criar agendamento.");
    } finally {
      setSavingAppt(false);
    }
  }

  async function handleChangeStatus(appointmentId, newStatus) {
    try {
      setUpdatingStatusId(appointmentId);

      const res = await fetch("/api/appointments/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          userId: user.id,
          status: newStatus,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Erro ao atualizar status.");
      }

      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === appointmentId ? { ...appt, status: newStatus } : appt
        )
      );
    } catch (err) {
      console.error(err);
      alert(err.message || "Erro ao atualizar status do agendamento.");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  if (loadingUser) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      {/* Topo */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>
            InfinixAI – Agenda de Atendimentos
          </h1>
          <p style={{ fontSize: 14, color: "#64748b" }}>
            Veja e crie horários para cortes, consultas, atendimentos etc.
          </p>
        </div>

        <div style={{ textAlign: "right", fontSize: 12 }}>
          <div style={{ color: "#64748b" }}>Logado como:</div>
          <div>{user?.email}</div>
        </div>
      </header>

      {/* Filtro de data + botão novo agendamento */}
      <section
        style={{
          background: "#020617",
          borderRadius: 16,
          padding: 16,
          border: "1px solid #1e293b",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "0 0 180px" }}>
          <label style={{ fontSize: 12, color: "#94a3b8" }}>
            Data da agenda
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: 6,
              borderRadius: 8,
              border: "1px solid #1e293b",
              background: "#020617",
              color: "#e2e8f0",
              fontSize: 13,
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError("");
            setShowNewModal(true);
          }}
          style={{
            padding: "10px 20px",
            borderRadius: 999,
            border: "none",
            background: "#22c55e",
            color: "#0b1120",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          + Novo agendamento
        </button>
      </section>

      {error && (
        <p style={{ color: "#f97316", marginBottom: 12, fontSize: 14 }}>
          {error}
        </p>
      )}

      {/* Lista de agendamentos */}
      <section
        style={{
          borderRadius: 16,
          border: "1px solid #1e293b",
          background: "#020617",
          padding: 16,
        }}
      >
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>
          Agendamentos do dia {selectedDate.split("-").reverse().join("/")}
        </h2>

        {loadingAgenda ? (
          <p style={{ fontSize: 14, color: "#64748b" }}>Carregando agenda...</p>
        ) : appointments.length === 0 ? (
          <p style={{ fontSize: 14, color: "#64748b" }}>
            Nenhum agendamento para este dia.
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {appointments.map((appt) => {
              const starts = new Date(appt.starts_at);
              const hora = starts.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });

              const isUpdating = updatingStatusId === appt.id;

              return (
                <li
                  key={appt.id}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #1e293b",
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, color: "#38bdf8" }}>
                      {hora} • {appt.service || "Atendimento"}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {appt.customer_name || "Cliente sem nome"}
                    </div>
                    {appt.customer_phone && (
                      <div
                        style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}
                      >
                        {appt.customer_phone}
                      </div>
                    )}
                    {appt.notes && (
                      <div
                        style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}
                      >
                        {appt.notes}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        textTransform: "capitalize",
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid #1e293b",
                        background:
                          appt.status === "confirmed"
                            ? "#022c22"
                            : appt.status === "cancelled"
                            ? "#450a0a"
                            : "#020617",
                        color:
                          appt.status === "confirmed"
                            ? "#22c55e"
                            : appt.status === "cancelled"
                            ? "#f97316"
                            : "#e2e8f0",
                      }}
                    >
                      {isUpdating ? "Atualizando..." : appt.status}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          handleChangeStatus(appt.id, "pending")
                        }
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: "1px solid #1e293b",
                          background: "transparent",
                          color: "#e2e8f0",
                          fontSize: 11,
                          cursor: isUpdating ? "default" : "pointer",
                        }}
                      >
                        Pendente
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          handleChangeStatus(appt.id, "confirmed")
                        }
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: "none",
                          background: "#22c55e",
                          color: "#0b1120",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: isUpdating ? "default" : "pointer",
                        }}
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          handleChangeStatus(appt.id, "cancelled")
                        }
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: "1px solid #b91c1c",
                          background: "transparent",
                          color: "#f97316",
                          fontSize: 11,
                          cursor: isUpdating ? "default" : "pointer",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Modal de novo agendamento */}
      {showNewModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              background: "#020617",
              borderRadius: 16,
              border: "1px solid #1e293b",
              padding: 20,
              boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
            }}
          >
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>
              Novo agendamento – {selectedDate.split("-").reverse().join("/")}
            </h3>
            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                marginBottom: 12,
              }}
            >
              Preencha os dados do cliente e o horário. Ideal para barbeiros,
              dentistas, clínicas, estúdios etc.
            </p>

            {formError && (
              <div
                style={{
                  marginBottom: 10,
                  padding: 8,
                  borderRadius: 8,
                  background: "#451a03",
                  border: "1px solid #f97316",
                  fontSize: 13,
                  color: "#fed7aa",
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateAppointment}>
              <label
                style={{ display: "block", marginBottom: 10, fontSize: 13 }}
              >
                Nome do cliente
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: João Silva"
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #1e293b",
                    background: "#020617",
                    color: "#e2e8f0",
                    fontSize: 14,
                  }}
                />
              </label>

              <label
                style={{ display: "block", marginBottom: 10, fontSize: 13 }}
              >
                Telefone / WhatsApp
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #1e293b",
                    background: "#020617",
                    color: "#e2e8f0",
                    fontSize: 14,
                  }}
                />
              </label>

              <label
                style={{ display: "block", marginBottom: 10, fontSize: 13 }}
              >
                Serviço
                <input
                  type="text"
                  value={formService}
                  onChange={(e) => setFormService(e.target.value)}
                  placeholder="Ex: Corte masculino, limpeza de pele..."
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #1e293b",
                    background: "#020617",
                    color: "#e2e8f0",
                    fontSize: 14,
                  }}
                />
              </label>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ flex: "0 0 130px" }}>
                  <label
                    style={{ display: "block", fontSize: 13, marginBottom: 2 }}
                  >
                    Horário
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: 6,
                      borderRadius: 8,
                      border: "1px solid #1e293b",
                      background: "#020617",
                      color: "#e2e8f0",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              <label
                style={{ display: "block", marginBottom: 12, fontSize: 13 }}
              >
                Observações
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  placeholder="Ex: cliente prefere máquina, tem alergia a tal produto, etc."
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #1e293b",
                    background: "#020617",
                    color: "#e2e8f0",
                    resize: "vertical",
                    fontSize: 13,
                  }}
                />
              </label>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!savingAppt) setShowNewModal(false);
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: "1px solid #1e293b",
                    background: "transparent",
                    color: "#e2e8f0",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAppt}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 999,
                    border: "none",
                    background: savingAppt ? "#082f49" : "#0ea5e9",
                    color: "#0b1120",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: savingAppt ? "default" : "pointer",
                  }}
                >
                  {savingAppt ? "Salvando..." : "Salvar agendamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
