import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

export type EditorLanguage = "javascript" | "python";

export function CodeEditor({
  value,
  language,
  onChange,
}: {
  value: string;
  language: EditorLanguage;
  onChange: (next: string) => void;
}) {
  return (
    <CodeMirror
      value={value}
      height="420px"
      theme={oneDark}
      extensions={[language === "python" ? python() : javascript()]}
      onChange={onChange}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
      className="overflow-hidden rounded-lg border border-border font-mono text-sm"
    />
  );
}