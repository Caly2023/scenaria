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
   * Determine the target language code based on project languages.
   * Focuses on French and English.
   */
  private determineLanguageInfo(projectLanguages: string[] = []): { prefix: string, preferred: string } {
    const primaryStr = (projectLanguages[0] || 'English').toLowerCase();
    
    if (primaryStr.includes('french') || primaryStr.includes('français')) {
      // Default to French
      return { prefix: 'fr', preferred: 'fr-FR' };
    }
    
    // Default to English
    return { prefix: 'en', preferred: 'en-US' };
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
      const utterance = new SpeechSynthesisUtterance(text);
      const langInfo = this.determineLanguageInfo(projectLanguages);
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
