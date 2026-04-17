'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiJson, apiFetch } from '@/lib/api';
import { decodeTokenPayload } from '@/lib/token-store';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  clientId: string;
}

interface LineItemDraft {
  key: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

let keyCounter = 0;
function nextKey() { return ++keyCounter; }

export default function NewInvoicePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    { key: nextKey(), description: '', quantity: '1', unitPrice: '0' },
  ]);

  useEffect(() => {
    async function load() {
      try {
        const [cRes, pRes] = await Promise.all([
          apiJson<{ data: Client[]; meta: unknown }>('/api/clients?limit=100'),
          apiJson<{ data: Project[]; meta: unknown }>('/api/projects?limit=100'),
        ]);
        setClients(cRes.data);
        setProjects(pRes.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleProject(pid: string) {
    setSelectedProjectIds((prev) =>
      prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid],
    );
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { key: nextKey(), description: '', quantity: '1', unitPrice: '0' }]);
  }

  function removeLineItem(key: number) {
    setLineItems((prev) => prev.filter((li) => li.key !== key));
  }

  function updateLineItem(key: number, field: keyof LineItemDraft, value: string) {
    setLineItems((prev) => prev.map((li) => li.key === key ? { ...li, [field]: value } : li));
  }

  const subtotal = lineItems.reduce((sum, li) => {
    const qty = parseFloat(li.quantity) || 0;
    const price = parseFloat(li.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
  const tax = subtotal * (parseFloat(taxRate) / 100 || 0);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = decodeTokenPayload();
      const body: Record<string, unknown> = {
        invoiceNumber,
        clientId,
        userId: payload?.userId ?? '',
        issueDate: new Date(issueDate).toISOString(),
        taxRate: parseFloat(taxRate) / 100,
        notes: notes || undefined,
      };
      if (dueDate) body.dueDate = new Date(dueDate).toISOString();
      if (selectedProjectIds.length) body.projectIds = selectedProjectIds;

      // Get current userId from JWT payload (we just use a placeholder — server validates via auth)
      const createRes = await apiFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setError(createData.error ?? 'Failed to create invoice');
        return;
      }

      const invoiceId: string = createData.data.id;

      // Add line items
      for (const li of lineItems) {
        if (!li.description.trim()) continue;
        await apiFetch(`/api/invoices/${invoiceId}/line-items`, {
          method: 'POST',
          body: JSON.stringify({
            description: li.description,
            quantity: parseFloat(li.quantity) || 1,
            unitPrice: parseFloat(li.unitPrice) || 0,
          }),
        });
      }

      router.replace(`/invoices/${invoiceId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;

  const filteredProjects = clientId
    ? projects.filter((p) => p.clientId === clientId)
    : projects;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
        <h1 className="text-2xl font-semibold text-gray-900">New Invoice</h1>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select value={clientId} onChange={(e) => { setClientId(e.target.value); setSelectedProjectIds([]); }} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
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

        {filteredProjects.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Link Projects</h2>
            <div className="flex flex-wrap gap-2">
              {filteredProjects.map((p) => (
                <button key={p.id} type="button" onClick={() => toggleProject(p.id)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    selectedProjectIds.includes(p.id)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
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
            <button type="button" onClick={addLineItem} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              + Add Item
            </button>
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
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLineItem(li.key)} className="py-2 text-gray-400 hover:text-red-500 transition-colors">✕</button>
                )}
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
          <button type="button" onClick={() => router.back()} className="text-sm font-medium text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg disabled:opacity-50 transition-colors">
            {saving ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
