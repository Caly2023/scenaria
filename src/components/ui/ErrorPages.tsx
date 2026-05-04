import { FC, ReactNode } from 'react';
import { motion } from 'motion/react';
import { 
  WifiOff, 
  AlertCircle, 
  Search, 
  CloudOff, 
  RefreshCcw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ErrorPageProps {
  title: string;
  message: string;
  icon: ReactNode;
  onAction?: () => void;
  actionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  errorCode?: string;
  details?: string;
}

const ErrorLayout: FC<ErrorPageProps> = ({
  title,
  message,
  icon,
  onAction,
  actionLabel,
  onSecondaryAction,
  secondaryActionLabel,
  errorCode,
  details
}) => {
  return (
    <div className="min-h-dvh w-full bg-[#0f0f0f] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-white/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/[0.01] rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-xl w-full text-center space-y-12 relative z-10"
      >
        {/* Icon Container */}
        <div className="flex justify-center">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20,
              delay: 0.1 
            }}
            className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center relative group"
          >
            <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full group-hover:bg-white/10 transition-colors" />
            <div className="relative text-white">
              {icon}
            </div>
            {errorCode && (
              <div className="absolute -bottom-2 -right-2 bg-white text-black text-[10px] font-black px-2 py-0.5 rounded-md tracking-tighter uppercase">
                {errorCode}
              </div>
            )}
          </motion.div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter leading-tight italic">
            {title}
          </h1>
          <p className="text-secondary text-lg md:text-xl max-w-md mx-auto leading-relaxed">
            {message}
          </p>
        </div>

        {details && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left overflow-auto max-h-32 no-scrollbar"
          >
            <code className="text-xs text-secondary font-mono whitespace-pre-wrap">
              {details}
            </code>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {onAction && (
            <button
              onClick={onAction}
              className="yt-btn-primary w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 group"
            >
              <RefreshCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              {actionLabel || 'Try Again'}
            </button>
          )}
          {onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="yt-btn-secondary w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2"
            >
              {secondaryActionLabel || 'Back Home'}
            </button>
          )}
        </div>

        {/* Brand Footer */}
        <div className="pt-12">
          <p className="text-white/10 text-xs font-bold tracking-[0.2em] uppercase">
            S C E N A R I A Production Pipeline
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export const NotFoundPage: FC<{ onBackHome?: () => void }> = ({ onBackHome }) => {
  const { t } = useTranslation();
  return (
    <ErrorLayout
      title={t('errors.notFound.title', { defaultValue: 'Lost in imagination?' })}
      message={t('errors.notFound.message', { defaultValue: "We couldn't find the project or page you were looking for. It might have been deleted or moved." })}
      icon={<Search className="w-10 h-10" />}
      onSecondaryAction={onBackHome || (() => window.location.href = '/')}
      secondaryActionLabel={t('errors.notFound.action', { defaultValue: 'Back to Projects' })}
      errorCode="404"
    />
  );
};

export const OfflinePage: FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <ErrorLayout
      title={t('errors.offline.title', { defaultValue: 'You are offline' })}
      message={t('errors.offline.message', { defaultValue: "The connection to our servers has been interrupted. Please check your internet connection." })}
      icon={<WifiOff className="w-10 h-10 text-red-400" />}
      onAction={onRetry || (() => window.location.reload())}
      actionLabel={t('errors.offline.action', { defaultValue: 'Check Connection' })}
    />
  );
};

export const ConnectionErrorPage: FC<{ onRetry?: () => void, onBackHome?: () => void }> = ({ onRetry, onBackHome }) => {
  const { t } = useTranslation();
  return (
    <ErrorLayout
      title={t('errors.connection.title', { defaultValue: 'Connection lost' })}
      message={t('errors.connection.message', { defaultValue: "We're having trouble communicating with our database. This might be a temporary internal issue." })}
      icon={<CloudOff className="w-10 h-10" />}
      onAction={onRetry || (() => window.location.reload())}
      actionLabel={t('errors.connection.retry', { defaultValue: 'Retry Connection' })}
      onSecondaryAction={onBackHome}
      secondaryActionLabel={t('common.backHome', { defaultValue: 'Back Home' })}
    />
  );
};

export const BugPage: FC<{ error?: Error; onReload?: () => void }> = ({ error, onReload }) => {
  const { t } = useTranslation();
  return (
    <ErrorLayout
      title={t('errors.bug.title', { defaultValue: 'Script Crash!' })}
      message={t('errors.bug.message', { defaultValue: "Our engine encountered an unexpected error. Don't worry, your work is usually autosaved." })}
      icon={<AlertCircle className="w-10 h-10 text-orange-400" />}
      onAction={onReload || (() => window.location.reload())}
      actionLabel={t('errors.bug.action', { defaultValue: 'Reload Studio' })}
      details={error?.message || error?.stack}
      errorCode="BUG"
    />
  );
};
