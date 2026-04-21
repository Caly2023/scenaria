import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';

export interface RichTextEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ content, onChange, placeholder = 'Commencez à écrire...', className }: RichTextEditorProps) {
  const [mounted, setMounted] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      })
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert max-w-none focus:outline-none min-h-[120px] scenaria-markdown',
          className
        )
      }
    },
    onUpdate: ({ editor }) => {
      // Extract markdown from internal storage provided by tiptap-markdown
      const markdown = editor.storage.markdown.getMarkdown();
      onChange(markdown);
    }
  });

  // Ensure hydration matches client rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update editor content if it changes externally (e.g., AI generating more content)
  useEffect(() => {
    if (editor && content !== editor.storage.markdown.getMarkdown()) {
      // Keep cursor position when updating content externally
      const { from, to } = editor.state.selection;
      editor.commands.setContent(content, false, { preserveWhitespace: 'full' });
      // Minor guard: if the new content is much shorter, restore selection safely
      try {
        editor.commands.setTextSelection({ from, to });
      } catch (e) {
        // Ignorer si la sélection n'est plus valide
      }
    }
  }, [content, editor]);

  if (!mounted) {
    return null; // or a text placeholder if SSR is strict
  }

  return (
    <div className="w-full relative group/editor">
      <EditorContent editor={editor} />
    </div>
  );
}
