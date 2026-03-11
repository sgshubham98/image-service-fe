import { useState, useRef, useEffect } from "react";
import { samplePrompts } from "../data/samplePrompts";
import { cn } from "../utils/cn";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  theme: "dark" | "light";
}

export function PromptInput({ value, onChange, onGenerate, isGenerating, theme }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Auto-resize textarea with max-height cap
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const handleSelectPrompt = (prompt: string) => {
    onChange(prompt);
    setShowDropdown(false);
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative rounded-2xl border backdrop-blur transition-all duration-300 flex flex-col",
          theme === "light"
            ? "border-[#cfc7ff] bg-white/95 focus-within:border-[#2D3142] shadow-sm"
            : "border-zinc-700/60 bg-zinc-800/60 focus-within:border-violet-500/70 shadow-lg shadow-black/20"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              onGenerate();
            }
          }}
          placeholder="Describe the image you want to generate…"
          rows={3}
          className={cn(
            "w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm outline-none leading-relaxed max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-transparent",
            theme === "light" ? "text-zinc-900 placeholder-zinc-500" : "text-zinc-100 placeholder-zinc-600"
          )}
        />
        <div className="flex items-center justify-between px-3 pb-3 pt-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            {value && (
              <button
                onClick={() => onChange("")}
                className={cn(
                  "text-xs transition-colors cursor-pointer",
                  theme === "light" ? "text-zinc-500 hover:text-zinc-800" : "text-zinc-600 hover:text-zinc-400"
                )}
              >
                Clear
              </button>
            )}
          </div>
          <button
            onClick={onGenerate}
            disabled={!value.trim() || isGenerating}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 cursor-pointer",
              value.trim() && !isGenerating
                ? theme === "light"
                  ? "bg-[#2D3142] hover:bg-[#252a38] text-white"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/40"
                : theme === "light"
                  ? "bg-zinc-200 text-zinc-500 cursor-not-allowed"
                  : "bg-zinc-700/50 text-zinc-500 cursor-not-allowed"
            )}
          >
            {isGenerating ? (
              <>
                <span className="h-3 w-3 rounded-full border-2 border-zinc-500 border-t-zinc-300 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sample prompts dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={cn(
            "w-full px-4 py-2.5 rounded-lg border text-sm transition-all cursor-pointer flex items-center justify-between group",
            theme === "light"
              ? "bg-white border-[#cfc7ff] text-zinc-700 hover:bg-[#f3f1ff] hover:border-[#2D3142]"
              : "bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-violet-600/20 hover:border-violet-500/50 hover:text-violet-200"
          )}
        >
          <span>Sample Prompts</span>
          <svg className={cn("h-4 w-4 transition-transform duration-200", showDropdown && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7-7m0 0L5 14m7-7v12" />
          </svg>
        </button>
        
        {showDropdown && (
          <div
            className={cn(
              "absolute top-full left-0 right-0 mt-2 rounded-lg border backdrop-blur shadow-lg z-10 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent",
              theme === "light" ? "bg-white border-[#cfc7ff]" : "bg-zinc-800/95 border-zinc-700/60"
            )}
          >
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSelectPrompt(prompt)}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors border-b last:border-b-0 cursor-pointer",
                  theme === "light"
                    ? "text-zinc-700 hover:bg-[#f3f1ff] border-[#ece8ff]"
                    : "text-zinc-300 hover:bg-violet-600/30 hover:text-violet-100 border-zinc-700/30"
                )}
                title={prompt}
              >
                {prompt.length > 60 ? prompt.substring(0, 60) + "..." : prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
