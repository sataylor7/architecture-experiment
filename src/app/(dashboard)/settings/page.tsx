'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiJson, apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProjectType {
  id: string;
  name: string;
  category: string;
  sewingSubcategory: string | null;
  description: string | null;
  createdAt: string;
}

const CATEGORIES = ['Website', 'Design', 'Sewing'] as const;
const SEWING_SUBCATEGORIES = ['Tailoring', 'Bespoke', 'Custom'] as const;

const categoryVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  Website: 'default',
  Design: 'secondary',
  Sewing: 'outline',
};

const emptyForm = {
  name: '',
  category: '' as string,
  sewingSubcategory: '' as string,
  description: '',
};

export default function SettingsPage() {
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiJson<{ data: ProjectType[] }>('/api/project-types');
      setProjectTypes(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load project types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(pt: ProjectType) {
    setEditId(pt.id);
    setForm({
      name: pt.name,
      category: pt.category,
      sewingSubcategory: pt.sewingSubcategory ?? '',
      description: pt.description ?? '',
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        category: form.category,
      };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.category === 'Sewing' && form.sewingSubcategory) {
        body.sewingSubcategory = form.sewingSubcategory;
      } else if (form.category !== 'Sewing') {
        body.sewingSubcategory = null;
      }

      let res: Response;
      if (editId) {
        res = await apiFetch(`/api/project-types/${editId}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        res = await apiFetch('/api/project-types', { method: 'POST', body: JSON.stringify(body) });
      }
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? 'Failed'); return; }

      setShowForm(false);
      setEditId(null);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project type?')) return;
    setDeleteError(null);
    try {
      const res = await apiFetch(`/api/project-types/${id}`, { method: 'DELETE' });
      if (res.status === 204) { await load(); return; }
      const body = await res.json();
      setDeleteError(body.error ?? 'Failed to delete');
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Settings</h1>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Project Types</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Types assigned to projects when they are created.
            </p>
          </div>
          <Button onClick={openNew}>+ New Type</Button>
        </div>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}
        {deleteError && <p className="text-sm text-destructive mb-4">{deleteError}</p>}

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 mb-6 space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {editId ? 'Edit Project Type' : 'New Project Type'}
            </h3>
            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pt-name">Name *</Label>
                <Input
                  id="pt-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pt-category">Category *</Label>
                <Select
                  value={form.category || '_none'}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      category: v === '_none' ? '' : (v ?? ''),
                      sewingSubcategory: v !== 'Sewing' ? '' : f.sewingSubcategory,
                    }))
                  }
                >
                  <SelectTrigger id="pt-category" className="w-full">
                    <SelectValue placeholder="Select category…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" disabled>Select category…</SelectItem>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {form.category === 'Sewing' && (
                <div className="space-y-1.5">
                  <Label htmlFor="pt-sewing-sub">Sewing Subcategory *</Label>
                  <Select
                    value={form.sewingSubcategory || '_none'}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, sewingSubcategory: v === '_none' ? '' : (v ?? '') }))
                    }
                  >
                    <SelectTrigger id="pt-sewing-sub" className="w-full">
                      <SelectValue placeholder="Select subcategory…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none" disabled>Select subcategory…</SelectItem>
                      {SEWING_SUBCATEGORIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className={`space-y-1.5 ${form.category === 'Sewing' ? '' : 'col-span-2'}`}>
                <Label htmlFor="pt-description">Description</Label>
                <Textarea
                  id="pt-description"
                  value={form.description}
                  rows={2}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Type'}
              </Button>
            </div>
          </form>
        )}

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Subcategory</TableHead>
                <TableHead>Description</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectTypes.map((pt) => (
                <TableRow key={pt.id}>
                  <TableCell className="font-medium">{pt.name}</TableCell>
                  <TableCell>
                    <Badge variant={categoryVariant[pt.category] ?? 'secondary'}>{pt.category}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{pt.sewingSubcategory ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {pt.description ?? '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(pt)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(pt.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && projectTypes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No project types yet. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {loading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      </section>
    </div>
  );
}
