"use client";

import type { Prospect } from "@/lib/types";

type FieldKey = keyof Omit<Prospect, "id">;

type ProspectCardProps = {
  prospect: Prospect;
  index: number;
  onChange: (id: string, field: FieldKey, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
};

/** One prospect's input card: identity fields + the three research inputs
 * the email-generation prompt (Stage 4) actually reads from. */
export function ProspectCard({ prospect, index, onChange, onRemove, canRemove }: ProspectCardProps) {
  const set = (field: FieldKey) => (value: string) => onChange(prospect.id, field, value);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 transition-colors focus-within:border-zinc-700">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Prospect {index + 1}</h3>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(prospect.id)}
            className="text-xs text-zinc-500 transition-colors hover:text-red-400"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" value={prospect.name} onChange={set("name")} placeholder="Jordan Lee" />
        <TextField label="Company" value={prospect.company} onChange={set("company")} placeholder="Acme Inc." />
      </div>

      <TextAreaField
        label="LinkedIn bio / summary"
        value={prospect.bio}
        onChange={set("bio")}
        placeholder="Paste their About section, or summarize it in a sentence or two..."
      />
      <TextAreaField
        label="Recent LinkedIn post"
        value={prospect.recentPost}
        onChange={set("recentPost")}
        placeholder="Paste the text of something they recently posted or shared..."
      />
      <TextAreaField
        label="Recent company news"
        value={prospect.companyNews}
        onChange={set("companyNews")}
        placeholder="Funding round, product launch, hiring push, etc."
        optional
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-teal-400/60"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  optional?: boolean;
}) {
  return (
    <label className="mt-4 flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-500">
        {label} {optional && <span className="text-zinc-600">(optional)</span>}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-teal-400/60"
      />
    </label>
  );
}
