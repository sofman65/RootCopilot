"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  IconBold,
  IconItalic,
  IconList,
  IconListNumbers,
  IconCode,
  IconBlockquote,
  IconH1,
  IconH2,
  IconSeparator,
  IconArrowBackUp,
  IconArrowForwardUp,
} from "@tabler/icons-react";

interface RichTextEditorProps {
  content?: string;
  onChange?: (json: string, html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Describe the issue...",
  className = "",
  editable = true,
}: RichTextEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content ? JSON.parse(content) : "",
    editable,
    immediatelyRender: false, // Fix SSR hydration mismatch
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(JSON.stringify(editor.getJSON()), editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[120px] p-3 focus:outline-none",
      },
    },
  });

  // Don't render until mounted on client
  if (!isMounted || !editor) {
    return (
      <div
        className={`border border-neutral-300 dark:border-neutral-600 rounded-lg overflow-hidden bg-white dark:bg-neutral-800 min-h-[120px] ${className}`}
      >
        <div className="p-3 text-neutral-400 text-sm">Loading editor...</div>
      </div>
    );
  }

  if (!editor) {
    return null;
  }

  return (
    <div
      className={`border border-neutral-300 dark:border-neutral-600 rounded-lg overflow-hidden bg-white dark:bg-neutral-800 ${className}`}
    >
      {/* Toolbar */}
      {editable && (
        <div className="flex flex-wrap gap-1 p-2 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <IconBold className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <IconItalic className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            title="Code"
          >
            <IconCode className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-600 mx-1" />

          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <IconH1 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <IconH2 className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-600 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <IconList className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Numbered List"
          >
            <IconListNumbers className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Quote"
          >
            <IconBlockquote className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          >
            <IconSeparator className="h-4 w-4" />
          </ToolbarButton>

          <div className="flex-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <IconArrowBackUp className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <IconArrowForwardUp className="h-4 w-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition ${
        active
          ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
          : "hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

