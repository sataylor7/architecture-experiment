'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiJson, apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SocialMedia {
  id: string;
  facebook: string | null;
  instagram: string | null;
  twitter: string | null;
  linkedin: string | null;
  github: string | null;
}

interface Measurements {
  id: string;
  unit: 'Inches' | 'Centimeters';
  neck: string | null;
  shoulder: string | null;
  shoulderToElbow: string | null;
  bicep: string | null;
  wrist: string | null;
  chest: string | null;
  waist: string | null;
  hip: string | null;
  thigh: string | null;
  ankle: string | null;
  hipToKnee: string | null;
  crotchLength: string | null;
  sleeve: string | null;
  inseam: string | null;
  outseam: string | null;
  rise: string | null;
  height: string | null;
  weight: string | null;
}

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
  socialMedia: SocialMedia | null;
  measurements: Measurements | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  dueDate: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  total: string;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'secondary',
  InProgress: 'default',
  Completed: 'outline',
  OnHold: 'secondary',
  Cancelled: 'destructive',
  Sent: 'default',
  Paid: 'outline',
  Overdue: 'destructive',
};

const MEASUREMENT_FIELDS: { key: keyof Omit<Measurements, 'id' | 'unit'>; label: string }[] = [
  { key: 'neck',           label: 'Neck' },
  { key: 'shoulder',       label: 'Shoulder' },
  { key: 'shoulderToElbow', label: 'Shoulder to Elbow' },
  { key: 'bicep',          label: 'Bicep' },
  { key: 'wrist',          label: 'Wrist' },
  { key: 'chest',          label: 'Chest' },
  { key: 'waist',          label: 'Waist' },
  { key: 'hip',            label: 'Hip' },
  { key: 'thigh',          label: 'Thigh' },
  { key: 'ankle',          label: 'Ankle' },
  { key: 'hipToKnee',      label: 'Hip to Knee' },
  { key: 'crotchLength',   label: 'Crotch Length' },
  { key: 'sleeve',         label: 'Sleeve' },
  { key: 'inseam',         label: 'Inseam' },
  { key: 'outseam',        label: 'Outseam' },
  { key: 'rise',           label: 'Rise' },
  { key: 'height',         label: 'Height' },
  { key: 'weight',         label: 'Weight' },
];

