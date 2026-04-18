'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiJson, apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  sortOrder: number | null;
}

interface LinkedProject {
  linkedAt: string;
  project: { id: string; name: string; status: string };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  notes: string | null;
  lineItems: LineItem[];
  projects: LinkedProject[];
  createdAt: string;
}

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  Sent: 'bg-blue-100 text-blue-700',
  Paid: 'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-700',
  Cancelled: 'bg-gray-100 text-gray-400',
};

const LOCKED = ['Sent', 'Paid', 'Overdue', 'Cancelled'];

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiJson<{ data: Invoice }>(`/api/invoices/${id}`);
      setInvoice(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSend() {
    setActing(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/invoices/${id}/send`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) { setActionError(body.error ?? 'Failed'); return; }
      setInvoice(body.data);
    } finally {
      setActing(false);
    }
  }

  async function handleMarkPaid() {
    setActing(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/invoices/${id}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({ paidAt: new Date().toISOString() }),
      });
      const body = await res.json();
      if (!res.ok) { setActionError(body.error ?? 'Failed'); return; }
      setInvoice(body.data);
    } finally {
      setActing(false);
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this invoice?')) return;
    setActing(true);
    setActionError(null);
    try {
      const res = await apiFetch(`/api/invoices/${id}/cancel`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) { setActionError(body.error ?? 'Failed'); return; }
      setInvoice(body.data);
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this invoice?')) return;
    setActing(true);
    try {
      const res = await apiFetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) { router.replace('/invoices'); return; }
      const body = await res.json();
      setActionError(body.error ?? 'Failed');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>;
  if (!invoice) return null;

  const locked = LOCKED.includes(invoice.status);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>← Back</Button>
        <h1 className="text-2xl font-semibold text-gray-900">{invoice.invoiceNumber}</h1>
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[invoice.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {invoice.status}
        </span>
        <div className="ml-auto flex gap-2 flex-wrap">
          {!locked && (
            <Link href={`/invoices/${id}/edit`} className="text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
              Edit
            </Link>
          )}
          {invoice.status === 'Draft' && (
            <Button size="sm" onClick={handleSend} disabled={acting}>Send</Button>
          )}
          {(invoice.status === 'Sent' || invoice.status === 'Overdue') && (
            <Button size="sm" onClick={handleMarkPaid} disabled={acting}>Mark Paid</Button>
          )}
          {(['Draft', 'Sent', 'Overdue'] as const).includes(invoice.status as 'Draft' | 'Sent' | 'Overdue') && (
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={acting}>Cancel</Button>
          )}
          {(invoice.status === 'Draft' || invoice.status === 'Cancelled') && (
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={acting}>Delete</Button>
          )}
        </div>
      </div>

      {actionError && <p className="text-sm text-red-600 mb-4">{actionError}</p>}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm lg:grid-cols-3">
          <div><dt className="text-gray-500">Issue Date</dt><dd className="font-medium">{new Date(invoice.issueDate).toLocaleDateString()}</dd></div>
          <div><dt className="text-gray-500">Due Date</dt><dd className="font-medium">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}</dd></div>
          <div><dt className="text-gray-500">Paid At</dt><dd className="font-medium">{invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : '—'}</dd></div>
          <div><dt className="text-gray-500">Subtotal</dt><dd className="font-medium">${Number(invoice.subtotal).toFixed(2)}</dd></div>
          <div><dt className="text-gray-500">Tax Rate</dt><dd className="font-medium">{(Number(invoice.taxRate) * 100).toFixed(2)}%</dd></div>
          <div><dt className="text-gray-500">Tax Amount</dt><dd className="font-medium">${Number(invoice.taxAmount).toFixed(2)}</dd></div>
          <div><dt className="text-gray-500 font-semibold">Total</dt><dd className="font-semibold text-lg">${Number(invoice.total).toFixed(2)}</dd></div>
          {invoice.notes && (
            <div className="col-span-2 lg:col-span-3">
              <dt className="text-gray-500">Notes</dt>
              <dd className="font-medium mt-0.5 whitespace-pre-wrap">{invoice.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Description', 'Qty', 'Unit Price', 'Total'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoice.lineItems.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-4 text-sm text-gray-400 text-center">No line items.</td></tr>
            ) : invoice.lineItems.map((li) => (
              <tr key={li.id}>
                <td className="px-4 py-3 text-sm text-gray-800">{li.description}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{Number(li.quantity)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">${Number(li.unitPrice).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">${Number(li.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invoice.projects.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Linked Projects</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {invoice.projects.map(({ project, linkedAt }) => (
              <div key={project.id} className="px-6 py-3 flex items-center justify-between">
                <Link href={`/projects/${project.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  {project.name}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{project.status}</span>
                  <span className="text-xs text-gray-400">Linked {new Date(linkedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
