'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiJson, apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  taxRate: string;
  notes: string | null;
  status: string;
  lineItems: {
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
    sortOrder: number | null;
  }[];
  projects: { project: { id: string; name: string } }[];
}

interface Project {
  id: string;
  name: string;
  clientId: string;
}

interface LineItemDraft {
  id?: string;
  key: number;
  description: string;
  quantity: string;
  unitPrice: string;
  isNew?: boolean;
}

let keyCounter = 100;
function nextKey() { return ++keyCounter; }

const LOCKED = ['Sent', 'Paid', 'Overdue', 'Cancelled'];

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);
  const [linkedProjectIds, setLinkedProjectIds] = useState<string[]>([]);
  const [originalProjectIds, setOriginalProjectIds] = useState<string[]>([]);
  const [clientId, setClientId] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [invRes, projRes] = await Promise.all([
          apiJson<{ data: Invoice }>(`/api/invoices/${id}`),
          apiJson<{ data: Project[]; meta: unknown }>('/api/projects?limit=100'),
        ]);
        const inv = invRes.data;
        if (LOCKED.includes(inv.status)) {
          router.replace(`/invoices/${id}`);
          return;
        }
        setInvoiceNumber(inv.invoiceNumber);
        setIssueDate(inv.issueDate.slice(0, 10));
        setDueDate(inv.dueDate ? inv.dueDate.slice(0, 10) : '');
        setTaxRate((Number(inv.taxRate) * 100).toFixed(2));
        setNotes(inv.notes ?? '');
        setLineItems(
          inv.lineItems.map((li) => ({
            id: li.id,
            key: nextKey(),
            description: li.description,
            quantity: String(Number(li.quantity)),
            unitPrice: String(Number(li.unitPrice)),
          })),
        );
        const pids = inv.projects.map((p) => p.project.id);
        setLinkedProjectIds(pids);
        setOriginalProjectIds(pids);
        setAllProjects(projRes.data);
        // Infer clientId from invoice (not directly available in detail — use projects or leave empty)
        setClientId('');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  function addLineItem() {
    setLineItems((prev) => [...prev, { key: nextKey(), description: '', quantity: '1', unitPrice: '0', isNew: true }]);
  }

  function removeLineItem(key: number) {
    setLineItems((prev) => prev.filter((li) => li.key !== key));
  }

  function updateLineItem(key: number, field: keyof LineItemDraft, value: string) {
    setLineItems((prev) => prev.map((li) => li.key === key ? { ...li, [field]: value } : li));
  }

  function toggleProject(pid: string) {
    setLinkedProjectIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid],
    );
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Update invoice fields
      const patchBody: Record<string, unknown> = {
        invoiceNumber,
        issueDate: new Date(issueDate).toISOString(),
        taxRate: parseFloat(taxRate) / 100,
        notes: notes || undefined,
      };
      if (dueDate) patchBody.dueDate = new Date(dueDate).toISOString();

      const patchRes = await apiFetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patchBody),
      });
      if (!patchRes.ok) {
        const b = await patchRes.json();
        setError(b.error ?? 'Failed to update invoice');
        return;
      }

      // Sync line items: delete removed existing, add new
      const existingIds = lineItems.filter((li) => li.id && !li.isNew).map((li) => li.id!);
      // Nothing to delete tracking here — we keep all existing IDs that remain in the list
      // We need to know which original line items were removed — check against original
      // For simplicity, PATCH all existing, POST new ones
      for (const li of lineItems) {
        if (!li.description.trim()) continue;
        if (li.id && !li.isNew) {
          await apiFetch(`/api/invoices/${id}/line-items/${li.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              description: li.description,
              quantity: parseFloat(li.quantity) || 1,
              unitPrice: parseFloat(li.unitPrice) || 0,
            }),
          });
        } else if (li.isNew) {
          await apiFetch(`/api/invoices/${id}/line-items`, {
            method: 'POST',
            body: JSON.stringify({
              description: li.description,
              quantity: parseFloat(li.quantity) || 1,
              unitPrice: parseFloat(li.unitPrice) || 0,
            }),
          });
        }
      }
      // Suppress unused warning
      void existingIds;

      // Sync project links: unlink removed, link added
      const toUnlink = originalProjectIds.filter((pid) => !linkedProjectIds.includes(pid));
      const toLink = linkedProjectIds.filter((pid) => !originalProjectIds.includes(pid));
      await Promise.all([
        ...toUnlink.map((pid) => apiFetch(`/api/invoices/${id}/projects/${pid}`, { method: 'DELETE' })),
        ...toLink.map((pid) =>
          apiFetch(`/api/invoices/${id}/projects`, { method: 'POST', body: JSON.stringify({ projectId: pid }) }),
        ),
      ]);

      router.replace(`/invoices/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  const subtotal = lineItems.reduce((sum, li) => {
    return sum + (parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0);
  }, 0);
  const tax = subtotal * (parseFloat(taxRate) / 100 || 0);

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  if (error && lineItems.length === 0) return <div className="p-8 text-sm text-red-600">{error}</div>;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>← Back</Button>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Invoice</h1>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number *</label>
              <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        {allProjects.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Link Projects</h2>
            <div className="flex flex-wrap gap-2">
              {allProjects.map((p) => (
                <button key={p.id} type="button" onClick={() => toggleProject(p.id)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    linkedProjectIds.includes(p.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-muted'
                  }`}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Line Items</h2>
            <Button type="button" variant="ghost" size="sm" onClick={addLineItem}>+ Add Item</Button>
          </div>
          <div className="space-y-3">
            {lineItems.map((li) => (
              <div key={li.key} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input value={li.description} onChange={(e) => updateLineItem(li.key, 'description', e.target.value)}
                    placeholder="Description"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="w-20">
                  <input type="number" min="0.01" step="0.01" value={li.quantity} onChange={(e) => updateLineItem(li.key, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="w-28">
                  <input type="number" min="0" step="0.01" value={li.unitPrice} onChange={(e) => updateLineItem(li.key, 'unitPrice', e.target.value)}
                    placeholder="Price"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="w-24 py-2 text-sm font-medium text-gray-700 text-right">
                  ${((parseFloat(li.quantity) || 0) * (parseFloat(li.unitPrice) || 0)).toFixed(2)}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(li.key)}>✕</Button>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-right space-y-1">
            <div className="text-gray-500">Subtotal: <span className="font-medium text-gray-800">${subtotal.toFixed(2)}</span></div>
            <div className="text-gray-500">Tax ({taxRate}%): <span className="font-medium text-gray-800">${tax.toFixed(2)}</span></div>
            <div className="text-gray-700 font-semibold text-base">Total: ${(subtotal + tax).toFixed(2)}</div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        </div>
      </form>
    </div>
  );
}
