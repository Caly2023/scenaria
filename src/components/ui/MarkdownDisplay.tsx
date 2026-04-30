import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { memo } from 'react';

interface MarkdownDisplayProps {
  content: string;
  className?: string;
}

export const MarkdownDisplay = memo(function MarkdownDisplay({ content, className }: MarkdownDisplayProps) {
  return (
    <div className={cn('prose prose-invert max-w-none scenaria-markdown', className, "[&_p:last-child]:inline")}>
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
    </div>
  );
});
