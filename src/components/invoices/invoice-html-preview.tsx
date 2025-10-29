
'use client';

import React from 'react';
import type { Invoice, InvoiceTheme } from '@/lib/types';
import { format, getDate, parseISO } from 'date-fns';
import { ro } from 'date-fns/locale';
import { cn } from '@/lib/utils';


interface InvoiceHtmlPreviewProps {
  invoice: Omit<Invoice, 'id'>;
}

const translations = {
    en: {
        address: 'Address',
        phone: 'Phone',
        email: 'E-Mail',
        bank: 'Bank',
        iban: 'IBAN',
        swift: 'SWIFT/BIC',
        billedTo: 'Billed To',
        vatId: 'VAT ID',
        invoice: 'INVOICE',
        invoiceDate: 'Invoice Date',
        dueDate: 'Due Date',
        description: 'Description',
        quantity: 'Quantity',
        rate: 'Rate',
        amount: 'Amount',
        subtotal: 'Subtotal',
        vat: 'VAT',
        total: 'Total',
        totalRon: 'Total (RON)',
        subtotalRon: 'Subtotal (RON)',
        vatRon: 'VAT (RON)',
        footerExchange: (date: string, currency: string, rate: number) => `Exchange rate from BNR for ${date}: 1 ${currency} = ${rate.toFixed(4)} RON.`,
        footerMaxRate: (date: string, currency: string, rate: number) => `Using fixed client exchange rate set on ${date}: 1 ${currency} = ${rate.toFixed(4)} RON.`,
        footerThanks: 'Thank you for your business!',
        consultancyServices: (period: string, quantity: string) => `IT Consultancy services for period ${period} (${quantity})`,
        consultancyServicesDays: (period: string) => `IT Consultancy services for period ${period}`,
        reverseCharge: 'Reversal of VAT liability on EU cross-border transactions',
        unit: {
            days: 'days',
            hours: 'hours'
        }
    },
    ro: {
        address: 'Adresă',
        phone: 'Telefon',
        email: 'E-Mail',
        bank: 'Bancă',
        iban: 'IBAN',
        swift: 'SWIFT/BIC',
        billedTo: 'Facturat către',
        vatId: 'CUI/CIF',
        invoice: 'FACTURĂ',
        invoiceDate: 'Data facturii',
        dueDate: 'Data scadenței',
        description: 'Descriere',
        quantity: 'Cantitate',
        rate: 'Preț Unitar',
        amount: 'Valoare',
        subtotal: 'Subtotal',
        vat: 'TVA',
        total: 'Total',
        totalRon: 'Total (RON)',
        subtotalRon: 'Subtotal (RON)',
        vatRon: 'TVA (RON)',
        footerExchange: (date: string, currency: string, rate: number) => `Curs valutar BNR pentru ${date}: 1 ${currency} = ${rate.toFixed(4)} RON.`,
        footerMaxRate: (date: string, currency: string, rate: number) => `Folosind cursul fix al clientului setat la data de ${date}: 1 ${currency} = ${rate.toFixed(4)} RON.`,
        footerThanks: 'Vă mulțumim!',
        consultancyServices: (period: string, quantity: string) => `Servicii de consultanță IT pentru perioada ${period} (${quantity})`,
        consultancyServicesDays: (period: string) => `Servicii de consultanță IT pentru perioada ${period}`,
        reverseCharge: 'Taxare inversă - neimpozabil în România',
        unit: {
            days: 'zile',
            hours: 'ore'
        }
    }
};

function getDayWithOrdinal(date: Date, lang: 'en' | 'ro'): string {
    const day = getDate(date);
    if (lang === 'ro') return String(day);

    if (day > 3 && day < 21) return `${day}th`;
    switch (day % 10) {
      case 1:  return `${day}st`;
      case 2:  return `${day}nd`;
      case 3:  return `${day}rd`;
      default: return `${day}th`;
    }
}

