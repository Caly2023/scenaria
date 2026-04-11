import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface UseSpeechToTextOptions {
  onResult?: (text: string) => void;
  lang?: string;
  onSpeechError?: (error: string) => void;
}

export function useSpeechToText({ onResult, lang, onSpeechError }: UseSpeechToTextOptions = {}) {
  const { i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let rec: any = null;

    if (SpeechRecognition) {
      rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang || (i18n.language === 'fr' ? 'fr-FR' : 'en-US');

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript && onResult) {
          onResult(finalTranscript);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        setIsListening(false);
        if (onSpeechError) {
          onSpeechError(event.error);
        } else {
          console.warn('Speech recognition error', event.error);
        }
      };

      setRecognition(rec);
    }

    return () => {
      // Memory leak fix: Cleanup properly on unmount
      if (rec) {
        try { rec.abort(); } catch(e) {}
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
      }
    };
  }, [i18n.language, lang, onResult, onSpeechError]);

  const startListening = useCallback(() => {
    if (recognition) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Failed to start recognition', e);
      }
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    toggleListening,
    isSupported: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  };
}
