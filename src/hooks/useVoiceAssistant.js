import { useState, useEffect, useRef, useCallback } from 'react';
import { classifyVoiceCommand, normalizeTranscript } from '../services/nlpVoiceParser.js';

/**
 * ============================================================================
 * TREAD ADVANCED VOICE & NATURAL LANGUAGE ASSISTANT HOOK
 * ============================================================================
 * 
 * Bridges Web Speech Recognition (STT) and Web Speech Synthesis (TTS)
 * with the nlpVoiceParser engine.
 * 
 * Supports:
 * - Natural language billing: "Bill 10 wireless mouse to Sharma Electronics at 450 with 18% GST"
 * - Hindi & Hinglish commands: "5 packet sugar add karo rate 45", "Sharma Traders ko bill banao"
 * - Navigation: "Go to Dashboard", "Open Stock", "Show Invoices", "Open File Analyzer"
 * - Invoice management: "Save invoice", "Clear bill", "Print invoice"
 * - Stock Catalog: "Add stock 20W Fast Charger price 299 hsn 8504 gst 18% stock 50"
 * - Party Master: "Add party Raj Electricals mobile 9876543210 address Delhi gstin 07AAAAA0000A1Z5"
 * - Cloud & Sync: "Sync with cloud", "Trigger backup"
 * 
 * Provides spoken TTS confirmation for hand-free operations.
 */
export function useVoiceAssistant({
  onResetInvoice,
  onSaveInvoice,
  onSetCustomerName,
  onSetInvoiceNumber,
  onSetCustomerPhone,
  onSetCustomerAddress,
  onAddItem,
  onAddStockItem,
  onSaveParty,
  onNavigate,
  onTriggerCloudSync,
  onOpenAiCopilot,
  onOpenFileAnalyzer,
  ttsEnabled = true,
}) {
  const [voiceSupported] = useState(
    () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [lastCommandFeedback, setLastCommandFeedback] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  // Keep all handler references up to date
  const handlersRef = useRef({
    onResetInvoice,
    onSaveInvoice,
    onSetCustomerName,
    onSetInvoiceNumber,
    onSetCustomerPhone,
    onSetCustomerAddress,
    onAddItem,
    onAddStockItem,
    onSaveParty,
    onNavigate,
    onTriggerCloudSync,
    onOpenAiCopilot,
    onOpenFileAnalyzer,
  });

  useEffect(() => {
    handlersRef.current = {
      onResetInvoice,
      onSaveInvoice,
      onSetCustomerName,
      onSetInvoiceNumber,
      onSetCustomerPhone,
      onSetCustomerAddress,
      onAddItem,
      onAddStockItem,
      onSaveParty,
      onNavigate,
      onTriggerCloudSync,
      onOpenAiCopilot,
      onOpenFileAnalyzer,
    };
  });

  // Text-To-Speech (TTS) Voice Feedback
  const speakFeedback = useCallback((text) => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;

    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`>~]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-IN';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  }, [ttsEnabled]);

  // Unified command execution (works for both live speech & manual text)
  const executeCommand = useCallback((rawText) => {
    if (!rawText || typeof rawText !== 'string') return null;

    const normalized = normalizeTranscript(rawText);
    const classified = classifyVoiceCommand(normalized || rawText);
    const handlers = handlersRef.current;
    let spokenText = classified.voiceFeedback || '';

    switch (classified.intent) {
      case 'NAVIGATE':
        if (classified.payload?.page) {
          if (classified.payload.page === 'Universal File AI' && handlers.onOpenFileAnalyzer) {
            handlers.onOpenFileAnalyzer();
          } else if (handlers.onNavigate) {
            handlers.onNavigate(classified.payload.page);
          }
        }
        break;

      case 'ADD_INVOICE_ITEM':
        if (handlers.onAddItem && classified.payload) {
          handlers.onAddItem({
            description: classified.payload.description || 'Voice Item',
            quantity: classified.payload.quantity || 1,
            unit: classified.payload.unit || 'PCS',
            rate: classified.payload.rate || 0,
            gstPercent: classified.payload.gstPercent || 18,
            hsn: classified.payload.hsn || '',
          });

          // If a customer was identified in the phrase ("to Sharma Electronics"), set it
          if (classified.payload.partyName && handlers.onSetCustomerName) {
            handlers.onSetCustomerName(classified.payload.partyName);
          }
        }
        break;

      case 'INVOICE_CONTROL':
        if (classified.action === 'SAVE_INVOICE') {
          handlers.onSaveInvoice?.();
        } else if (classified.action === 'RESET_INVOICE') {
          handlers.onResetInvoice?.();
        } else if (classified.action === 'PRINT_INVOICE') {
          handlers.onNavigate?.('Add Sales');
        }
        break;

      case 'ADD_PARTY':
        if (handlers.onSaveParty && classified.payload) {
          handlers.onSaveParty({
            id: `party-${Date.now()}`,
            name: classified.payload.name,
            phone: classified.payload.phone,
            gstin: classified.payload.gstin,
            address: classified.payload.address,
            type: 'Customer',
            createdAt: new Date().toISOString(),
          });
        }
        break;

      case 'ADD_STOCK':
        if (handlers.onAddStockItem && classified.payload) {
          handlers.onAddStockItem({
            id: `stock-${Date.now()}`,
            name: classified.payload.name,
            rate: classified.payload.rate,
            stock: classified.payload.stock,
            unit: classified.payload.unit,
            gst: classified.payload.gst,
            hsn: classified.payload.hsn,
            createdAt: new Date().toISOString(),
          });
        }
        break;

      case 'SYSTEM':
        if (classified.action === 'TRIGGER_CLOUD_SYNC') {
          handlers.onTriggerCloudSync?.();
        }
        break;

      case 'AI_CHAT_QUERY':
      default:
        // Open AI Copilot for general reasoning queries
        if (handlers.onOpenAiCopilot) {
          handlers.onOpenAiCopilot(rawText);
        }
        break;
    }

    setLastCommandFeedback(spokenText);
    if (spokenText) {
      speakFeedback(spokenText);
    }

    return classified;
  }, [speakFeedback]);

  // Speech Recognition setup
  useEffect(() => {
    if (!voiceSupported || typeof window === 'undefined') return;
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) return;

    const recognition = new SpeechClass();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const sentence = last[0].transcript.trim();
      setVoiceTranscript((prev) => `${prev} ${sentence}`.trim());
      executeCommand(sentence);
    };

    recognition.onerror = () => setRecognitionActive(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [voiceSupported, executeCommand]);

  // Start / Stop toggle
  useEffect(() => {
    if (!recognitionRef.current) return;
    if (recognitionActive) {
      try {
        recognitionRef.current.start();
      } catch {
        // already running
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch {
        // already stopped
      }
    }
  }, [recognitionActive]);

  return {
    voiceSupported,
    recognitionActive,
    setRecognitionActive,
    voiceTranscript,
    lastCommandFeedback,
    isSpeaking,
    dispatchCommand: executeCommand,
  };
}
