export async function register() {
  // Only run jobs in the Node.js runtime (not Edge), and not during builds
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAuthCodeCleanup } = await import('@/jobs/authcode-cleanup');
    const { startOverdueInvoiceJob } = await import('@/jobs/overdue-invoices');
    startAuthCodeCleanup();
    startOverdueInvoiceJob();
  }
}
