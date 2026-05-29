import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const CURRENCIES = ['INR', 'USD'] as const;

const currencyStyles: Record<string, string> = {
  INR: 'border-l-emerald-500',
  USD: 'border-l-blue-500',
};

export const formatExpenseMoney = (amount: number, currency: string) => {
  const code = currency === 'USD' || currency === 'EUR' ? currency : 'INR';
  const locale = code === 'USD' ? 'en-US' : code === 'EUR' ? 'de-DE' : 'en-IN';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 2,
  }).format(amount);
};

interface ExpensePeriodSummaryProps {
  periodLabel: string;
  entryCount: number;
  totalsByCurrency: Map<string, number>;
  className?: string;
}

export const ExpensePeriodSummary: React.FC<ExpensePeriodSummaryProps> = ({
  periodLabel,
  entryCount,
  totalsByCurrency,
  className,
}) => {
  return (
    <Card className={cn('rounded-[14px] border-border/60 shadow-sm overflow-hidden', className)}>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-b bg-muted/30">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Period summary
            </p>
            <p className="text-sm font-semibold text-foreground">{periodLabel}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-lg font-semibold tabular-nums">{entryCount}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
          {CURRENCIES.map((currency) => {
            const amount = totalsByCurrency.get(currency) || 0;
            return (
              <div
                key={currency}
                className={cn('px-4 py-4 border-l-4', currencyStyles[currency])}
              >
                <p className="text-xs font-medium text-muted-foreground">{currency}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">
                  {formatExpenseMoney(amount, currency)}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