const emptySocialForm = { facebook: '', instagram: '', twitter: '', linkedin: '', github: '' };
const emptyMeasurementsForm = {
  unit: 'Inches' as 'Inches' | 'Centimeters',
  neck: '', shoulder: '', shoulderToElbow: '', bicep: '', wrist: '',
  chest: '', waist: '', hip: '', thigh: '', ankle: '', hipToKnee: '', crotchLength: '',
  sleeve: '', inseam: '', outseam: '', rise: '', height: '', weight: '',
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Social media edit state
  const [editSocial, setEditSocial] = useState(false);
  const [socialForm, setSocialForm] = useState(emptySocialForm);
  const [savingSocial, setSavingSocial] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);

  // Measurements edit state
  const [editMeasurements, setEditMeasurements] = useState(false);
  const [measurementsForm, setMeasurementsForm] = useState(emptyMeasurementsForm);
  const [savingMeasurements, setSavingMeasurements] = useState(false);
  const [measurementsError, setMeasurementsError] = useState<string | null>(null);

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

  function openSocialEdit() {
    if (!client) return;
    setSocialForm({
      facebook:  client.socialMedia?.facebook  ?? '',
      instagram: client.socialMedia?.instagram ?? '',
      twitter:   client.socialMedia?.twitter   ?? '',
      linkedin:  client.socialMedia?.linkedin  ?? '',
      github:    client.socialMedia?.github    ?? '',
    });
    setSocialError(null);
    setEditSocial(true);
  }

  async function handleSocialSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingSocial(true);
    setSocialError(null);
    try {
      const body = {
        facebook:  socialForm.facebook  || null,
        instagram: socialForm.instagram || null,
        twitter:   socialForm.twitter   || null,
        linkedin:  socialForm.linkedin  || null,
        github:    socialForm.github    || null,
      };
      const res = await apiFetch(`/api/clients/${id}/social-media`, { method: 'PUT', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setSocialError(data.error ?? 'Failed'); return; }
      setClient((c) => c ? { ...c, socialMedia: data.data } : c);
      setEditSocial(false);
    } catch (err: unknown) {
      setSocialError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSavingSocial(false);
    }
  }

  function openMeasurementsEdit() {
    if (!client) return;
    const m = client.measurements;
    setMeasurementsForm({
      unit:            (m?.unit ?? 'Inches') as 'Inches' | 'Centimeters',
      neck:            m?.neck            ?? '',
      shoulder:        m?.shoulder        ?? '',
      shoulderToElbow: m?.shoulderToElbow ?? '',
      bicep:           m?.bicep           ?? '',
      wrist:           m?.wrist           ?? '',
      chest:           m?.chest           ?? '',
      waist:           m?.waist           ?? '',
      hip:             m?.hip             ?? '',
      thigh:           m?.thigh           ?? '',
      ankle:           m?.ankle           ?? '',
      hipToKnee:       m?.hipToKnee       ?? '',
      crotchLength:    m?.crotchLength     ?? '',
      sleeve:          m?.sleeve          ?? '',
      inseam:          m?.inseam          ?? '',
      outseam:         m?.outseam         ?? '',
      rise:            m?.rise            ?? '',
      height:          m?.height          ?? '',
      weight:          m?.weight          ?? '',
    });
    setMeasurementsError(null);
    setEditMeasurements(true);
  }

  async function handleMeasurementsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingMeasurements(true);
    setMeasurementsError(null);
    try {
      const body: Record<string, unknown> = { unit: measurementsForm.unit };
      for (const { key } of MEASUREMENT_FIELDS) {
        const val = measurementsForm[key];
        body[key] = val !== '' ? parseFloat(val as string) : null;
      }
      const res = await apiFetch(`/api/clients/${id}/measurements`, { method: 'PUT', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setMeasurementsError(data.error ?? 'Failed'); return; }
      setClient((c) => c ? { ...c, measurements: data.data } : c);
      setEditMeasurements(false);
    } catch (err: unknown) {
      setMeasurementsError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSavingMeasurements(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="p-8 text-sm text-destructive">{error}</div>;
  if (!client) return null;

  const unitLabel = client.measurements?.unit === 'Centimeters' ? 'cm' : 'in';

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>← Back</Button>
        <h1 className="text-2xl font-semibold text-foreground">
          {client.firstName} {client.lastName}
        </h1>
      </div>

      {/* Client Info */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Client Info</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-muted-foreground">Email</dt><dd className="font-medium">{client.email}</dd></div>
          <div><dt className="text-muted-foreground">Company</dt><dd className="font-medium">{client.company ?? '—'}</dd></div>
          <div>
            <dt className="text-muted-foreground">Subscribed</dt>
            <dd><Badge variant={client.subscribed ? 'default' : 'secondary'}>{client.subscribed ? 'Yes' : 'No'}</Badge></dd>
          </div>
          <div><dt className="text-muted-foreground">Tax ID</dt><dd className="font-medium">{client.taxId ?? '—'}</dd></div>
          <div><dt className="text-muted-foreground">Joined</dt><dd className="font-medium">{new Date(client.createdAt).toLocaleDateString()}</dd></div>
          <div><dt className="text-muted-foreground">Updated</dt><dd className="font-medium">{new Date(client.updatedAt).toLocaleDateString()}</dd></div>
        </dl>
      </div>

      {/* Social Media */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Social Media</h2>
          {!editSocial && <Button size="sm" variant="outline" onClick={openSocialEdit}>Edit</Button>}
        </div>

        {editSocial ? (
          <form onSubmit={handleSocialSubmit} className="space-y-3">
            {socialError && <p className="text-sm text-destructive">{socialError}</p>}
            <div className="grid grid-cols-2 gap-3">
              {(['facebook', 'instagram', 'twitter', 'linkedin', 'github'] as const).map((platform) => (
                <div key={platform} className="space-y-1.5">
                  <Label htmlFor={`social-${platform}`} className="capitalize">{platform}</Label>
                  <Input
                    id={`social-${platform}`}
                    value={socialForm[platform]}
                    placeholder={`${platform} username or URL`}
                    onChange={(e) => setSocialForm((f) => ({ ...f, [platform]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditSocial(false)}>Cancel</Button>
              <Button type="submit" disabled={savingSocial}>{savingSocial ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {(['facebook', 'instagram', 'twitter', 'linkedin', 'github'] as const).map((platform) => (
              <div key={platform}>
                <dt className="text-muted-foreground capitalize">{platform}</dt>
                <dd className="font-medium truncate">{client.socialMedia?.[platform] ?? '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Measurements */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Measurements</h2>
          {!editMeasurements && <Button size="sm" variant="outline" onClick={openMeasurementsEdit}>Edit</Button>}
        </div>

        {editMeasurements ? (
          <form onSubmit={handleMeasurementsSubmit} className="space-y-4">
            {measurementsError && <p className="text-sm text-destructive">{measurementsError}</p>}
            <div className="space-y-1.5 w-40">
              <Label htmlFor="unit">Unit</Label>
              <Select
                value={measurementsForm.unit}
                onValueChange={(v) => setMeasurementsForm((f) => ({ ...f, unit: (v ?? 'Inches') as 'Inches' | 'Centimeters' }))}
              >
                <SelectTrigger id="unit" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inches">Inches</SelectItem>
                  <SelectItem value="Centimeters">Centimeters</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MEASUREMENT_FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`m-${key}`}>{label}</Label>
                  <Input
                    id={`m-${key}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="—"
                    value={measurementsForm[key] as string}
                    onChange={(e) => setMeasurementsForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditMeasurements(false)}>Cancel</Button>
              <Button type="submit" disabled={savingMeasurements}>{savingMeasurements ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        ) : (
          <>
            {client.measurements ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">Unit: {client.measurements.unit}</p>
                <dl className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
                  {MEASUREMENT_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium">
                        {client.measurements![key] != null
                          ? `${Number(client.measurements![key]).toFixed(2)} ${unitLabel}`
                          : '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No measurements recorded yet.</p>
            )}
          </>
        )}
      </div>

      {/* Projects */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Projects ({projects.length})</h2>
          <Link href={`/projects?clientId=${id}`} className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {projects.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">No projects.</p>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <tbody className="divide-y divide-border">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-muted/50">
                  <td className="px-6 py-3 text-sm">
                    <Link href={`/projects/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <Badge variant={statusVariant[p.status] ?? 'secondary'}>{p.status}</Badge>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invoices */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Invoices ({invoices.length})</h2>
          <Link href={`/invoices?clientId=${id}`} className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {invoices.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">No invoices.</p>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/50">
                  <td className="px-6 py-3 text-sm">
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">{inv.invoiceNumber}</Link>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <Badge variant={statusVariant[inv.status] ?? 'secondary'}>{inv.status}</Badge>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-sm font-medium">${Number(inv.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
