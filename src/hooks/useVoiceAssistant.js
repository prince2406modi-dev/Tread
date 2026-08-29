import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for Web Speech Recognition and natural voice commands.
 */
export function useVoiceAssistant({
  onResetInvoice,
  onSaveInvoice,
  onSetCustomerName,
  onSetInvoiceNumber,
  onSetCustomerPhone,
  onSetCustomerAddress,
  onAddItem,
}) {
  const [voiceSupported] = useState(
    () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [recognitionActive, setRecognitionActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const recognitionRef = useRef(null);

  // Keep references to handlers up-to-date
  const handlersRef = useRef({
    onResetInvoice,
    onSaveInvoice,
    onSetCustomerName,
    onSetInvoiceNumber,
    onSetCustomerPhone,
    onSetCustomerAddress,
    onAddItem,
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
    };
  });

  const processVoiceCommand = (command) => {
    if (!command) return;
    const text = command.toLowerCase().trim();
    const handlers = handlersRef.current;

    if (text.includes('clear invoice') || text.includes('reset invoice') || text.includes('new invoice')) {
      handlers.onResetInvoice?.();
      return;
    }
    if (text.includes('save invoice') || text.includes('submit invoice')) {
      handlers.onSaveInvoice?.();
      return;
    }
    if (text.includes('set customer name to')) {
      const val = command.split(/set customer name to/i)[1]?.trim();
      if (val) handlers.onSetCustomerName?.(val);
      return;
    }
    if (text.includes('set invoice number to')) {
      const val = command.split(/set invoice number to/i)[1]?.trim();
      if (val) handlers.onSetInvoiceNumber?.(val);
      return;
    }
    if (text.includes('set customer phone to') || text.includes('set mobile to') || text.includes('set phone to')) {
      const parts = command.split(/set (customer )?(phone|mobile) to/i);
      const val = parts[parts.length - 1]?.trim();
      if (val) handlers.onSetCustomerPhone?.(val);
      return;
    }
    if (text.includes('set address to') || text.includes('set customer address to')) {
      const val = command.split(/set (customer )?address to/i)[1]?.trim();
      if (val) handlers.onSetCustomerAddress?.(val);
      return;
    }
    if (text.includes('add item')) {
      const regex = /add item\s+(.+?)(?:\s+quantity\s+(\d+))?(?:\s+rate\s+(\d+(?:\.\d+)?))?(?:\s+gst\s+(\d+))?$/i;
      const match = command.match(regex);
      if (match) {
        handlers.onAddItem?.({
          description: match[1]?.trim() || 'Voice Item',
          quantity: Number(match[2] || 1),
          rate: Number(match[3] || 0),
          gstPercent: Number(match[4] || 18),
        });
      }
    }
  };

  const processVoiceRef = useRef(processVoiceCommand);
  useEffect(() => {
    processVoiceRef.current = processVoiceCommand;
  });

  useEffect(() => {
    if (!voiceSupported || typeof window === 'undefined') return;
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechClass) return;

    const recognition = new SpeechClass();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const sentence = last[0].transcript.trim();
      setVoiceTranscript((prev) => `${prev} ${sentence}`.trim());
      processVoiceRef.current?.(sentence);
    };

    recognition.onerror = () => setRecognitionActive(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [voiceSupported]);

  useEffect(() => {
    if (!recognitionRef.current) return;
    if (recognitionActive) {
      try {
        recognitionRef.current.start();
      } catch {
        // already started
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
  };
}
