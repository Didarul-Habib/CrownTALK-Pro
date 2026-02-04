export default function UrlInput({
  value,
  onChange,
  helper,
}: {
  value: string;
  onChange: (v: string) => void;
  helper?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-neutral-200">Paste X post URLs (one per line)</label>
      <textarea
        className="w-full min-h-[160px] rounded-xl bg-neutral-900 border border-neutral-800 p-3 text-sm outline-none focus:ring-2 focus:ring-neutral-600"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://x.com/.../status/123\nhttps://x.com/.../status/456"
      />
      {helper ? <p className="text-xs text-neutral-400">{helper}</p> : null}
    </div>
  );
}
