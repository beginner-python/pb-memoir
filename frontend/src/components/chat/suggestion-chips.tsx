import { Button } from "@/components/ui/button";

export function SuggestionChips({
  questions,
  onPick,
  disabled,
}: {
  questions: string[];
  onPick: (q: string) => void;
  disabled?: boolean;
}) {
  if (questions.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {questions.map((q) => (
        <Button
          key={q}
          type="button"
          variant="outline"
          className="h-auto rounded-full bg-card px-4 py-2 text-sm font-normal whitespace-normal"
          onClick={() => onPick(q)}
          disabled={disabled}
        >
          {q}
        </Button>
      ))}
    </div>
  );
}
