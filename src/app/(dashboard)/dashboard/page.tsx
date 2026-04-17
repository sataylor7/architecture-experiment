'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiJson } from '@/lib/api';

interface Stats {
  clients: { total: number };
  projects: Record<string, number>;
  invoices: { outstandingAmount: number; outstandingCount: number; overdueCount: number };
  tasks: Record<string, number>;
}

function StatCard({
  label,
  value,
  sub,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  accent?: string;
}) {
  const inner = (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent ?? 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-1 text-sm text-gray-400">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<{ data: Stats }>('/api/dashboard/stats')
      .then(({ data }) => setStats(data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const activeProjects =
    (stats?.projects['InProgress'] ?? 0) + (stats?.projects['Draft'] ?? 0);
  const activeTasks =
    (stats?.tasks['ToDo'] ?? 0) +
    (stats?.tasks['InProgress'] ?? 0) +
    (stats?.tasks['Blocked'] ?? 0);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Overview</h1>

      {!stats ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Clients"
              value={stats.clients.total}
              href="/clients"
            />
            <StatCard
              label="Active Projects"
              value={activeProjects}
              sub={`${stats.projects['Completed'] ?? 0} completed`}
              href="/projects"
            />
            <StatCard
              label="Outstanding Invoices"
              value={`$${stats.invoices.outstandingAmount.toFixed(2)}`}
              sub={`${stats.invoices.outstandingCount} invoices`}
              href="/invoices"
            />
            <StatCard
              label="Overdue Invoices"
              value={stats.invoices.overdueCount}
              accent={stats.invoices.overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}
              href="/invoices"
            />
          </div>

          <h2 className="mt-8 mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Projects by Status
          </h2>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
            {(['Draft', 'InProgress', 'OnHold', 'Completed', 'Cancelled'] as const).map((s) => (
              <div key={s} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <p className="text-xl font-semibold text-gray-900">{stats.projects[s] ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">{s}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-8 mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Tasks by Status
          </h2>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
            {(['ToDo', 'InProgress', 'Blocked', 'Done', 'Cancelled'] as const).map((s) => (
              <div key={s} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <p className="text-xl font-semibold text-gray-900">{stats.tasks[s] ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">{s}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 text-sm text-gray-500">
            Active tasks: <span className="font-medium text-gray-700">{activeTasks}</span>
          </div>
        </>
      )}
    </div>
  );
}
