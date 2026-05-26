import { format } from 'date-fns';
import { ProjectProfit, UserProjectProfit } from '@/features/profit/services/profitService';

/**
 * Export projects profit data to CSV
 */
export const exportProjectsProfitToCSV = (projects: ProjectProfit[]): void => {
  if (projects.length === 0) {
    throw new Error('No projects to export');
  }

  const headers = [
    'Project Name',
    'Revenue',
    'Cost',
    'Profit',
    'Profit Margin %',
    'Total Hours',
  ];

  const rows = projects.map((project) => {
    return [
      project.name || '-',
      project.project_revenue?.toFixed(2) || '0.00',
      project.project_total_cost?.toFixed(2) || '0.00',
      project.profit?.toFixed(2) || '0.00',
      project.profit_margin_percent !== null
        ? `${project.profit_margin_percent.toFixed(2)}%`
        : '-',
      project.total_hours?.toFixed(2) || '0.00',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `projects_profit_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export user project profit data to CSV
 */
export const exportUserProjectProfitToCSV = (
  users: UserProjectProfit[],
  projectName: string
): void => {
  if (users.length === 0) {
    throw new Error('No user data to export');
  }

  const headers = [
    'User Name',
    'Hours',
    'Revenue Share',
    'Cost',
    'Profit',
  ];

  const rows = users.map((user) => {
    return [
      user.user_name || 'Unknown User',
      user.user_hours?.toFixed(2) || '0.00',
      user.user_revenue_share?.toFixed(2) || '0.00',
      user.user_cost?.toFixed(2) || '0.00',
      user.user_profit?.toFixed(2) || '0.00',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const cellStr = String(cell || '');
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `user_profit_${projectName.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

