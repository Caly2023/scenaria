import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: {
    transcript: string;
  };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface UseSpeechToTextOptions {
  onResult?: (text: string) => void;
  lang?: string;
  onSpeechError?: (error: string) => void;
}

export function useSpeechToText({ onResult, lang, onSpeechError }: UseSpeechToTextOptions = {}) {
  const { i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognitionLike | null>(null);

  const onResultRef = useRef(onResult);
  const onSpeechErrorRef = useRef(onSpeechError);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onSpeechErrorRef.current = onSpeechError;
  }, [onSpeechError]);

  useEffect(() => {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    let rec: SpeechRecognitionLike | null = null;

    if (SpeechRecognition) {
      rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang || (i18n.language === 'fr' ? 'fr-FR' : 'en-US');

      rec.onresult = (event: SpeechRecognitionEventLike) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript && onResultRef.current) {
          onResultRef.current(finalTranscript);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
        setIsListening(false);
        if (onSpeechErrorRef.current) {
          onSpeechErrorRef.current(event.error);
        } else {
          console.warn('Speech recognition error', event.error);
        }
      };

      setTimeout(() => {
        setRecognition(rec);
      }, 0);
    }

    return () => {
      // Memory leak fix: Cleanup properly on unmount
      if (rec) {
        try {
          rec.abort();
        } catch (_error) {
          // Some browsers throw if recognition was never started.
        }
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
      }
    };
  }, [i18n.language, lang]);

  const startListening = useCallback(() => {
    if (recognition) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (_e) {
        console.warn('Failed to start recognition', _e);
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
    isSupported: !!(
      (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .webkitSpeechRecognition
    )
  };
}
