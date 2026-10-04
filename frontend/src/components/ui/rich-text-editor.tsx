'use client';

import React, { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

export interface RichTextEditorProps {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  icon: string;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  icon,
}: ToolbarButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'size-8 inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors cursor-pointer select-none',
        'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed',
        isActive
          ? 'bg-muted text-foreground font-semibold shadow-2xs border border-border/60'
          : 'text-muted-foreground'
      )}
    >
      <Icon icon={icon} className="size-4" />
    </button>
  );
}

export function RichTextEditor({
  id,
  value = '',
  onChange,
  placeholder = 'Nhập nội dung mô tả chi tiết...',
  disabled = false,
  className,
  minHeight = '280px',
  'aria-invalid': ariaInvalid,
}: RichTextEditorProps): React.JSX.Element {
  const isInvalid = ariaInvalid === true || ariaInvalid === 'true';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2 hover:opacity-80',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    ],
    content: value || '',
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: cn(
          'prose dark:prose-invert max-w-none text-sm text-foreground/90 p-4 focus:outline-none leading-relaxed',
          'prose-headings:font-semibold prose-h2:text-lg prose-h3:text-base prose-p:my-2 prose-ul:my-2 prose-ol:my-2'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChange?.(html);
    },
  });

  // Synchronize value from outside (e.g. form reset or initial load)
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.isEmpty ? '' : editor.getHTML();
    if (value !== currentHtml) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  // Synchronize disabled state
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const handleSetLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Nhập địa chỉ liên kết (URL):', previousUrl || 'https://');

    if (url === null) {
      return;
    }

    if (url.trim() === '' || url.trim() === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          'w-full rounded-lg border border-input bg-card/40 flex items-center justify-center text-xs text-muted-foreground animate-pulse',
          className
        )}
        style={{ minHeight }}
      >
        Đang khởi tạo trình soạn thảo...
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full rounded-lg border bg-transparent transition-colors shadow-2xs overflow-hidden',
        'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        isInvalid ? 'border-destructive focus-within:border-destructive focus-within:ring-destructive/20' : 'border-input',
        disabled && 'opacity-60 bg-muted/20 cursor-not-allowed',
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-muted/40 px-2 py-1.5 select-none">
        {/* Text Formats */}
        <ToolbarButton
          title="In đậm (Ctrl+B)"
          icon="lucide:bold"
          isActive={editor.isActive('bold')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          title="In nghiêng (Ctrl+I)"
          icon="lucide:italic"
          isActive={editor.isActive('italic')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />

        <div className="h-4 w-px bg-border/80 mx-1" />

        {/* Headings */}
        <ToolbarButton
          title="Tiêu đề 2 (H2)"
          icon="lucide:heading-2"
          isActive={editor.isActive('heading', { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          title="Tiêu đề 3 (H3)"
          icon="lucide:heading-3"
          isActive={editor.isActive('heading', { level: 3 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />

        <div className="h-4 w-px bg-border/80 mx-1" />

        {/* Lists */}
        <ToolbarButton
          title="Danh sách dấu chấm (Bullet List)"
          icon="lucide:list"
          isActive={editor.isActive('bulletList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          title="Danh sách đánh số (Numbered List)"
          icon="lucide:list-ordered"
          isActive={editor.isActive('orderedList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />

        <div className="h-4 w-px bg-border/80 mx-1" />

        {/* Link & Code */}
        <ToolbarButton
          title={editor.isActive('link') ? 'Chỉnh sửa / Xóa liên kết' : 'Chèn liên kết'}
          icon="lucide:link"
          isActive={editor.isActive('link')}
          disabled={disabled}
          onClick={handleSetLink}
        />
        <ToolbarButton
          title="Đoạn mã nội dòng (Inline Code)"
          icon="lucide:code"
          isActive={editor.isActive('code')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <ToolbarButton
          title="Khối mã nguồn (Code Block)"
          icon="lucide:square-code"
          isActive={editor.isActive('codeBlock')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />

        <div className="h-4 w-px bg-border/80 mx-1" />

        {/* Undo / Redo */}
        <ToolbarButton
          title="Hoàn tác (Ctrl+Z)"
          icon="lucide:undo-2"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          title="Làm lại (Ctrl+Y)"
          icon="lucide:redo-2"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>

      {/* Editor Content Area */}
      <div
        className="cursor-text bg-card/30 dark:bg-card/20 overflow-y-auto"
        style={{ minHeight, maxHeight: '550px' }}
        onClick={() => {
          if (!editor.isFocused && !disabled) {
            editor.commands.focus();
          }
        }}
      >
        <EditorContent editor={editor} placeholder={placeholder} />
      </div>
    </div>
  );
}
