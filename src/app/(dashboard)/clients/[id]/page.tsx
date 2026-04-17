'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiJson } from '@/lib/api';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  subscribed: boolean;
  taxId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  dueDate: string | null;
  completed: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  total: string;
}

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  InProgress: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  OnHold: 'bg-yellow-100 text-yellow-700',
  Cancelled: 'bg-red-100 text-red-700',
  Sent: 'bg-blue-100 text-blue-700',
  Paid: 'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-700',
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [cRes, pRes, iRes] = await Promise.all([
          apiJson<{ data: Client }>(`/api/clients/${id}`),
          apiJson<{ data: Project[]; meta: unknown }>(`/api/projects?clientId=${id}&limit=50`),
          apiJson<{ data: Invoice[]; meta: unknown }>(`/api/invoices?clientId=${id}&limit=50`),
        ]);
        setClient(cRes.data);
        setProjects(pRes.data);
        setInvoices(iRes.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>;
  if (!client) return null;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
        <h1 className="text-2xl font-semibold text-gray-900">
          {client.firstName} {client.lastName}
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Client Info</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-gray-500">Email</dt><dd className="font-medium text-gray-900">{client.email}</dd></div>
          <div><dt className="text-gray-500">Company</dt><dd className="font-medium text-gray-900">{client.company ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Subscribed</dt><dd className="font-medium text-gray-900">{client.subscribed ? 'Yes' : 'No'}</dd></div>
          <div><dt className="text-gray-500">Tax ID</dt><dd className="font-medium text-gray-900">{client.taxId ?? '—'}</dd></div>
          <div><dt className="text-gray-500">Joined</dt><dd className="font-medium text-gray-900">{new Date(client.createdAt).toLocaleDateString()}</dd></div>
          <div><dt className="text-gray-500">Updated</dt><dd className="font-medium text-gray-900">{new Date(client.updatedAt).toLocaleDateString()}</dd></div>
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Projects ({projects.length})</h2>
          <Link href={`/projects?clientId=${id}`} className="text-xs text-indigo-600 hover:text-indigo-800">View all</Link>
        </div>
        {projects.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-400">No projects.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <tbody className="divide-y divide-gray-50">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm">
                    <Link href={`/projects/${p.id}`} className="font-medium text-indigo-600 hover:text-indigo-800">{p.name}</Link>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] ?? 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Invoices ({invoices.length})</h2>
          <Link href={`/invoices?clientId=${id}`} className="text-xs text-indigo-600 hover:text-indigo-800">View all</Link>
        </div>
        {invoices.length === 0 ? (
          <p className="px-6 py-4 text-sm text-gray-400">No invoices.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-indigo-600 hover:text-indigo-800">{inv.invoiceNumber}</Link>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>{inv.status}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">${Number(inv.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