export const themeStyles: { [key in InvoiceTheme]: {
  fontFamily: string;
  accentClass: string;
  headerTextClass: string;
  tableHeaderBgClass: string;
  tableHeaderTextClass: string;
  totalBgClass: string;
  totalTextClass: string;
  accentColor: string;
  tableHeaderBgColor: string;
  secondaryBg?: string;
} } = {
  'Classic': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-blue-600',
    headerTextClass: 'text-blue-600',
    tableHeaderBgClass: 'bg-blue-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-blue-600',
    totalTextClass: 'text-white',
    accentColor: '#2563EB',
    tableHeaderBgColor: '#2563EB',
    secondaryBg: '#EFF6FF'
  },
  'Modern': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-red-600',
    headerTextClass: 'text-red-600',
    tableHeaderBgClass: 'bg-red-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-red-600',
    totalTextClass: 'text-white',
    accentColor: '#DC2626',
    tableHeaderBgColor: '#DC2626',
    secondaryBg: '#FEF2F2'
  },
  'Sunset': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-orange-600',
    headerTextClass: 'text-orange-600',
    tableHeaderBgClass: 'bg-orange-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-orange-600',
    totalTextClass: 'text-white',
    accentColor: '#EA580C',
    tableHeaderBgColor: '#EA580C',
    secondaryBg: '#FFF7ED'
  },
  'Ocean': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-cyan-600',
    headerTextClass: 'text-cyan-600',
    tableHeaderBgClass: 'bg-cyan-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-cyan-600',
    totalTextClass: 'text-white',
    accentColor: '#0891B2',
    tableHeaderBgColor: '#0891B2',
    secondaryBg: '#ECFEFF'
  },
  'Monochrome': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-gray-800',
    headerTextClass: 'text-gray-800',
    tableHeaderBgClass: 'bg-gray-800',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-gray-800',
    totalTextClass: 'text-white',
    accentColor: '#1F2937',
    tableHeaderBgColor: '#1F2937',
    secondaryBg: '#F9FAFB'
  },
  'Minty': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-emerald-600',
    headerTextClass: 'text-emerald-600',
    tableHeaderBgClass: 'bg-emerald-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-emerald-600',
    totalTextClass: 'text-white',
    accentColor: '#059669',
    tableHeaderBgColor: '#059669',
    secondaryBg: '#F0FDF4'
  },
  'Velvet': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-purple-600',
    headerTextClass: 'text-purple-600',
    tableHeaderBgClass: 'bg-purple-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-purple-600',
    totalTextClass: 'text-white',
    accentColor: '#7C3AED',
    tableHeaderBgColor: '#7C3AED',
    secondaryBg: '#FAF5FF'
  },
  'Corporate Blue': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-indigo-800',
    headerTextClass: 'text-indigo-800',
    tableHeaderBgClass: 'bg-indigo-800',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-indigo-800',
    totalTextClass: 'text-white',
    accentColor: '#1E40AF',
    tableHeaderBgColor: '#1E40AF',
    secondaryBg: '#EFF6FF'
  },
  'Earthy Tones': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-amber-900',
    headerTextClass: 'text-amber-900',
    tableHeaderBgClass: 'bg-amber-900',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-amber-900',
    totalTextClass: 'text-white',
    accentColor: '#78350F',
    tableHeaderBgColor: '#78350F',
    secondaryBg: '#FFFBEB'
  },
  'Creative': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-pink-600',
    headerTextClass: 'text-pink-600',
    tableHeaderBgClass: 'bg-pink-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-pink-600',
    totalTextClass: 'text-white',
    accentColor: '#DB2777',
    tableHeaderBgColor: '#DB2777',
    secondaryBg: '#FDF2F8'
  },
  'Slate Gray': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-slate-600',
    headerTextClass: 'text-slate-600',
    tableHeaderBgClass: 'bg-slate-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-slate-600',
    totalTextClass: 'text-white',
    accentColor: '#475569',
    tableHeaderBgColor: '#475569',
    secondaryBg: '#F8FAFC'
  },
  'Dark Charcoal': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-zinc-800',
    headerTextClass: 'text-zinc-800',
    tableHeaderBgClass: 'bg-zinc-800',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-zinc-800',
    totalTextClass: 'text-white',
    accentColor: '#27272A',
    tableHeaderBgColor: '#27272A',
    secondaryBg: '#FAFAFA'
  },
  'Navy Blue': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-blue-900',
    headerTextClass: 'text-blue-900',
    tableHeaderBgClass: 'bg-blue-900',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-blue-900',
    totalTextClass: 'text-white',
    accentColor: '#1E3A8A',
    tableHeaderBgColor: '#1E3A8A',
    secondaryBg: '#EFF6FF'
  },
  'Forest Green': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-green-700',
    headerTextClass: 'text-green-700',
    tableHeaderBgClass: 'bg-green-700',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-green-700',
    totalTextClass: 'text-white',
    accentColor: '#15803D',
    tableHeaderBgColor: '#15803D',
    secondaryBg: '#F0FDF4'
  },
  'Burgundy': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-rose-800',
    headerTextClass: 'text-rose-800',
    tableHeaderBgClass: 'bg-rose-800',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-rose-800',
    totalTextClass: 'text-white',
    accentColor: '#9F1239',
    tableHeaderBgColor: '#9F1239',
    secondaryBg: '#FFF1F2'
  },
  'Teal': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-teal-600',
    headerTextClass: 'text-teal-600',
    tableHeaderBgClass: 'bg-teal-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-teal-600',
    totalTextClass: 'text-white',
    accentColor: '#0D9488',
    tableHeaderBgColor: '#0D9488',
    secondaryBg: '#F0FDFA'
  },
  'Coral': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-red-500',
    headerTextClass: 'text-red-500',
    tableHeaderBgClass: 'bg-red-500',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-red-500',
    totalTextClass: 'text-white',
    accentColor: '#EF4444',
    tableHeaderBgColor: '#EF4444',
    secondaryBg: '#FEF2F2'
  },
  'Lavender': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-violet-500',
    headerTextClass: 'text-violet-500',
    tableHeaderBgClass: 'bg-violet-500',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-violet-500',
    totalTextClass: 'text-white',
    accentColor: '#8B5CF6',
    tableHeaderBgColor: '#8B5CF6',
    secondaryBg: '#F5F3FF'
  },
  'Golden': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-yellow-600',
    headerTextClass: 'text-yellow-600',
    tableHeaderBgClass: 'bg-yellow-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-yellow-600',
    totalTextClass: 'text-white',
    accentColor: '#CA8A04',
    tableHeaderBgColor: '#CA8A04',
    secondaryBg: '#FEFCE8'
  },
  'Steel Blue': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-sky-600',
    headerTextClass: 'text-sky-600',
    tableHeaderBgClass: 'bg-sky-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-sky-600',
    totalTextClass: 'text-white',
    accentColor: '#0284C7',
    tableHeaderBgColor: '#0284C7',
    secondaryBg: '#F0F9FF'
  },
  'Light Blue': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-blue-400',
    headerTextClass: 'text-blue-400',
    tableHeaderBgClass: 'bg-blue-400',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-blue-400',
    totalTextClass: 'text-white',
    accentColor: '#60A5FA',
    tableHeaderBgColor: '#60A5FA',
    secondaryBg: '#EFF6FF'
  },
  'Sky Blue': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-sky-500',
    headerTextClass: 'text-sky-500',
    tableHeaderBgClass: 'bg-sky-500',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-sky-500',
    totalTextClass: 'text-white',
    accentColor: '#0EA5E9',
    tableHeaderBgColor: '#0EA5E9',
    secondaryBg: '#F0F9FF'
  },
  'Mint Green': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-emerald-500',
    headerTextClass: 'text-emerald-500',
    tableHeaderBgClass: 'bg-emerald-500',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-emerald-500',
    totalTextClass: 'text-white',
    accentColor: '#10B981',
    tableHeaderBgColor: '#ECFDF5'
  },
  'Lime': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-lime-600',
    headerTextClass: 'text-lime-600',
    tableHeaderBgClass: 'bg-lime-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-lime-600',
    totalTextClass: 'text-white',
    accentColor: '#65A30D',
    tableHeaderBgColor: '#65A30D',
    secondaryBg: '#F7FEE7'
  },
  'Peach': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-orange-400',
    headerTextClass: 'text-orange-400',
    tableHeaderBgClass: 'bg-orange-400',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-orange-400',
    totalTextClass: 'text-white',
    accentColor: '#FB923C',
    tableHeaderBgColor: '#FB923C',
    secondaryBg: '#FFF7ED'
  },
  'Rose': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-rose-600',
    headerTextClass: 'text-rose-600',
    tableHeaderBgClass: 'bg-rose-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-rose-600',
    totalTextClass: 'text-white',
    accentColor: '#E11D48',
    tableHeaderBgColor: '#E11D48',
    secondaryBg: '#FFF1F2'
  },
  'Lilac': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-purple-400',
    headerTextClass: 'text-purple-400',
    tableHeaderBgClass: 'bg-purple-400',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-purple-400',
    totalTextClass: 'text-white',
    accentColor: '#C084FC',
    tableHeaderBgColor: '#C084FC',
    secondaryBg: '#FAF5FF'
  },
  'Sand': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-amber-600',
    headerTextClass: 'text-amber-600',
    tableHeaderBgClass: 'bg-amber-600',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-amber-600',
    totalTextClass: 'text-white',
    accentColor: '#D97706',
    tableHeaderBgColor: '#D97706',
    secondaryBg: '#FFFBEB'
  },
  'Olive': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-lime-700',
    headerTextClass: 'text-lime-700',
    tableHeaderBgClass: 'bg-lime-700',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-lime-700',
    totalTextClass: 'text-white',
    accentColor: '#4D7C0F',
    tableHeaderBgColor: '#4D7C0F',
    secondaryBg: '#F7FEE7'
  },
  'Maroon': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-red-900',
    headerTextClass: 'text-red-900',
    tableHeaderBgClass: 'bg-red-900',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-red-900',
    totalTextClass: 'text-white',
    accentColor: '#7F1D1D',
    tableHeaderBgColor: '#7F1D1D',
    secondaryBg: '#FEF2F2'
  },
  'Deep Purple': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-purple-800',
    headerTextClass: 'text-purple-800',
    tableHeaderBgClass: 'bg-purple-800',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-purple-800',
    totalTextClass: 'text-white',
    accentColor: '#6B21A8',
    tableHeaderBgColor: '#6B21A8',
    secondaryBg: '#FAF5FF'
  },
  'Turquoise': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-cyan-500',
    headerTextClass: 'text-cyan-500',
    tableHeaderBgClass: 'bg-cyan-500',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-cyan-500',
    totalTextClass: 'text-white',
    accentColor: '#06B6D4',
    tableHeaderBgColor: '#06B6D4',
    secondaryBg: '#ECFEFF'
  },
  'Charcoal': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-gray-700',
    headerTextClass: 'text-gray-700',
    tableHeaderBgClass: 'bg-gray-700',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-gray-700',
    totalTextClass: 'text-white',
    accentColor: '#374151',
    tableHeaderBgColor: '#374151',
    secondaryBg: '#F9FAFB'
  },
  'Crimson': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-red-700',
    headerTextClass: 'text-red-700',
    tableHeaderBgClass: 'bg-red-700',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-red-700',
    totalTextClass: 'text-white',
    accentColor: '#B91C1C',
    tableHeaderBgColor: '#B91C1C',
    secondaryBg: '#FEF2F2'
  },
  'Sapphire': {
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-blue-700',
    headerTextClass: 'text-blue-700',
    tableHeaderBgClass: 'bg-blue-700',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-blue-700',
    totalTextClass: 'text-white',
    accentColor: '#1D4ED8',
    tableHeaderBgColor: '#EFF6FF'
  },
};


