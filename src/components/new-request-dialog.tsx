"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { DatePicker, toISODate } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/lib/notify";
import { useCreateRequest, useTasks } from "@/lib/queries";

// Local date, so "today" matches the calendar the user sees.
const today = () => toISODate(new Date());

const schema = z.object({
  task_name: z.string().trim().min(1, "What should the robot be doing?").max(255),
  episodes_requested: z.coerce
    .number<string>()
    .int("Whole episodes only")
    .min(1, "At least 1 episode")
    .max(100_000),
  deadline: z.string().min(1, "Pick a deadline").refine((d) => d >= today(), "Deadline is in the past"),
  notes: z.string().max(5000).optional(),
});
type Values = z.input<typeof schema>;
type Parsed = z.output<typeof schema>;

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/** Tasks we already record, as one-click chips, so the request matches real episode data. */
function TaskSuggestions({
  tasks,
  value,
  onPick,
}: {
  tasks: string[];
  value: string;
  onPick: (task: string) => void;
}) {
  const current = value.trim().toLowerCase().replace(/\s+/g, " ");
  return (
    <div className="flex flex-wrap gap-1.5 pt-0.5">
      {tasks.map((t) => {
        const on = t === current;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(t)}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium capitalize transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              on
                ? "border-primary/40 bg-primary/10 text-primary"
                : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {on && <CheckIcon className="size-3" />}
            {t}
          </button>
        );
      })}
    </div>
  );
}

export function NewRequestDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const create = useCreateRequest();
  const tasks = useTasks();
  const form = useForm<Values, unknown, Parsed>({
    resolver: zodResolver(schema),
    defaultValues: { task_name: "", episodes_requested: "", deadline: "", notes: "" },
  });
  const { errors } = form.formState;
  const taskValue = useWatch({ control: form.control, name: "task_name" });

  const submit = form.handleSubmit((values) =>
    create.mutate(
      { ...values, notes: values.notes || undefined },
      {
        onSuccess: (req) => {
          notify.success("Request submitted", `${req.episodes_requested} × ${req.task_name}`);
          setOpen(false);
          form.reset();
          router.push(`/requests/${req.id}`);
        },
        onError: (e) => notify.error(e, "Could not submit request"),
      },
    ),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <PlusIcon />
            New request
          </Button>
        }
      />
      <DialogContent className="gap-6 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">New dataset request</DialogTitle>
          <DialogDescription>Tell us what data you need and by when.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field
            id="task_name"
            label="Task"
            error={errors.task_name?.message}
            hint="Pick a task we already record, or type a new one."
          >
            <Input
              id="task_name"
              placeholder="e.g. pick cup"
              aria-invalid={!!errors.task_name}
              {...form.register("task_name")}
            />
            {tasks.data && tasks.data.length > 0 && (
              <TaskSuggestions
                tasks={tasks.data}
                value={taskValue}
                onPick={(t) => form.setValue("task_name", t, { shouldValidate: true })}
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="episodes_requested" label="Episodes" error={errors.episodes_requested?.message}>
              <Input
                id="episodes_requested"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="e.g. 200"
                aria-invalid={!!errors.episodes_requested}
                {...form.register("episodes_requested")}
              />
            </Field>
            <Field id="deadline" label="Deadline" error={errors.deadline?.message}>
              <Controller
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <DatePicker
                    id="deadline"
                    value={field.value || undefined}
                    onChange={(v) => field.onChange(v ?? "")}
                    min={today()}
                    placeholder="Select a deadline"
                    invalid={!!errors.deadline}
                  />
                )}
              />
            </Field>
          </div>
          <Field id="notes" label="Notes (optional)" error={errors.notes?.message}>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Lighting, objects, robot type…"
              {...form.register("notes")}
            />
          </Field>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2Icon className="animate-spin" />}
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
