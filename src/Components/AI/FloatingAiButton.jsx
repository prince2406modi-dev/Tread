export default function FloatingAiButton({ onClick }) {
  return (
    <button
      type="button"
      className="floating-ai-btn shadow-lg"
      onClick={onClick}
      aria-label="Open Tread AI Copilot"
      title="Tread AI Copilot - Natural Voice Recognition, Billing & GST Assistant (Alt + A)"
    >
      <span className="ai-btn-sparkle">✨</span>
      <span className="ai-btn-label">Tread AI</span>
      <span className="badge bg-white text-dark rounded-pill px-1" style={{ fontSize: '10px' }}>🎤</span>
    </button>
  );
}
