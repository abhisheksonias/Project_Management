import { format } from 'date-fns';
import { Worklog } from '@/features/worklogs/services/worklogService';

export const exportWorklogsToCSV = (worklogs: Worklog[]): void => {
  if (worklogs.length === 0) {
    throw new Error('No worklogs to export');
  }

  // Prepare CSV headers
  const headers = ['Date', 'Project', 'Task', 'Type', 'Hours', 'Description'];
  
  // Prepare CSV rows
  const rows = worklogs.map((log) => {
    const logType = log.tasks?.type || '';
    return [
      format(new Date(log.created_at), 'yyyy-MM-dd'),
      log.projects?.name || '-',
      log.tasks?.name || '-',
      logType,
      log.hours,
      log.note || '-'
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Escape commas and quotes in CSV
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `worklogs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

