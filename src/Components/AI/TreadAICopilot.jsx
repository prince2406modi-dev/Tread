import { useState, useEffect, useRef, useCallback } from 'react';
import {
  queryTreadAI,
  getAiConfig,
  saveAiConfig,
  AI_PROVIDERS,
  fetchOllamaModels,
  testOllamaConnection,
} from '../../services/aiAssistantService.js';

export default function TreadAICopilot({
  isOpen,
  onClose,
  invoices = [],
  customers = [],
  stockItems = [],
  company = {},
  onLoadInvoiceToEditor,
  onSaveCustomer,
  onAddStockItem,
  onNavigate,
}) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings State
  const [aiConfig, setAiConfig] = useState(getAiConfig);
  const [settingsStatus, setSettingsStatus] = useState('');

  // Ollama Live State
  const [ollamaStatus, setOllamaStatus] = useState({
    testing: false,
    connected: null,
    version: '',
    error: '',
  });
  const [installedOllamaModels, setInstalledOllamaModels] = useState([]);

  const checkOllamaConnectivity = useCallback(async (targetUrl) => {
    const url = targetUrl || aiConfig.ollamaUrl || 'http://localhost:11434';
    setOllamaStatus((prev) => ({ ...prev, testing: true }));
    const testRes = await testOllamaConnection(url);
    if (testRes.success) {
      const models = await fetchOllamaModels(url);
      setInstalledOllamaModels(models);
      setOllamaStatus({ testing: false, connected: true, version: testRes.version, error: '' });
    } else {
      setOllamaStatus({ testing: false, connected: false, version: '', error: testRes.error });
    }
  }, [aiConfig.ollamaUrl]);

  useEffect(() => {
    if (isOpen) {
      checkOllamaConnectivity();
    }
  }, [isOpen, checkOllamaConnectivity]);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: `👋 **Hello! I am Tread AI Copilot**, powered by local **Ollama (${aiConfig.ollamaModel || 'qwen2.5:7b'})**.\n\nI can create invoices from speech or text, register parties, inspect stock, and answer GST laws!\n\nTry clicking **🎤 Voice** to speak e.g. *"Bill 5 LED bulbs at 120 each to Sharma Traders"* or select a prompt below.`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // =========================================================
  // VOICE RECOGNITION (STT) & SPEECH SYNTHESIS (TTS)
  // =========================================================
  const [voiceSupported] = useState(
    () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const [ttsSupported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [voiceRepliesEnabled, setVoiceRepliesEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = window.localStorage.getItem('tread-ai-voice-replies');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isListening]);

  // Clean up audio on unmount or close
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const speakText = (text) => {
    if (!ttsSupported || !text) return;
    stopSpeaking();

    // Clean markdown tags for natural speech
    const cleanText = text
      .replace(/[*#_`>~]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-IN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const handleSend = async (customPrompt) => {
    const query = (customPrompt || inputText).trim();
    if (!query || isLoading) return;

    stopSpeaking();

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const context = {
        company,
        invoices,
        customers,
        stockItems,
      };

      const result = await queryTreadAI(query, context);

      const assistantMsg = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        text: result.reply,
        action: result.action,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Speak response aloud if voice replies are enabled
      if (voiceRepliesEnabled && result.reply) {
        speakText(result.reply);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ **Error**: ${err.message || 'Failed to process request.'}`,
          timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceListening = () => {
    if (!voiceSupported) {
      alert('Voice recognition is not supported in this browser. Please use Google Chrome, Edge, or the Tread Android app.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) return;

    try {
      const recognition = new SpeechClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      let finalSpeech = '';

      recognition.onstart = () => {
        setIsListening(true);
        stopSpeaking();
      };

      recognition.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalSpeech += e.results[i][0].transcript;
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        const currentText = finalSpeech || interim;
        if (currentText) {
          setInputText(currentText);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (finalSpeech && finalSpeech.trim().length > 1) {
          handleSend(finalSpeech.trim());
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Voice recognition start failed:', err);
      setIsListening(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Action Executions
  const executeInvoiceAction = (actionPayload) => {
    if (onLoadInvoiceToEditor) {
      onLoadInvoiceToEditor({
        customerName: actionPayload.customerName,
        items: actionPayload.items,
        invoiceDate: new Date().toISOString().slice(0, 10),
      });
      if (onNavigate) onNavigate('Add Sales');
      onClose();
    }
  };

  const executeCustomerAction = (actionPayload) => {
    if (onSaveCustomer) {
      onSaveCustomer({
        name: actionPayload.name,
        phone: actionPayload.phone,
        gstin: actionPayload.gstin,
        type: actionPayload.type,
      });
    }
  };

  const executeStockAction = (actionPayload) => {
    if (onAddStockItem) {
      onAddStockItem(actionPayload);
    }
  };

  const handleSaveSettings = () => {
    saveAiConfig(aiConfig);
    setSettingsStatus('✓ Settings saved successfully!');
    setTimeout(() => {
      setSettingsStatus('');
      setShowSettings(false);
    }, 1200);
  };

  const toggleVoiceReplies = () => {
    const nextVal = !voiceRepliesEnabled;
    setVoiceRepliesEnabled(nextVal);
    if (!nextVal) stopSpeaking();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('tread-ai-voice-replies', JSON.stringify(nextVal));
    }
  };

  if (!isOpen) return null;

  const quickPrompts = [
    'Bill 10 pcs LED bulb at 150 each to Sharma Electronics',
    'Add customer Anita Traders phone 9876543210',
    'Add stock 20W Fast Charger price 350 hsn 8504 gst 18% stock 50',
    'Summarize my total sales and revenue',
    'Do I have any low stock items?',
    'What is the HSN code and GST rate for computer peripherals?',
  ];

  return (
    <div className="modal-backdrop-custom d-flex justify-content-center align-items-center" style={{ zIndex: 1060 }}>
      <div
        className="card shadow-lg border-0 rounded-4 overflow-hidden"
        style={{
          width: '95%',
          maxWidth: '740px',
          height: '85vh',
          maxHeight: '760px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Header */}
        <div
          className="d-flex justify-content-between align-items-center px-4 py-3 text-white"
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <span className="fs-4">✨</span>
            <div>
              <div className="fw-bold fs-6 d-flex align-items-center gap-2 flex-wrap">
                <span>Tread AI Copilot</span>
                <span
                  className="badge rounded-pill fw-medium d-flex align-items-center gap-1"
                  style={{
                    backgroundColor:
                      aiConfig.provider === AI_PROVIDERS.OLLAMA
                        ? ollamaStatus.connected ? '#059669' : '#b45309'
                        : aiConfig.provider === AI_PROVIDERS.GEMINI
                        ? '#2563eb'
                        : '#475569',
                    fontSize: '11px',
                  }}
                >
                  {aiConfig.provider === AI_PROVIDERS.OLLAMA ? (
                    <>
                      <span>🦙 Ollama: {aiConfig.ollamaModel}</span>
                      <span
                        className={`badge rounded-pill py-0 px-1 ${
                          ollamaStatus.connected ? 'bg-white text-success' : 'bg-white text-danger'
                        }`}
                        style={{ fontSize: '9.5px' }}
                      >
                        {ollamaStatus.connected === true
                          ? '● Online'
                          : ollamaStatus.testing
                          ? '● Checking...'
                          : '● Offline'}
                      </span>
                    </>
                  ) : aiConfig.provider === AI_PROVIDERS.GEMINI ? (
                    'Gemini Cloud'
                  ) : (
                    'Built-in Offline'
                  )}
                </span>
              </div>
              <small className="text-white-50" style={{ fontSize: '11px' }}>
                Local Ollama LLM &amp; Natural Voice Assistant
              </small>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Audio Voice Responses Toggle */}
            {ttsSupported && (
              <button
                type="button"
                className={`btn btn-sm ${voiceRepliesEnabled ? 'btn-outline-info' : 'btn-outline-secondary'} py-1 px-2 d-flex align-items-center gap-1`}
                style={{ fontSize: '11px' }}
                onClick={toggleVoiceReplies}
                title="Toggle AI voice audio answers"
              >
                <span>{voiceRepliesEnabled ? '🔊 Audio ON' : '🔇 Audio OFF'}</span>
              </button>
            )}

            {/* Stop Audio Button if currently speaking */}
            {isSpeaking && (
              <button
                type="button"
                className="btn btn-sm btn-danger py-1 px-2 d-flex align-items-center gap-1"
                style={{ fontSize: '11px' }}
                onClick={stopSpeaking}
                title="Stop audio playback"
              >
                <span>⏹️ Stop</span>
              </button>
            )}

            <button
              type="button"
              className={`btn btn-sm ${showSettings ? 'btn-light' : 'btn-outline-light'} py-1 px-2 d-flex align-items-center gap-1`}
              onClick={() => setShowSettings((prev) => !prev)}
              title="AI Engine Settings"
            >
              ⚙️ <span className="d-none d-sm-inline">Settings</span>
            </button>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => {
                stopSpeaking();
                onClose();
              }}
              aria-label="Close"
            />
          </div>
        </div>

        {/* Settings Tab */}
        {showSettings ? (
          <div className="p-4 overflow-auto flex-grow-1 bg-light">
            <h5 className="fw-bold mb-2 d-flex align-items-center gap-2 text-dark">
              <span>⚙️</span> Tread AI Engine Configuration
            </h5>
            <p className="text-muted small mb-3">
              Tread AI is configured to use <strong>local Ollama (e.g. Qwen 2.5 7B / 8B)</strong> by default for private, on-device intelligence.
            </p>

            <div className="card p-3 mb-3 border bg-white shadow-xs">
              {/* Option 1: Ollama Local LLM (Featured & Default) */}
              <div className="form-check mb-3 pb-3 border-bottom">
                <input
                  className="form-check-input"
                  type="radio"
                  name="aiProvider"
                  id="providerOllama"
                  checked={aiConfig.provider === AI_PROVIDERS.OLLAMA}
                  onChange={() => setAiConfig((c) => ({ ...c, provider: AI_PROVIDERS.OLLAMA }))}
                />
                <label className="form-check-label fw-bold text-primary fs-6" htmlFor="providerOllama">
                  🦙 Local Ollama LLM (Qwen 2.5 / Llama 3 / DeepSeek) — Recommended
                </label>
                <div className="text-muted small ps-4 mt-1">
                  Runs local open-source LLMs directly on your device. Complete privacy with zero API costs.
                </div>

                {aiConfig.provider === AI_PROVIDERS.OLLAMA && (
                  <div className="ps-4 mt-3 bg-light p-3 rounded-3 border">
                    <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="small fw-bold">Live Status:</span>
                        {ollamaStatus.testing ? (
                          <span className="badge bg-secondary">Checking...</span>
                        ) : ollamaStatus.connected ? (
                          <span className="badge bg-success">
                            ✓ Connected to Ollama ({ollamaStatus.version})
                          </span>
                        ) : (
                          <span className="badge bg-warning text-dark">
                            ⚠️ Unreachable (Fallback to Built-in Engine Active)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary py-0 px-2 fw-semibold"
                        style={{ fontSize: '11.5px' }}
                        onClick={() => checkOllamaConnectivity(aiConfig.ollamaUrl)}
                        disabled={ollamaStatus.testing}
                      >
                        🔄 Test &amp; Scan Models
                      </button>
                    </div>

                    {!ollamaStatus.connected && !ollamaStatus.testing && (
                      <div className="alert alert-warning py-2 px-3 small mb-3">
                        <div className="fw-semibold mb-1">To run Ollama on your computer:</div>
                        <ol className="ps-3 mb-1">
                          <li>
                            Download from <a href="https://ollama.com" target="_blank" rel="noreferrer" className="fw-bold">ollama.com</a>
                          </li>
                          <li>
                            Open PowerShell or Terminal and run: <code>ollama run qwen2.5:7b</code>
                          </li>
                          <li>
                            To enable browser access: <code>$env:OLLAMA_ORIGINS="*"; ollama serve</code>
                          </li>
                        </ol>
                        {typeof window !== 'undefined' && window.location.protocol === 'https:' && (
                          <div className="mt-2 pt-2 border-top border-warning-subtle text-dark">
                            <strong>🔒 Note on HTTPS:</strong> Because you are on <code>https://tread-8f7a2.web.app</code>, browsers block insecure <code>http://localhost</code>. Run Tread locally via <code>npm run dev</code> on <code>http://localhost:5173</code> to connect directly, or use an HTTPS tunnel (e.g. <code>ngrok http 11434</code>)!
                          </div>
                        )}
                        <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
                          *Note: When Ollama is offline or blocked, Tread AI automatically uses its built-in rule engine so your invoices and commands continue to work seamlessly!
                        </div>
                      </div>
                    )}

                    <div className="row g-2">
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Ollama Endpoint URL</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={aiConfig.ollamaUrl}
                          onChange={(e) => setAiConfig((c) => ({ ...c, ollamaUrl: e.target.value }))}
                          placeholder="http://localhost:11434"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Model Name</label>
                        {installedOllamaModels.length > 0 ? (
                          <select
                            className="form-select form-select-sm"
                            value={aiConfig.ollamaModel}
                            onChange={(e) => setAiConfig((c) => ({ ...c, ollamaModel: e.target.value }))}
                          >
                            {installedOllamaModels.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                            {!installedOllamaModels.includes(aiConfig.ollamaModel) && (
                              <option value={aiConfig.ollamaModel}>{aiConfig.ollamaModel}</option>
                            )}
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={aiConfig.ollamaModel}
                            onChange={(e) => setAiConfig((c) => ({ ...c, ollamaModel: e.target.value }))}
                            placeholder="qwen2.5:7b"
                          />
                        )}
                        <div className="text-muted" style={{ fontSize: '10.5px', marginTop: '3px' }}>
                          Recommended models: <code>qwen2.5:7b</code>, <code>qwen2.5:8b</code>, <code>llama3.2</code>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Option 2: Built-in Offline Intelligence */}
              <div className="form-check mb-3 pb-3 border-bottom">
                <input
                  className="form-check-input"
                  type="radio"
                  name="aiProvider"
                  id="providerBuiltin"
                  checked={aiConfig.provider === AI_PROVIDERS.BUILTIN}
                  onChange={() => setAiConfig((c) => ({ ...c, provider: AI_PROVIDERS.BUILTIN }))}
                />
                <label className="form-check-label fw-bold" htmlFor="providerBuiltin">
                  ⚡ Built-in Offline Engine (Zero Setup / Standalone)
                </label>
                <div className="text-muted small ps-4 mt-1">
                  100% private rule-based NLP engine. Instant responses without installing Ollama or any external software.
                </div>
              </div>

              {/* Option 3: Google Gemini API */}
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="aiProvider"
                  id="providerGemini"
                  checked={aiConfig.provider === AI_PROVIDERS.GEMINI}
                  onChange={() => setAiConfig((c) => ({ ...c, provider: AI_PROVIDERS.GEMINI }))}
                />
                <label className="form-check-label fw-bold" htmlFor="providerGemini">
                  🌐 Google Gemini Cloud API
                </label>
                <div className="text-muted small ps-4 mt-1">
                  Cloud intelligence powered by Gemini 1.5 Flash. Requires a Google AI API key.
                </div>

                {aiConfig.provider === AI_PROVIDERS.GEMINI && (
                  <div className="ps-4 mt-2">
                    <div className="mb-2">
                      <label className="form-label small fw-semibold">Gemini API Key</label>
                      <input
                        type="password"
                        className="form-control form-control-sm"
                        value={aiConfig.geminiApiKey}
                        onChange={(e) => setAiConfig((c) => ({ ...c, geminiApiKey: e.target.value }))}
                        placeholder="AIzaSy..."
                      />
                    </div>
                    <div>
                      <label className="form-label small fw-semibold">Model</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={aiConfig.geminiModel}
                        onChange={(e) => setAiConfig((c) => ({ ...c, geminiModel: e.target.value }))}
                        placeholder="gemini-1.5-flash"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {settingsStatus && <div className="alert alert-success py-2 small">{settingsStatus}</div>}

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowSettings(false)}
              >
                Back to Chat
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm px-3"
                onClick={handleSaveSettings}
              >
                Save Preferences
              </button>
            </div>
          </div>
        ) : (
          /* Chat Area */
          <div className="d-flex flex-column flex-grow-1 overflow-hidden">
            <div className="flex-grow-1 p-3 overflow-auto d-flex flex-column gap-3" style={{ backgroundColor: '#f8fafc' }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`d-flex ${m.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
                >
                  <div
                    className="p-3 rounded-4 shadow-xs"
                    style={{
                      maxWidth: '85%',
                      backgroundColor: m.role === 'user' ? '#2563eb' : '#ffffff',
                      color: m.role === 'user' ? '#ffffff' : '#1e293b',
                      border: m.role === 'user' ? 'none' : '1px solid #e2e8f0',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.5',
                      fontSize: '13.5px',
                    }}
                  >
                    <div>{m.text}</div>

                    {/* Interactive Action Cards */}
                    {m.action && (
                      <div className="mt-3 pt-2 border-top border-light-subtle">
                        {m.action.type === 'CREATE_INVOICE' && (
                          <div className="bg-light p-2 rounded-3 text-dark border">
                            <div className="fw-bold small mb-1">
                              📝 Invoicing Target: {m.action.payload.customerName}
                            </div>
                            <div className="small text-muted mb-2">
                              {m.action.payload.items[0]?.quantity}x {m.action.payload.items[0]?.description} @ ₹
                              {m.action.payload.items[0]?.rate} (+{m.action.payload.items[0]?.gstPercent}% GST)
                            </div>
                            <button
                              type="button"
                              className="btn btn-success btn-sm w-100 fw-semibold d-flex align-items-center justify-content-center gap-1 shadow-xs"
                              onClick={() => executeInvoiceAction(m.action.payload)}
                            >
                              ⚡ Load into Invoice Editor
                            </button>
                          </div>
                        )}

                        {m.action.type === 'ADD_CUSTOMER' && (
                          <div className="bg-light p-2 rounded-3 text-dark border">
                            <div className="fw-bold small mb-1">
                              👤 Party: {m.action.payload.name} ({m.action.payload.type})
                            </div>
                            <div className="small text-muted mb-2">
                              Phone: {m.action.payload.phone || 'N/A'} | GSTIN: {m.action.payload.gstin || 'Unregistered'}
                            </div>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm w-100 fw-semibold shadow-xs"
                              onClick={() => {
                                executeCustomerAction(m.action.payload);
                                alert(`✓ Customer "${m.action.payload.name}" saved to directory!`);
                              }}
                            >
                              ➕ Save to Customers Directory
                            </button>
                          </div>
                        )}

                        {m.action.type === 'ADD_STOCK' && (
                          <div className="bg-light p-2 rounded-3 text-dark border">
                            <div className="fw-bold small mb-1">
                              📦 Inventory Item: {m.action.payload.name}
                            </div>
                            <div className="small text-muted mb-2">
                              Rate: ₹{m.action.payload.price} | HSN: {m.action.payload.hsn} | GST: {m.action.payload.gst}% | Qty: {m.action.payload.stock}
                            </div>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm w-100 fw-semibold shadow-xs"
                              onClick={() => {
                                executeStockAction(m.action.payload);
                                alert(`✓ Product "${m.action.payload.name}" added to stock master!`);
                              }}
                            >
                              📦 Add to Stock Inventory
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`d-flex justify-content-between align-items-center mt-2 pt-1 ${
                        m.role === 'user' ? 'text-white-50' : 'text-muted'
                      }`}
                      style={{ fontSize: '11px' }}
                    >
                      <span>{m.timestamp}</span>
                      {m.role === 'assistant' && ttsSupported && (
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-decoration-none p-0 text-muted d-flex align-items-center gap-1"
                          style={{ fontSize: '11px' }}
                          onClick={() => speakText(m.text)}
                          title="Read this response aloud"
                        >
                          <span>🔊</span>
                          <span>Listen</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="d-flex justify-content-start">
                  <div className="bg-white border p-3 rounded-4 text-muted small d-flex align-items-center gap-2 shadow-xs">
                    <div className="spinner-border spinner-border-sm text-primary" role="status" />
                    <span>Tread AI is processing...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            {messages.length < 3 && (
              <div className="p-2 border-top bg-white d-flex gap-1 overflow-auto" style={{ whiteSpace: 'nowrap' }}>
                <span className="small text-muted py-1 ps-1">Try:</span>
                {quickPrompts.slice(0, 3).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn btn-outline-secondary btn-sm rounded-pill text-truncate"
                    style={{ fontSize: '11.5px', maxWidth: '240px' }}
                    onClick={() => handleSend(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Active Speech Recognition Banner */}
            {isListening && (
              <div className="px-3 py-2 bg-danger-subtle text-danger border-top d-flex align-items-center justify-content-between small fw-medium">
                <div className="d-flex align-items-center gap-2">
                  <span className="voice-wave-indicator">
                    <span className="voice-wave-bar" style={{ backgroundColor: '#ef4444' }} />
                    <span className="voice-wave-bar" style={{ backgroundColor: '#ef4444' }} />
                    <span className="voice-wave-bar" style={{ backgroundColor: '#ef4444' }} />
                  </span>
                  <span>🎤 Listening to your voice... Speak your invoice command or GST question!</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-danger py-0 px-2 fw-semibold shadow-xs"
                  style={{ fontSize: '11px' }}
                  onClick={toggleVoiceListening}
                >
                  Done / Send
                </button>
              </div>
            )}

            {/* Input Bar with Voice Recognition Mic Button */}
            <div className="p-3 bg-white border-top">
              <div className="input-group shadow-xs">
                {voiceSupported && (
                  <button
                    type="button"
                    className={`btn ${
                      isListening ? 'btn-danger voice-mic-btn listening' : 'btn-outline-primary voice-mic-btn'
                    } px-3 fw-semibold`}
                    onClick={toggleVoiceListening}
                    title={isListening ? 'Stop recording & send' : 'Speak voice command to Tread AI'}
                  >
                    <span>{isListening ? '🔴' : '🎤'}</span>
                    <span className="d-none d-sm-inline">{isListening ? 'Listening...' : 'Voice'}</span>
                  </button>
                )}

                <input
                  ref={inputRef}
                  type="text"
                  className="form-control"
                  placeholder={
                    isListening
                      ? 'Listening to speech...'
                      : "Type or click 🎤 Voice e.g. 'Bill 5 fans at 1200 to Ramesh'..."
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />

                <button
                  type="button"
                  className="btn btn-primary px-4 fw-semibold d-flex align-items-center gap-1"
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() || isLoading}
                >
                  <span>Send</span>
                  <span>➤</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
