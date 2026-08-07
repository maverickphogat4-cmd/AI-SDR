"use client";

import { motion, type Variants } from "framer-motion";
import { MotionButton } from "@/components/motion-button";
import { EASE } from "@/lib/motion";
import type { Prospect } from "@/lib/types";

type FieldKey = keyof Omit<Prospect, "id">;

type ProspectCardProps = {
  prospect: Prospect;
  index: number;
  onChange: (id: string, field: FieldKey, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
};

// `custom={index}` feeds the numeric index into this variant function, so
// each card's entrance is offset by ~80ms from the one before it. Delay
// only applies to the enter animation (via the `visible` variant) -- the
// `exit` variant has its own transition, so removing a card doesn't inherit
// a stale stagger delay.
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: index * 0.08, ease: EASE },
  }),
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

/** One prospect's input card: identity fields + the three research inputs
 * the email-generation prompt (Stage 4) actually reads from. */
export function ProspectCard({ prospect, index, onChange, onRemove, canRemove }: ProspectCardProps) {
  const set = (field: FieldKey) => (value: string) => onChange(prospect.id, field, value);

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-white/20 focus-within:border-white/20"
    >
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-400">Prospect {index + 1}</h3>
        {canRemove && (
          <MotionButton
            type="button"
            onClick={() => onRemove(prospect.id)}
            className="text-xs text-zinc-500 transition-colors hover:text-red-400"
          >
            Remove
          </MotionButton>
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
    </motion.div>
  );
}

// Shared focus treatment: border eases to the accent color with a soft glow
// (a spread box-shadow, not a hard outline) -- applied via plain Tailwind
// transitions rather than framer, since a CSS-driven focus ring is both
// simpler and snappier than animating it through JS.
const FIELD_CLASSNAME =
  "rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none transition-all duration-200 focus:border-teal-400 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.15)]";

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
        className={FIELD_CLASSNAME}
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
        className={`resize-y ${FIELD_CLASSNAME}`}
      />
    </label>
  );
}
