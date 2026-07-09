import { useRef } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: boolean;
}

// Fixed set of single-digit boxes — matches the exact code length expected
// (no ambiguity about how many digits are left to type, unlike a single
// free-text input with a placeholder).
export function OtpInput({ length = 6, value, onChange, autoFocus, disabled, error }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function focusBox(i: number) {
    inputsRef.current[Math.max(0, Math.min(length - 1, i))]?.focus();
  }

  function handleChange(i: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      const chars = value.split("");
      chars[i] = "";
      onChange(chars.join(""));
      return;
    }
    // Handles a paste or fast typing that lands more than one digit in a box
    const chars = value.split("");
    for (let k = 0; k < clean.length && i + k < length; k++) chars[i + k] = clean[k];
    onChange(chars.join("").slice(0, length));
    focusBox(i + clean.length);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      focusBox(i - 1);
    } else if (e.key === "ArrowLeft") {
      focusBox(i - 1);
    } else if (e.key === "ArrowRight") {
      focusBox(i + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const clean = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!clean) return;
    onChange(clean);
    focusBox(clean.length);
  }

  return (
    <div className="flex gap-2 justify-between">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={d}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className={`w-full h-12 rounded-lg text-center text-lg font-mono transition-all duration-200
                      bg-slate-50 border text-slate-900 placeholder:text-slate-400
                      focus:ring-1 focus:ring-primary/40 focus:outline-none
                      dark:bg-slate-700/60 dark:text-white
                      ${error
                        ? "border-red-400 focus:border-red-400 dark:border-red-700"
                        : "border-slate-300 focus:border-primary dark:border-slate-600/60"}`}
        />
      ))}
    </div>
  );
}
