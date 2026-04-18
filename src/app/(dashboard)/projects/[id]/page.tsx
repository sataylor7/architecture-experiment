'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiJson, apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  notes: string | null;
  dueDate: string | null;
  price: string | null;
  paid: boolean;
  completed: boolean;
  clientId: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  parentTaskId: string | null;
  completedAt: string | null;
  subtasks: Task[];
}

interface TasksResponse {
  data: Task[];
  meta: unknown;
}

const TASK_STATUSES = ['ToDo', 'InProgress', 'Blocked', 'Done', 'Cancelled'] as const;
type TaskStatus = typeof TASK_STATUSES[number];

const priorityColors: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-500',
  Medium: 'bg-blue-100 text-blue-600',
  High: 'bg-orange-100 text-orange-600',
  Urgent: 'bg-red-100 text-red-600',
};

const statusColColors: Record<string, string> = {
  ToDo: 'border-gray-300',
  InProgress: 'border-blue-400',
  Blocked: 'border-red-400',
  Done: 'border-green-400',
  Cancelled: 'border-gray-200',
};

const statusBgColors: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600',
  InProgress: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  OnHold: 'bg-yellow-100 text-yellow-700',
  Cancelled: 'bg-red-100 text-red-700',
};

function TaskCard({ task, onStatusChange }: { task: Task; onStatusChange: (id: string, status: string) => void }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      <p className="text-sm font-medium text-gray-800">{task.title}</p>
      {task.priority && (
        <span className={`mt-1.5 inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority] ?? 'bg-gray-100 text-gray-500'}`}>
          {task.priority}
        </span>
      )}
      {task.dueDate && (
        <p className="mt-1 text-xs text-gray-400">{new Date(task.dueDate).toLocaleDateString()}</p>
      )}
      <select
        value={task.status}
        onChange={(e) => onStatusChange(task.id, e.target.value)}
        className="mt-2 w-full text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {task.subtasks.length > 0 && (
        <div className="mt-2 pl-2 border-l-2 border-gray-100 space-y-1.5">
          {task.subtasks.map((sub) => (
            <div key={sub.id} className="text-xs text-gray-500">
              {sub.title}
              <span className={`ml-1 inline-flex px-1 py-0.5 rounded text-xs font-medium ${sub.priority ? priorityColors[sub.priority] : 'bg-gray-100 text-gray-400'}`}>
                {sub.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New task form
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStatus, setNewStatus] = useState<TaskStatus>('ToDo');
  const [newPriority, setNewPriority] = useState('Medium');
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    const res = await apiJson<TasksResponse>(`/api/projects/${id}/tasks?limit=100`);
    setTasks(res.data);
  }, [id]);

  useEffect(() => {
    async function load() {
      try {
        const [pRes] = await Promise.all([
          apiJson<{ data: Project }>(`/api/projects/${id}`),
        ]);
        setProject(pRes.data);
        await loadTasks();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, loadTasks]);

  async function handleStatusChange(taskId: string, status: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status }
          : { ...t, subtasks: t.subtasks.map((s) => (s.id === taskId ? { ...s, status } : s)) },
      ),
    );
    try {
      await apiFetch(`/api/projects/${id}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    } catch {
      // roll back on error
      await loadTasks();
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/projects/${id}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title: newTitle.trim(), status: newStatus, priority: newPriority }),
      });
      setNewTitle('');
      setNewStatus('ToDo');
      setShowNewTask(false);
      await loadTasks();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>;
  if (!project) return null;

  const tasksByStatus = TASK_STATUSES.reduce<Record<string, Task[]>>((acc, s) => {
    acc[s] = tasks.filter((t) => !t.parentTaskId && t.status === s);
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>← Back</Button>
        <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBgColors[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {project.status}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm lg:grid-cols-4">
          <div><dt className="text-gray-500">Due Date</dt><dd className="font-medium">{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : '—'}</dd></div>
          <div><dt className="text-gray-500">Price</dt><dd className="font-medium">{project.price ? `$${Number(project.price).toFixed(2)}` : '—'}</dd></div>
          <div><dt className="text-gray-500">Paid</dt><dd className="font-medium">{project.paid ? 'Yes' : 'No'}</dd></div>
          <div><dt className="text-gray-500">Completed</dt><dd className="font-medium">{project.completed ? 'Yes' : 'No'}</dd></div>
          {project.description && (
            <div className="col-span-2 lg:col-span-4">
              <dt className="text-gray-500">Description</dt>
              <dd className="font-medium mt-0.5">{project.description}</dd>
            </div>
          )}
          {project.notes && (
            <div className="col-span-2 lg:col-span-4">
              <dt className="text-gray-500">Notes</dt>
              <dd className="font-medium mt-0.5 whitespace-pre-wrap">{project.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Task Board</h2>
        <Button size="sm" onClick={() => setShowNewTask(true)}>+ Add Task</Button>
      </div>

      {showNewTask && (
        <form onSubmit={handleAddTask} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Task title"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as TaskStatus)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
            <select value={newPriority} onChange={(e) => setNewPriority(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Add'}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewTask(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {TASK_STATUSES.map((status) => (
          <div key={status} className="flex-shrink-0 w-56">
            <div className={`mb-2 px-2 py-1.5 rounded-t-lg border-b-2 ${statusColColors[status]}`}>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {status} <span className="font-normal text-gray-400">({tasksByStatus[status].length})</span>
              </p>
            </div>
            <div className="space-y-2 min-h-24">
              {tasksByStatus[status].map((task) => (
                <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
