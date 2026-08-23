import React, { useState, useRef, useEffect } from "react";
import { askQuestion, applyLeave } from "./api.js";

/**
 * App.jsx
 * -------
 * Chat-style UI, as requested by founders - one conversation thread instead
 * of two separate forms. The user can ask policy questions OR apply for
 * leave, both through the same chat window:
 *   - Plain text -> treated as a policy question (POST /ask)
 *   - "Apply for Leave" button -> opens a small inline form INSIDE the chat,
 *     and the result is posted back into the chat as a bot message.
 *
 * All messages live in one `messages` array (state). Each message is either
 * { from: "user", text } or { from: "bot", text, source?, in_scope? } or
 * { from: "bot", leaveResult } for leave-application results.
 */
export default function App() {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! Ask me anything about Leave, Attendance, or WFH policy - or apply for leave below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, showLeaveForm]);

  async function sendQuestion(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setMessages((m) => [...m, { from: "user", text: question }]);
    setInput("");
    setLoading(true);

    const data = await askQuestion(question);
    setMessages((m) => [
      ...m,
      { from: "bot", text: data.answer, source: data.source, in_scope: data.in_scope, confidence: data.confidence },
    ]);
    setLoading(false);
  }

  function handleLeaveResult(result, formSummary) {
    setMessages((m) => [
      ...m,
      { from: "user", text: formSummary },
      { from: "bot", leaveResult: result },
    ]);
    setShowLeaveForm(false);
  }

  return (
    <div className="app-bg">
      <div className="chat-shell">
        <header className="chat-header">
          <div className="bot-avatar">HR</div>
          <div>
            <h1>HR Policy Assistant</h1>
            <p>Leave &middot; Attendance &middot; WFH</p>
          </div>
        </header>

        <div className="chat-scroll" ref={scrollRef}>
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}

          {loading && (
            <div className="bubble-row bot">
              <div className="bubble bot typing">
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            </div>
          )}

          {showLeaveForm && (
            <div className="bubble-row bot">
              <LeaveFormCard onResult={handleLeaveResult} onCancel={() => setShowLeaveForm(false)} />
            </div>
          )}
        </div>

        <div className="chat-actions">
          <button
            type="button"
            className="pill-btn"
            onClick={() => setShowLeaveForm((v) => !v)}
          >
            📅 Apply for Leave
          </button>
        </div>

        <form className="chat-input-bar" onSubmit={sendQuestion}>
          <input
            type="text"
            placeholder="Ask a policy question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={loading || !input.trim()}>➤</button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// A single chat bubble - user message, bot answer, or bot leave-result card
// ---------------------------------------------------------------------
function MessageBubble({ message }) {
  if (message.leaveResult) {
    return (
      <div className="bubble-row bot">
        <LeaveResultCard result={message.leaveResult} />
      </div>
    );
  }

  const isUser = message.from === "user";
  return (
    <div className={`bubble-row ${isUser ? "user" : "bot"}`}>
      <div className={`bubble ${isUser ? "user" : "bot"} ${!isUser && message.in_scope === false ? "unsure" : ""}`}>
        <p>{message.text}</p>
        {!isUser && message.in_scope && (
          <div className="bubble-meta">
            <span className="badge">{message.source}</span>
            <span className="confidence">confidence {message.confidence}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Inline leave-application form, rendered as a card inside the chat
// ---------------------------------------------------------------------
function LeaveFormCard({ onResult, onCancel }) {
  const [leaveType, setLeaveType] = useState("casual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setSubmitting(true);
    const result = await applyLeave({ leaveType, startDate, endDate });
    const summary = `Apply ${leaveType} leave: ${startDate} to ${endDate}`;
    setSubmitting(false);
    onResult(result, summary);
  }

  return (
    <div className="card-bubble">
      <h3>Leave Application</h3>
      <form onSubmit={handleSubmit} className="leave-inline-form">
        <label>
          Type
          <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
            <option value="casual">Casual</option>
            <option value="sick">Sick</option>
          </select>
        </label>
        <label>
          Start
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          End
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <div className="card-actions">
          <button type="button" className="ghost-btn" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={submitting}>{submitting ? "Checking..." : "Submit"}</button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------
// Result card shown after a leave application is processed
// ---------------------------------------------------------------------
function LeaveResultCard({ result }) {
  const approved = result.status === "approved";
  return (
    <div className={`card-bubble result-card ${approved ? "approved" : "rejected"}`}>
      <div className="result-icon">{approved ? "✅" : "❌"}</div>
      <div>
        <p className="result-status">{approved ? "Approved" : "Rejected"}</p>
        {result.reason && <p className="result-text">{result.reason}</p>}
        {result.notes?.length > 0 && <p className="result-note">Note: {result.notes.join(" ")}</p>}
      </div>
    </div>
  );
}
