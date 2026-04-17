'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiJson } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  status: string;
  dueDate: string | null;
  completed: boolean;
  clientId: string;
  createdAt: string;
}

interface ListResponse {
  data: Project[];
  meta: { nextCursor: string | null; hasMore: boolean };
}

const STATUSES = ['Draft', 'InProgress', 'OnHold', 'Completed', 'Cancelled'];

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  InProgress: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  OnHold: 'bg-yellow-100 text-yellow-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const clientIdFilter = searchParams.get('clientId') ?? '';
  const [statusFilter, setStatusFilter] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Name', 'Status', 'Due Date', 'Completed', 'Created'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm">
                  <Link href={`/projects/${p.id}`} className="font-medium text-indigo-600 hover:text-indigo-800">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {p.completed ? '✓' : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {!loading && projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  No projects found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <p className="mt-4 text-sm text-gray-400">Loading…</p>}
      {hasMore && !loading && (
        <button
          onClick={() => load(cursor ?? undefined)}
          className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Load more
        </button>
      )}
    </div>
  );
}