export function InvoiceHtmlPreview({ invoice }: InvoiceHtmlPreviewProps) {
  const {
    companyName, companyAddress, companyVat, companyEmail, companyPhone, companyBankName, companyIban, companySwift,
    invoiceNumber, clientName, clientAddress, clientVat, clientBankName, clientIban, clientSwift,
    date, dueDate, items, currency, subtotal, vatAmount, total,
    language, vatRate, totalRon,
    theme = 'Classic'
  } = invoice;

  const styles = themeStyles[theme];
  
  const lang = language === 'Romanian' ? 'ro' : 'en';
  const t = translations[lang];
  const hasVat = vatAmount !== undefined && vatAmount > 0;
  const isReverseCharge = vatRate === 0 && hasVat;

  const currencySymbols: { [key:string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    RON: 'RON'
  };
  const currencySymbol = currencySymbols[currency] || currency;

  const formatDateWithOrdinal = (dateString: string | undefined) => {
    if (!dateString) return '';
    const d = parseISO(dateString);
    const dayWithOrdinal = getDayWithOrdinal(d, lang);
    const monthYearFormat = lang === 'ro' ? 'LLLL, yyyy' : 'MMMM, yyyy';
    const locale = lang === 'ro' ? { locale: ro } : {};

    if (lang === 'ro') {
        return `${dayWithOrdinal} ${format(d, monthYearFormat, locale)}`;
    }
    return `${dayWithOrdinal} of ${format(d, monthYearFormat, locale)}`;
  }

  const translateDescription = (item: Invoice['items'][0]) => {
      const { description, quantity, unit } = item;
      if (lang === 'en') return description;

      const translatedUnit = t.unit[unit as keyof typeof t.unit] || unit;

      // Regex for description
      const descRegex = /IT Consultancy services for period ([\d\.]+\s*-\s*[\d\.]+)/;
      const match = description.match(descRegex);

      if (match) {
          const [, period] = match;
          if (unit === 'hours') {
            const quantityText = `${quantity.toFixed(2)} ${translatedUnit}`;
            return t.consultancyServices(period, quantityText);
          }
          return t.consultancyServicesDays(period);
      }

      return description; // Fallback
  };


  const layoutStyles = { 
    width: '794px', 
    minHeight: '1123px', 
    display: 'flex', 
    flexDirection: 'column' as const, 
    fontFamily: styles.fontFamily,
    padding: '0px',
  };
  
  const ronBreakdown = React.useMemo(() => {
    if (!invoice.exchangeRate || currency === 'RON') {
        return null;
    }
    const subtotalRon = subtotal * invoice.exchangeRate;
    const vatAmountRon = (vatAmount || 0) * invoice.exchangeRate;
    const totalRonCalculated = subtotalRon + vatAmountRon;

    return {
        subtotal: subtotalRon,
        vat: vatAmountRon,
        total: totalRonCalculated,
    };
  }, [subtotal, vatAmount, invoice.exchangeRate, currency, hasVat]);


  return (
    <div className="bg-white text-gray-900" style={layoutStyles}>
      <main className="flex-grow" style={{paddingLeft: '0px', paddingRight: '0px'}}>
        {/* Header */}
          <div className={cn('px-12 py-8', styles.tableHeaderBgClass, styles.tableHeaderTextClass)}>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold" style={{ letterSpacing: '-0.01em' }}>{companyName}</h1>
                <div className="text-sm mt-2 opacity-90 space-y-px">
                  <p>{companyAddress}</p>
                   {companyBankName && <p><span className="font-semibold">{t.bank}:</span> {companyBankName}</p>}
                  {companyIban && <p><span className="font-semibold">{t.iban}:</span> {companyIban}</p>}
                  {companySwift && <p><span className="font-semibold">{t.swift}:</span> {companySwift}</p>}
                  {companyPhone && <p>{t.phone}: {companyPhone}</p>}
                  {companyEmail && <p>{t.email}: {companyEmail}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm uppercase tracking-widest opacity-75">{t.invoice}</p>
                <p className="text-3xl font-bold mt-1">#{invoiceNumber}</p>
              </div>
            </div>
          </div>

        {/* Client Info Section */}
        <div style={{padding: '0 48px'}}>
            <div className="grid grid-cols-2 gap-6 mb-10 mt-8">
                <div style={{ backgroundColor: styles.secondaryBg }} className='p-6 rounded'>
                    <p className={cn('text-xs font-bold uppercase mb-3', styles.headerTextClass)}>{t.billedTo}</p>
                    <p className='font-bold text-gray-900'>{clientName}</p>
                    <div className='text-gray-600 space-y-px text-sm'>
                        <p>{clientAddress}</p>
                         <div className='space-y-0'>
                            {clientVat && <p>{t.vatId}: {clientVat}</p>}
                            {clientBankName && <p><span className="font-semibold">{t.bank}:</span> {clientBankName}</p>}
                            {clientIban && <p><span className="font-semibold">{t.iban}:</span> {clientIban}</p>}
                            {clientSwift && <p><span className="font-semibold">{t.swift}:</span> {clientSwift}</p>}
                        </div>
                        <div className='mt-2'>
                            {invoice.projectName && <p className="text-gray-700"><span className='font-semibold'>Project:</span> {invoice.projectName}</p>}
                        </div>
                    </div>
                </div>
                <div style={{ backgroundColor: styles.secondaryBg }} className='p-6 rounded'>
                    <p className={cn('text-xs font-bold uppercase mb-3', styles.headerTextClass)}>{t.invoiceDate}</p>
                    <p className="text-gray-800">{formatDateWithOrdinal(date)}</p>
                    <p className={cn('text-xs font-bold uppercase mt-3 mb-3', styles.headerTextClass)}>{t.dueDate}</p>
                    <p className="text-gray-800">{formatDateWithOrdinal(dueDate)}</p>
                </div>
            </div>
        </div>

        {isReverseCharge && (
            <div style={{padding: '0 48px'}} className="mb-4">
                <div className="text-center p-2 bg-gray-100 border border-gray-300 rounded-sm">
                    <p className="text-sm font-semibold">{t.reverseCharge}</p>
                </div>
            </div>
        )}

        {/* Items Table */}
        <div style={{padding: '0 48px'}} className='mt-8 mb-8'>
            <table className="w-full">
                <thead>
                    <tr className={cn(styles.tableHeaderBgClass, styles.tableHeaderTextClass)}>
                        <th className='py-3 px-4 text-left font-semibold uppercase text-xs tracking-wider'>{t.description}</th>
                        <th className='w-24 py-3 px-4 text-center font-semibold uppercase text-xs tracking-wider'>{t.quantity}</th>
                        <th className='w-28 py-3 px-4 text-center font-semibold uppercase text-xs tracking-wider'>{t.rate}</th>
                        <th className='w-32 py-3 px-4 text-right font-semibold uppercase text-xs tracking-wider'>{t.amount}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => {
                        const translatedDescription = translateDescription(item);
                        const rowClass = (index % 2 === 0 ? 'bg-gray-50' : 'bg-white');

                        return (
                            <tr key={index} className={rowClass}>
                                <td className='py-3 px-4 text-sm text-gray-800'>{translatedDescription}</td>
                                <td className='py-3 px-4 text-center text-sm text-gray-700'>{item.quantity.toFixed(2)} {t.unit[item.unit as keyof typeof t.unit] || item.unit}</td>
                                <td className='py-3 px-4 text-center text-sm text-gray-700'>{currencySymbol}{item.rate.toFixed(2)}</td>
                                <td className='py-3 px-4 text-right text-sm text-gray-900'>{currencySymbol}{item.amount.toFixed(2)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>

        {/* Total Section */}
        <div className="flex justify-end" style={{padding: '0 48px', marginTop: '40px'}}>
            <div className='w-64'>
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t.subtotal}</span>
                      <span className="font-semibold">{currencySymbol}{subtotal.toFixed(2)}</span>
                    </div>
                    {hasVat && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t.vat} ({((vatRate || 0) * 100).toFixed(0)}%)</span>
                        <span className="font-semibold">{currencySymbol}{(vatAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className={cn('flex justify-between items-center py-4 px-6', styles.totalBgClass, styles.totalTextClass)}>
                    <span className="text-lg font-bold uppercase">{t.total}</span>
                    <span className="text-2xl font-bold">{currencySymbol}{total.toFixed(2)}</span>
                  </div>
                   {ronBreakdown && (
                     <div className="space-y-1 mt-2 text-sm text-gray-600 px-2">
                        <div className="flex justify-between"><span>{t.subtotalRon}</span><span className="font-semibold">{ronBreakdown.subtotal.toFixed(2)} RON</span></div>
                        {hasVat && <div className="flex justify-between"><span>{t.vatRon}</span><span className="font-semibold">{ronBreakdown.vat.toFixed(2)} RON</span></div>}
                        <div className="flex justify-between font-bold"><span>{t.totalRon}</span><span className='font-bold'>{ronBreakdown.total.toFixed(2)} RON</span></div>
                    </div>
                  )}
            </div>
        </div>
      </main>

      {/* Footer */}
      <footer className='mt-auto text-center text-xs text-gray-500 px-12 py-6 border-t-2 border-gray-200'>
        {invoice.exchangeRate && invoice.totalRon && invoice.currency !== 'RON' && invoice.exchangeRateDate ? (
            <p>
              {invoice.usedMaxExchangeRate
                ? t.footerMaxRate(formatDateWithOrdinal(invoice.exchangeRateDate), invoice.currency, invoice.exchangeRate)
                : t.footerExchange(formatDateWithOrdinal(invoice.exchangeRateDate), invoice.currency, invoice.exchangeRate)}
            </p>
        ) : (
          <p className='font-medium'>{t.footerThanks}</p>
        )}
      </footer>
    </div>
  );
}
