"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import Youtube from "@tiptap/extension-youtube";

export default function RichEditor({ value, onChange, label, disabled = false }: { value: string; onChange: (html: string) => void; label: string; disabled?: boolean }) {
  const [source, setSource] = useState(false);
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: false }), Link.configure({ openOnClick: false }), Image, TableKit, Youtube.configure({ nocookie: true })],
    content: value || "<p></p>", editable: !disabled, immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  useEffect(() => { if (editor && !source && editor.getHTML() !== (value || "<p></p>")) editor.commands.setContent(value || "<p></p>", { emitUpdate: false }); }, [editor, source, value]);
  useEffect(() => { editor?.setEditable(!disabled); }, [disabled, editor]);
  function link() { const url = prompt("输入完整链接（https://）"); if (url?.startsWith("https://")) editor?.chain().focus().setLink({ href: url }).run(); }
  function image() { const url = prompt("输入已上传图片的 /api/media/ 地址或 HTTPS 图片地址"); if (url && (url.startsWith("/api/media/") || url.startsWith("https://"))) editor?.chain().focus().setImage({ src: url }).run(); }
  function video() { const url = prompt("输入 YouTube 视频链接"); if (url && /^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//.test(url)) editor?.commands.setYoutubeVideo({ src: url }); }
  if (!editor) return <div className="admin-rich">正在加载编辑器…</div>;
  return <div className="admin-rich"><div className="admin-rich-tools" role="toolbar" aria-label={`${label}编辑工具`}>
    <button type="button" disabled={disabled || source} onClick={() => editor.chain().focus().setParagraph().run()}>正文</button>
    <button type="button" disabled={disabled || source} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>标题 2</button>
    <button type="button" disabled={disabled || source} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>标题 3</button>
    <button type="button" disabled={disabled || source} onClick={() => editor.chain().focus().toggleBold().run()}>粗体</button>
    <button type="button" disabled={disabled || source} onClick={() => editor.chain().focus().toggleItalic().run()}>斜体</button>
    <button type="button" disabled={disabled || source} onClick={() => editor.chain().focus().toggleBulletList().run()}>无序列表</button>
    <button type="button" disabled={disabled || source} onClick={() => editor.chain().focus().toggleOrderedList().run()}>有序列表</button>
    <button type="button" disabled={disabled || source} onClick={() => editor.chain().focus().toggleBlockquote().run()}>引用</button>
    <button type="button" disabled={disabled || source} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>代码</button>
    <button type="button" disabled={disabled || source} onClick={link}>链接</button>
    <button type="button" disabled={disabled || source} onClick={image}>图片</button>
    <button type="button" disabled={disabled || source} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>表格</button>
    <button type="button" disabled={disabled || source} onClick={video}>视频</button>
    <button type="button" disabled={disabled || source} onClick={() => editor.chain().focus().setHorizontalRule().run()}>分隔线</button>
    <button type="button" disabled={disabled || source || !editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>撤销</button>
    <button type="button" disabled={disabled || source || !editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>重做</button>
    <button type="button" disabled={disabled} onClick={() => { if (source) editor.commands.setContent(value || "<p></p>", { emitUpdate: false }); setSource(!source); }}>{source ? "可视化" : "HTML 源码"}</button>
  </div>{source ? <textarea aria-label={`${label} HTML 源码`} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} rows={12} /> : <EditorContent editor={editor} aria-label={label} />}</div>;
}
