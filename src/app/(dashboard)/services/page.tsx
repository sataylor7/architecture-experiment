'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiJson, apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Service {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: string | null;
  category: string | null;
  active: boolean;
  createdAt: string;
}

interface ListResponse {
  data: Service[];
  meta: { nextCursor: string | null; hasMore: boolean };
}

const CATEGORIES = ['Website', 'Design', 'Sewing', 'Other'];

const categoryColors: Record<string, string> = {
  Website: 'bg-blue-100 text-blue-700',
  Design: 'bg-purple-100 text-purple-700',
  Sewing: 'bg-pink-100 text-pink-700',
  Other: 'bg-gray-100 text-gray-600',
};

const emptyForm = { name: '', description: '', defaultPrice: '', category: '', active: true };

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (next?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (next) params.set('cursor', next);
      const res = await apiJson<ListResponse>(`/api/services?${params}`);
      setServices((prev) => (next ? [...prev, ...res.data] : res.data));
      setCursor(res.meta.nextCursor);
      setHasMore(res.meta.hasMore);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
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

  function openEdit(s: Service) {
    setEditId(s.id);
    setForm({
      name: s.name,
      description: s.description ?? '',
      defaultPrice: s.defaultPrice ? String(Number(s.defaultPrice)) : '',
      category: s.category ?? '',
      active: s.active,
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
        description: form.description || undefined,
        defaultPrice: form.defaultPrice ? parseFloat(form.defaultPrice) : undefined,
        category: form.category || undefined,
        active: form.active,
      };

      let res: Response;
      if (editId) {
        res = await apiFetch(`/api/services/${editId}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        res = await apiFetch('/api/services', { method: 'POST', body: JSON.stringify(body) });
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

  async function toggleActive(s: Service) {
    try {
      await apiFetch(`/api/services/${s.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !s.active }),
      });
      setServices((prev) => prev.map((x) => x.id === s.id ? { ...x, active: !s.active } : x));
    } catch {
      await load();
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Service Catalog</h1>
        <Button onClick={openNew}>+ New Service</Button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            {editId ? 'Edit Service' : 'New Service'}
          </h2>
          {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">None</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Price</label>
              <input type="number" min="0" step="0.01" value={form.defaultPrice}
                onChange={(e) => setForm((f) => ({ ...f, defaultPrice: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="active" checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">Active</label>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Service'}</Button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Name', 'Category', 'Default Price', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((s) => (
              <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${!s.active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 text-sm">
                  <p className="font-medium text-gray-900">{s.name}</p>
                  {s.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{s.description}</p>}
                </td>
                <td className="px-4 py-3 text-sm">
                  {s.category ? (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[s.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {s.category}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {s.defaultPrice ? `$${Number(s.defaultPrice).toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(s)}>
                      {s.active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && services.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  No services yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <p className="mt-4 text-sm text-gray-400">Loading…</p>}
      {hasMore && !loading && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => load(cursor ?? undefined)}>
          Load more
        </Button>
      )}
    </div>
  );
}
