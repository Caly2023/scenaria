import { Mic, MicOff } from 'lucide-react';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface DictationButtonProps {
  onResult: (text: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function DictationButton({ onResult, className, size = 'md' }: DictationButtonProps) {
  const { t } = useTranslation();
  const { isListening, toggleListening, isSupported } = useSpeechToText({
    onResult
  });

  if (!isSupported) return null;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={cn(
        "rounded-full flex items-center justify-center transition-all group relative",
        sizeClasses[size],
        isListening ? "bg-red-500 text-white animate-pulse" : "bg-transparent text-white/80 hover:text-white hover:bg-white/5",
        className
      )}
      title={t('common.dictation', { defaultValue: 'Dictation' })}
    >
      {isListening ? <MicOff className={iconClasses[size]} /> : <Mic className={iconClasses[size]} />}
      <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#212121] text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10 z-50">
        {t('common.dictation', { defaultValue: 'Dictation' })}
      </span>
    </button>
  );
}
