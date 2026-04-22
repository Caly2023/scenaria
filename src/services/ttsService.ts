class TTSService {
  private isSpeakingMap: Map<string, string> = new Map();

  constructor() {
    // Ensure voices are loaded. Some browsers load voices asynchronously.
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.addEventListener('voiceschanged', () => {
          // Voices are ready
        });
      }
    }
  }

  /**
   * Helper to find the best voice for a given language code.
   * Prioritizes Google/neural voices over local ones.
   */
  private getBestVoice(langPrefix: string, preferredLangCode?: string): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    
    const allVoices = window.speechSynthesis.getVoices();
    if (allVoices.length === 0) return null;

    // Filter by the main language prefix (e.g. "fr", "en")
    const matchLangVoices = allVoices.filter(v => v.lang.toLowerCase().startsWith(langPrefix.toLowerCase()));
    
    if (matchLangVoices.length === 0) return null;

    // 1. Try to find exact preferred lang code + best quality
    if (preferredLangCode) {
      const exactMatches = matchLangVoices.filter(v => v.lang.toLowerCase().replace('_', '-') === preferredLangCode.toLowerCase());
      if (exactMatches.length > 0) {
        return this.rankVoices(exactMatches)[0];
      }
    }

    // 2. Try to find best quality voice among the matched language prefix
    return this.rankVoices(matchLangVoices)[0];
  }

  /**
   * Ranks voices to prioritize higher quality, neural, and Google voices.
   */
  private rankVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
    return [...voices].sort((a, b) => {
      // Prefer Google voices as they tend to be neural and higher quality
      const aIsGoogle = a.name.includes('Google');
      const bIsGoogle = b.name.includes('Google');
      if (aIsGoogle && !bIsGoogle) return -1;
      if (!aIsGoogle && bIsGoogle) return 1;

      // Prefer premium / neural in name
      const aIsPremium = a.name.toLowerCase().includes('premium') || a.name.toLowerCase().includes('neural');
      const bIsPremium = b.name.toLowerCase().includes('premium') || b.name.toLowerCase().includes('neural');
      if (aIsPremium && !bIsPremium) return -1;
      if (!aIsPremium && bIsPremium) return 1;

      // Prefer local service (though Google cloud voices are often better, if they exist they are caught above)
      if (a.localService && !b.localService) return -1;
      if (!a.localService && b.localService) return 1;

      return 0;
    });
  }

  /**
   * Determine the target language code based on project languages or content analysis.
   * Focuses on French and English.
   */
  private determineLanguageInfo(text: string, projectLanguages: string[] = []): { prefix: string, preferred: string } {
    const primaryStr = (projectLanguages[0] || '').toLowerCase();
    
    if (primaryStr.includes('french') || primaryStr.includes('français')) {
      return { prefix: 'fr', preferred: 'fr-FR' };
    }

    if (primaryStr.includes('english')) {
      return { prefix: 'en', preferred: 'en-US' };
    }

    // Fallback: Detect based on common French characters
    const isFrench = /[éàèùâêîôûëïü]/.test(text.toLowerCase());
    if (isFrench) {
      return { prefix: 'fr', preferred: 'fr-FR' };
    }
    
    // Default to English
    return { prefix: 'en', preferred: 'en-US' };
  }

  /**
   * Clean text for TTS by removing Markdown symbols and other characters that should not be read.
   */
  private cleanText(text: string): string {
    if (!text) return "";
    
    let cleaned = text;

    // 1. Remove Markdown Bold/Italic (**text**, *text*, __text__, _text_)
    cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, "$2");
    cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, "$2");

    // 2. Remove Markdown Headers (### Header)
    cleaned = cleaned.replace(/^#+\s+/gm, "");

    // 3. Remove Markdown Links ([label](url)) -> keeps only label
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

    // 4. Remove Markdown Code blocks and inline code
    cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
    cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

    // 5. Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>?/gm, "");

    // 6. Remove excessive asterisks/symbols that might be left over or used as separators
    // We keep basic punctuation like . , ? ! : ; ( )
    cleaned = cleaned.replace(/\*+/g, "");
    cleaned = cleaned.replace(/_+/g, "");
    cleaned = cleaned.replace(/#+/g, "");
    
    // Remove list markers at start of lines (e.g., "- ", "* ", "1. ")
    cleaned = cleaned.replace(/^\s*[-*]\s+/gm, "");
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, "");

    // 7. Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    return cleaned;
  }

  /**
   * Play text using the Web Speech API
   */
  public speak(
    text: string, 
    msgId: string, 
    projectLanguages: string[], 
    onEnd: () => void
  ): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn("Speech Synthesis is not supported in this environment.");
      onEnd();
      return;
    }

    // If already speaking this message, stop it.
    if (this.isSpeakingMap.get('current') === msgId) {
      window.speechSynthesis.cancel();
      this.isSpeakingMap.delete('current');
      onEnd();
      return;
    }

    window.speechSynthesis.cancel();
    
    // Allow short delay for cancel to fully flush
    setTimeout(() => {
      const cleanedText = this.cleanText(text);
      if (!cleanedText) {
        onEnd();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.rate = 0.9;
      const langInfo = this.determineLanguageInfo(text, projectLanguages);
      const bestVoice = this.getBestVoice(langInfo.prefix, langInfo.preferred);

      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
      } else {
        // Fallback if no voice is found but TTS is somewhat supported
        utterance.lang = langInfo.preferred;
      }

      utterance.onend = () => {
        if (this.isSpeakingMap.get('current') === msgId) {
          this.isSpeakingMap.delete('current');
        }
        onEnd();
      };
      
      utterance.onerror = (e) => {
        console.warn("TTS Error:", e);
        if (this.isSpeakingMap.get('current') === msgId) {
          this.isSpeakingMap.delete('current');
        }
        onEnd();
      };

      this.isSpeakingMap.set('current', msgId);
      window.speechSynthesis.speak(utterance);
    }, 50);
  }

  public cancel(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.isSpeakingMap.delete('current');
    }
  }

  public isSpeaking(msgId: string): boolean {
    return this.isSpeakingMap.get('current') === msgId;
  }
}

export const ttsService = new TTSService();
