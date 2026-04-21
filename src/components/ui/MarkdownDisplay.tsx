import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { memo } from 'react';

export interface MarkdownDisplayProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export const MarkdownDisplay = memo(function MarkdownDisplay({ content, className, isStreaming }: MarkdownDisplayProps) {
  return (
    <div className={cn('prose prose-invert max-w-none scenaria-markdown', className, "[&_p:last-child]:inline")}>
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-[6px] h-[15px] bg-white ml-0.5 translate-y-[2px] rounded-sm shadow-[0_0_8px_rgba(255,255,255,0.5)] animate-pulse" />
      )}
    </div>
  );
});
