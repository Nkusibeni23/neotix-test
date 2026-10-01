"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { useConfirm } from "@/components/confirm-dialog";
import { columnHelper, DataTable } from "@/components/data-table";
import { ErrorAlert } from "@/components/error-alert";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMe } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { useCreateUser, useUpdateUser, useUsers } from "@/lib/queries";
import type { Role, User } from "@/lib/types";

const ROLES: { value: Role; label: string }[] = [
  { value: "client", label: "Client" },
  { value: "operator", label: "Operator" },
  { value: "admin", label: "Admin" },
];

function RoleSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: Role;
  onChange: (r: Role) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select items={ROLES} value={value} onValueChange={(v) => v && onChange(v as Role)} disabled={disabled}>
      <SelectTrigger size="sm" className={className ?? "w-32"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const ROLE_ACCESS: Record<Role, string> = {
  client: "Clients only see and act on their own requests.",
  operator: "Operators see every request, move them through the workflow, assign and import episodes.",
  admin: "Admins can do everything an operator can, plus manage users and roles.",
};

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  role: z.enum(["client", "operator", "admin"]),
  organisation: z.string().trim().optional(),
});
type Values = z.infer<typeof schema>;

function NewUserDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateUser();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", role: "client", organisation: "" },
  });
  const { errors } = form.formState;

  const submit = form.handleSubmit((v) =>
    create.mutate(
      { ...v, organisation: v.organisation || undefined },
      {
        onSuccess: (u) => {
          notify.success("User created", `${u.name} · ${u.role}`);
          setOpen(false);
          form.reset();
        },
        onError: (e) => notify.error(e, "Could not create user"),
      },
    ),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <UserPlusIcon />
            New user
          </Button>
        }
      />
      <DialogContent className="gap-6 p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">New user</DialogTitle>
          <DialogDescription>They can sign in straight away with this password.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {(
            [
              ["name", "Name", "text"],
              ["email", "Email", "email"],
              ["password", "Password", "password"],
              ["organisation", "Organisation (clients)", "text"],
            ] as const
          ).map(([name, label, type]) => (
            <div key={name} className="space-y-2">
              <Label htmlFor={name}>{label}</Label>
              <Input id={name} type={type} aria-invalid={!!errors[name]} {...form.register(name)} />
              {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message}</p>}
            </div>
          ))}
          <div className="space-y-2">
            <Label>Role</Label>
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <RoleSelect value={field.value} onChange={field.onChange} className="w-full" />
              )}
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2Icon className="animate-spin" />}
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const col = columnHelper<User>();

export default function UsersPage() {
  const { data: me } = useMe();
  const users = useUsers();
  const { mutateAsync } = useUpdateUser();
  const confirm = useConfirm();

  // Both changes affect what someone can access immediately, so each asks first.
  const update = useCallback(
    (u: User, body: { role?: Role; is_active?: boolean }, done: string) =>
      mutateAsync({ id: u.id, ...body }).then(
        () => notify.success(done),
        (e) => {
          notify.error(e, "Could not update user");
          throw e;
        },
      ),
    [mutateAsync],
  );

  const changeRole = useCallback(
    (u: User, role: Role) =>
      confirm({
        title: `Make ${u.name} ${role === "admin" ? "an" : "a"} ${role}?`,
        description: ROLE_ACCESS[role],
        confirmLabel: "Change role",
        onConfirm: () => update(u, { role }, `${u.name} is now ${role === "admin" ? "an" : "a"} ${role}`),
      }),
    [confirm, update],
  );

  const toggleActive = useCallback(
    (u: User) =>
      u.is_active
        ? confirm({
            title: `Deactivate ${u.name}?`,
            description: "They are signed out right away and can't sign in until reactivated. Their requests are kept.",
            confirmLabel: "Deactivate",
            tone: "destructive",
            onConfirm: () => update(u, { is_active: false }, `${u.name} deactivated`),
          })
        : confirm({
            title: `Reactivate ${u.name}?`,
            description: "They can sign in again with their existing password.",
            confirmLabel: "Reactivate",
            onConfirm: () => update(u, { is_active: true }, `${u.name} reactivated`),
          }),
    [confirm, update],
  );

  const columns = useMemo(
    () =>
      col.columns([
        col.accessor("name", {
          header: "Name",
          cell: ({ row }) => (
            <div className="flex flex-col">
              <span className="font-medium">
                {row.original.name}
                {row.original.id === me?.id && <span className="text-muted-foreground"> (you)</span>}
              </span>
              <span className="text-xs text-muted-foreground">{row.original.email}</span>
            </div>
          ),
        }),
        col.accessor("organisation", {
          header: "Organisation",
          cell: ({ getValue }) => getValue() ?? <span className="text-muted-foreground">—</span>,
        }),
        col.accessor("role", {
          header: "Role",
          cell: ({ row }) => (
            <RoleSelect
              value={row.original.role}
              disabled={row.original.id === me?.id}
              onChange={(role) => changeRole(row.original, role)}
            />
          ),
        }),
        col.accessor("is_active", {
          header: "Status",
          cell: ({ getValue }) =>
            getValue() ? (
              <Badge className="bg-status-accepted/15 text-status-accepted">Active</Badge>
            ) : (
              <Badge variant="secondary">Deactivated</Badge>
            ),
        }),
        col.display({
          id: "toggle",
          header: "",
          cell: ({ row }) =>
            row.original.id !== me?.id && (
              <Button
                variant={row.original.is_active ? "outline" : "secondary"}
                size="sm"
                onClick={() => toggleActive(row.original)}
              >
                {row.original.is_active ? "Deactivate" : "Reactivate"}
              </Button>
            ),
        }),
      ]),
    [me?.id, changeRole, toggleActive],
  );

  return (
    <>
      <PageHeader
        title="Users"
        description="Create accounts, change roles, and deactivate access. Changes apply immediately."
        actions={<NewUserDialog />}
      />
      <ErrorAlert error={users.error} title="Could not load users" />
      <DataTable
        columns={columns}
        data={users.data}
        isLoading={users.isLoading}
        getRowId={(u) => String(u.id)}
        renderCard={(u) => (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              {!u.is_active && <Badge variant="secondary">Deactivated</Badge>}
            </div>
            <div className="flex items-center justify-between gap-2">
              <RoleSelect
                value={u.role}
                disabled={u.id === me?.id}
                onChange={(role) => changeRole(u, role)}
              />
              {u.id !== me?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(u)}
                >
                  {u.is_active ? "Deactivate" : "Reactivate"}
                </Button>
              )}
            </div>
          </div>
        )}
      />
    </>
  );
}
