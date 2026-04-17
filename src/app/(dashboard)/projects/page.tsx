'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiJson, apiFetch } from '@/lib/api';
import { decodeTokenPayload } from '@/lib/token-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Project {
  id: string;
  name: string;
  status: string;
  dueDate: string | null;
  completed: boolean;
  clientId: string;
  createdAt: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

interface ProjectType {
  id: string;
  name: string;
  category: string;
}

interface ListResponse {
  data: Project[];
  meta: { nextCursor: string | null; hasMore: boolean };
}

const STATUSES = ['Draft', 'InProgress', 'OnHold', 'Completed', 'Cancelled'];

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'secondary',
  InProgress: 'default',
  Completed: 'outline',
  OnHold: 'secondary',
  Cancelled: 'destructive',
};

const emptyForm = {
  name: '',
  description: '',
  status: 'Draft',
  clientId: '',
  dueDate: '',
  price: '',
  notes: '',
};

function ProjectsInner() {
  const searchParams = useSearchParams();
  const clientIdFilter = searchParams.get('clientId') ?? '';
  const [statusFilter, setStatusFilter] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (next?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '25' });
      if (next) params.set('cursor', next);
      if (statusFilter) params.set('status', statusFilter);
      if (clientIdFilter) params.set('clientId', clientIdFilter);
      const res = await apiJson<ListResponse>(`/api/projects?${params}`);
      setProjects((prev) => (next ? [...prev, ...res.data] : res.data));
      setCursor(res.meta.nextCursor);
      setHasMore(res.meta.hasMore);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientIdFilter]);

  useEffect(() => { load(); }, [load]);

  async function openNew() {
    setForm(emptyForm);
    setSelectedTypeIds([]);
    setFormError(null);
    try {
      const [cRes, ptRes] = await Promise.all([
        apiJson<{ data: Client[]; meta: unknown }>('/api/clients?limit=100'),
        apiJson<{ data: ProjectType[] }>('/api/project-types'),
      ]);
      setClients(cRes.data);
      setProjectTypes(ptRes.data);
    } catch { /* show form even if prefetch fails */ }
    setOpen(true);
  }

  function toggleType(id: string) {
    setSelectedTypeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (selectedTypeIds.length === 0) {
      setFormError('Select at least one project type.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = decodeTokenPayload();
      if (!payload) { setFormError('Session expired — please sign in again.'); return; }

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        status: form.status,
        clientId: form.clientId,
        userId: payload.userId,
        projectTypeIds: selectedTypeIds,
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();
      if (form.dueDate) body.dueDate = new Date(form.dueDate).toISOString();
      if (form.price) body.price = parseFloat(form.price);

      const res = await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? 'Failed to create project'); return; }

      setOpen(false);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
        <Button onClick={openNew}>New Project</Button>
      </div>

      <div className="flex gap-2 mb-4">
        <Select value={statusFilter || '_all'} onValueChange={(v) => setStatusFilter(!v || v === '_all' ? '' : v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  <Link href={`/projects/${p.id}`} className="text-primary hover:underline">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[p.status] ?? 'secondary'}>{p.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">{p.completed ? '✓' : '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {!loading && projects.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No projects found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {loading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {hasMore && !loading && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => load(cursor ?? undefined)}>
          Load more
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="space-y-1.5">
              <Label htmlFor="name">Project Name *</Label>
              <Input id="name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="clientId">Client *</Label>
                <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v ?? '' }))}>
                  <SelectTrigger id="clientId" className="w-full">
                    <SelectValue placeholder="Select client…" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v ?? 'Draft' }))}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Project Type(s) * <span className="text-muted-foreground font-normal">(select at least one)</span></Label>
              {projectTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No project types found. Add one in Settings first.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {projectTypes.map((pt) => (
                    <button key={pt.id} type="button" onClick={() => toggleType(pt.id)}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                        selectedTypeIds.includes(pt.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}>
                      {pt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} rows={2}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" min="0" step="0.01" value={form.price}
                  placeholder="0.00"
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} rows={2}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <ProjectsInner />
    </Suspense>
  );
}
