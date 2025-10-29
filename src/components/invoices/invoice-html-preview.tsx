
'use client';

import React from 'react';
import type { Invoice, InvoiceTheme } from '@/lib/types';
import { format, getDate } from 'date-fns';
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
        invoice: 'Invoice',
        billedTo: 'Billed To',
        vatId: 'VAT ID',
        invoiceDate: 'Invoice Date',
        description: 'Description',
        quantity: 'Quantity',
        rate: 'Rate',
        amount: 'Amount',
        subtotal: 'Subtotal',
        vat: 'VAT',
        total: 'Total',
        totalRon: 'Total (RON)',
        footerExchange: (date: string, currency: string, rate: number) => `Exchange rate from BNR for ${date}: 1 ${currency} = ${rate.toFixed(4)} RON.`,
        footerMaxRate: (date: string, currency: string, rate: number) => `Using fixed client exchange rate set on ${date}: 1 ${currency} = ${rate.toFixed(4)} RON.`,
        footerThanks: 'Thank you for your business!',
        consultancyServices: (period: string, quantity: string) => `IT Consultancy services for period ${period} (${quantity})`,
        consultancyServicesDays: (period: string) => `IT Consultancy services for period ${period}`,
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
        invoice: 'Factură',
        billedTo: 'Facturat către',
        vatId: 'CUI/CIF',
        invoiceDate: 'Data facturii',
        description: 'Descriere',
        quantity: 'Cantitate',
        rate: 'Preț Unitar',
        amount: 'Valoare',
        subtotal: 'Subtotal',
        vat: 'TVA',
        total: 'Total',
        totalRon: 'Total (RON)',
        footerExchange: (date: string, currency: string, rate: number) => `Curs valutar BNR pentru ${date}: 1 ${currency} = ${rate.toFixed(4)} RON.`,
        footerMaxRate: (date: string, currency: string, rate: number) => `Folosind cursul fix al clientului setat la data de ${date}: 1 ${currency} = ${rate.toFixed(4)} RON.`,
        footerThanks: 'Vă mulțumim!',
        consultancyServices: (period: string, quantity: string) => `Servicii de consultanță IT pentru perioada ${period} (${quantity})`,
        consultancyServicesDays: (period: string) => `Servicii de consultanță IT pentru perioada ${period}`,
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

// Professional theme styles inspired by InvoiceHome templates
// All themes use the same Modern layout with different colors
export const themeStyles: { [key in InvoiceTheme]: {
  layout: 'modern' | 'classic' | 'minimal' | 'elegant' | 'bold';
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    accentClass: 'border-emerald-500',
    headerTextClass: 'text-emerald-500',
    tableHeaderBgClass: 'bg-emerald-500',
    tableHeaderTextClass: 'text-white',
    totalBgClass: 'bg-emerald-500',
    totalTextClass: 'text-white',
    accentColor: '#10B981',
    tableHeaderBgColor: '#10B981',
    secondaryBg: '#ECFDF5'
  },
  'Lime': {
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    layout: 'modern',
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
    companyName, companyAddress, companyVat, companyEmail, companyPhone, invoiceNumber, clientName,
    clientAddress, clientVat, date, items, currency, subtotal, vatAmount, total,
    companyBankName, companyIban, companySwift, language, vatRate, totalRon,
    theme = 'Classic'
  } = invoice;

  const styles = themeStyles[theme];
  
  const lang = language === 'Romanian' ? 'ro' : 'en';
  const t = translations[lang];
  const hasVat = vatAmount !== undefined && vatAmount > 0;

  const currencySymbols: { [key:string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    RON: 'RON'
  };
  const currencySymbol = currencySymbols[currency] || currency;

  const formatDateWithOrdinal = (dateString: string | undefined) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const adjustedDate = new Date(d.valueOf() + d.getTimezoneOffset() * 60 * 1000);
    const dayWithOrdinal = getDayWithOrdinal(adjustedDate, lang);
    const monthYearFormat = lang === 'ro' ? 'LLLL, yyyy' : 'MMMM, yyyy';
    const locale = lang === 'ro' ? { locale: ro } : {};

    if (lang === 'ro') {
        return `${dayWithOrdinal} ${format(adjustedDate, monthYearFormat, locale)}`;
    }
    return `${dayWithOrdinal} of ${format(adjustedDate, monthYearFormat, locale)}`;
  }

  const translateDescription = (item: Invoice['items'][0]) => {
      const { description, quantity, unit } = item;
      if (lang === 'en') return description;

      // Regex for hourly billing
      const hourlyRegex = /IT Consultancy services for period ([\d\.]+\s*-\s*[\d\.]+) \(([\d\.]+)\s+(hours)\)/;
      const hourlyMatch = description.match(hourlyRegex);

      if (hourlyMatch) {
          const [, period, , matchedUnit] = hourlyMatch;
          const translatedUnit = t.unit[matchedUnit as keyof typeof t.unit] || matchedUnit;
          const quantityText = `${quantity.toFixed(2)} ${translatedUnit}`;
          return t.consultancyServices(period, quantityText);
      }

      // Regex for daily billing (no quantity in description)
      const dailyRegex = /IT Consultancy services for period ([\d\.]+\s*-\s*[\d\.]+)/;
      const dailyMatch = description.match(dailyRegex);

      if (dailyMatch) {
          const [, period] = dailyMatch;
          return t.consultancyServicesDays(period);
      }

      return description; // Fallback
  };


  // Get layout-specific styling
  const getLayoutStyles = () => {
    const baseStyles = { width: '794px', minHeight: '1123px', display: 'flex', flexDirection: 'column' as const };

    switch (styles.layout) {
      case 'modern':
        return { ...baseStyles, padding: '0px', fontFamily: styles.fontFamily };
      case 'bold':
        return { ...baseStyles, padding: '0px', fontFamily: styles.fontFamily };
      default: // classic, elegant, minimal
        return { ...baseStyles, padding: '60px', fontFamily: styles.fontFamily };
    }
  };

  return (
    <div className="bg-white text-gray-900" style={getLayoutStyles()}>
      <main className="flex-grow" style={styles.layout === 'modern' || styles.layout === 'bold' ? {} : {paddingLeft: '0px', paddingRight: '0px'}}>
        {/* Header - Layout varies by theme */}
        {styles.layout === 'modern' && (
          <div className={cn('px-12 py-8', styles.tableHeaderBgClass, styles.tableHeaderTextClass)}>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold" style={{ letterSpacing: '-0.01em' }}>{companyName}</h1>
                <div className="text-sm mt-2 opacity-90 space-y-px">
                  <p>{companyAddress}</p>
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
        )}

        {styles.layout === 'bold' && (
          <div className={cn('p-10', styles.tableHeaderBgClass, styles.tableHeaderTextClass)}>
            <div className="flex justify-between items-center">
              <h1 className="text-5xl font-black uppercase" style={{ letterSpacing: '-0.02em' }}>{t.invoice}</h1>
              <div className="text-right">
                <p className="text-4xl font-black">#{invoiceNumber}</p>
                <p className="text-sm mt-1 opacity-90">{formatDateWithOrdinal(date)}</p>
              </div>
            </div>
          </div>
        )}

        {(styles.layout === 'classic' || styles.layout === 'elegant' || styles.layout === 'minimal') && (
          <div className={cn(styles.layout === 'minimal' ? '' : 'border-b-2 pb-6 mb-8', styles.layout === 'elegant' ? 'text-center' : '', styles.accentClass)}>
            {styles.layout === 'elegant' ? (
              <>
                <h1 className="text-4xl font-bold text-gray-900 mb-2" style={{ letterSpacing: '0.05em' }}>{companyName}</h1>
                <div className={cn('inline-block h-1 w-32 mb-4', styles.tableHeaderBgClass)}></div>
                <div className="text-xs text-gray-600">
                  <p>{companyAddress}</p>
                  {companyVat && <p className="mt-1">{lang === 'ro' ? 'CUI' : 'VAT'}: {companyVat}</p>}
                </div>
              </>
            ) : (
              <div className={cn('flex justify-between items-start', styles.layout === 'minimal' ? 'mb-12' : '')}>
                <div>
                  <h1 className={cn('font-bold text-gray-900', styles.layout === 'minimal' ? 'text-2xl' : 'text-3xl')}>{companyName}</h1>
                  <div className={cn('text-gray-600 mt-3 space-y-0.5', styles.layout === 'minimal' ? 'text-xs' : 'text-xs')}>
                    <p>{companyAddress}</p>
                    {companyPhone && <p>{t.phone}: {companyPhone}</p>}
                    {companyEmail && <p>{t.email}: {companyEmail}</p>}
                    {companyVat && <p>{lang === 'ro' ? 'CUI' : 'VAT'}: {companyVat}</p>}
                  </div>
                </div>
                <div className="text-right">
                  {styles.layout === 'minimal' ? (
                    <div className={cn('inline-block px-6 py-3', styles.tableHeaderBgClass, styles.tableHeaderTextClass)}>
                      <p className="text-xs uppercase tracking-wider">{t.invoice}</p>
                      <p className="text-xl font-bold mt-1">#{invoiceNumber}</p>
                    </div>
                  ) : (
                    <>
                      <h2 className={cn('text-2xl font-bold uppercase', styles.headerTextClass)} style={{ letterSpacing: '0.15em' }}>{t.invoice}</h2>
                      <p className="mt-1 text-sm text-gray-700"># {invoiceNumber}</p>
                      <p className="mt-2 text-xs text-gray-600">{formatDateWithOrdinal(date)}</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Client Info Section - varies by layout */}
        <div style={{padding: styles.layout === 'modern' || styles.layout === 'bold' ? '0 48px' : '0'}}>
          {styles.layout === 'classic' && (
            <>
              <div className="mb-8">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{t.billedTo}</p>
                <div className={cn('p-4 border-l-3', styles.accentClass)} style={{ borderLeftWidth: '3px' }}>
                  <p className="font-bold text-base text-gray-900">{clientName}</p>
                  <p className="text-sm text-gray-600 mt-1">{clientAddress}</p>
                  {clientVat && <p className="text-sm text-gray-600">{t.vatId}: {clientVat}</p>}
                  {invoice.projectName && <p className="text-sm text-gray-700 mt-2 italic">Project: {invoice.projectName}</p>}
                </div>
              </div>
              {companyBankName && (
                <div className="mb-8 text-xs text-gray-600">
                  <p><span className="font-semibold">{t.bank}:</span> {companyBankName}</p>
                  {companyIban && <p><span className="font-semibold">{t.iban}:</span> {companyIban}</p>}
                  {companySwift && <p><span className="font-semibold">{t.swift}:</span> {companySwift}</p>}
                </div>
              )}
            </>
          )}

          {styles.layout === 'elegant' && (
            <div className="flex justify-between items-start mb-10">
              <div className={cn('flex-1 border-l-4 pl-4', styles.accentClass)}>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2" style={{ letterSpacing: '0.1em' }}>{t.billedTo}</p>
                <p className="text-lg font-semibold text-gray-900">{clientName}</p>
                <p className="text-sm text-gray-600 mt-1">{clientAddress}</p>
                {clientVat && <p className="text-sm text-gray-600">{t.vatId}: {clientVat}</p>}
                {invoice.projectName && <p className="text-sm text-gray-700 mt-2 italic">{invoice.projectName}</p>}
              </div>
              <div className="text-right ml-8">
                <h2 className={cn('text-3xl font-bold', styles.headerTextClass)} style={{ letterSpacing: '0.05em' }}>{t.invoice}</h2>
                <p className="text-gray-700 mt-2 text-sm">#{invoiceNumber}</p>
                <p className="text-xs text-gray-500 mt-3">{formatDateWithOrdinal(date)}</p>
                {companyBankName && (
                  <div className="mt-6 text-xs text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-700">{t.bank}</p>
                    <p>{companyBankName}</p>
                    {companyIban && <p className="font-mono text-xs">{companyIban}</p>}
                    {companySwift && <p>{t.swift}: {companySwift}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {styles.layout === 'minimal' && (
            <div className="flex justify-between mb-12">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t.billedTo}</p>
                <p className="font-bold text-gray-900">{clientName}</p>
                <p className="text-sm text-gray-600">{clientAddress}</p>
                {clientVat && <p className="text-sm text-gray-600">{t.vatId}: {clientVat}</p>}
                {invoice.projectName && <p className="text-sm text-gray-700 mt-1">{invoice.projectName}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{t.invoiceDate}</p>
                <p className="text-sm text-gray-700">{formatDateWithOrdinal(date)}</p>
                {companyBankName && (
                  <div className="mt-4 text-xs text-gray-600 text-left">
                    <p>{companyBankName}</p>
                    {companyIban && <p className="mt-1 font-mono">{companyIban}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {(styles.layout === 'modern' || styles.layout === 'bold') && (
            <div className="grid grid-cols-2 gap-6 mb-10 mt-8">
              <div style={{ backgroundColor: styles.secondaryBg }} className={cn('p-6', styles.layout === 'modern' ? 'rounded' : '')}>
                <p className={cn('text-xs font-bold uppercase mb-3', styles.headerTextClass)}>{t.billedTo}</p>
                <p className={cn('font-bold text-gray-900', styles.layout === 'bold' ? 'text-2xl mb-2' : '')}>{clientName}</p>
                <p className={cn('text-gray-600 mt-1', styles.layout === 'bold' ? 'text-sm space-y-0.5' : 'text-sm')}>{clientAddress}</p>
                {clientVat && <p className="text-sm text-gray-600">{t.vatId}: {clientVat}</p>}
                {invoice.projectName && <p className={cn('text-gray-700', styles.layout === 'bold' ? 'mt-2 font-semibold' : 'mt-2')}><span className={styles.layout === 'bold' ? '' : 'font-semibold'}>Project:</span> {invoice.projectName}</p>}
              </div>
              <div style={{ backgroundColor: styles.secondaryBg }} className={cn('p-6', styles.layout === 'modern' ? 'rounded' : '')}>
                <p className={cn('text-xs font-bold uppercase mb-3', styles.headerTextClass)}>{t.invoiceDate}</p>
                <p className="text-gray-800">{formatDateWithOrdinal(date)}</p>
                <div className="mt-4 pt-4 border-t border-gray-300 space-y-1 text-xs text-gray-600">
                  {companyBankName && <p><span className={styles.layout === 'bold' ? 'font-semibold' : 'font-semibold'}>{t.bank}:</span> {companyBankName}</p>}
                  {companyIban && <p className={styles.layout === 'bold' ? 'font-mono' : 'font-mono'}><span className="font-semibold">{t.iban}:</span> {companyIban}</p>}
                  {companySwift && <p><span className="font-semibold">{t.swift}:</span> {companySwift}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Items Table - varies by layout */}
        <div style={{padding: styles.layout === 'modern' || styles.layout === 'bold' ? '0 48px' : '0'}} className={styles.layout === 'minimal' ? '' : 'mt-8 mb-8'}>
            <table className="w-full">
                <thead>
                    <tr className={cn(
                      styles.layout === 'classic' ? 'border-b-2 border-gray-300' : '',
                      styles.layout === 'minimal' ? 'border-b border-gray-300' : '',
                      styles.layout === 'elegant' ? `border-y-2 border-gray-400` : '',
                      (styles.layout === 'modern' || styles.layout === 'bold') ? cn(styles.tableHeaderBgClass, styles.tableHeaderTextClass) : ''
                    )}>
                        <th className={cn(
                          'text-left font-semibold uppercase text-xs',
                          styles.layout === 'classic' || styles.layout === 'elegant' ? 'py-3 px-2 text-gray-700' : '',
                          styles.layout === 'minimal' ? 'py-4 text-gray-500' : '',
                          (styles.layout === 'modern' || styles.layout === 'bold') ? 'py-3 px-4' : '',
                          styles.layout === 'elegant' ? 'tracking-widest' : 'tracking-wider'
                        )}>{t.description}</th>
                        <th className={cn(
                          'text-center font-semibold uppercase text-xs',
                          styles.layout === 'classic' ? 'w-20 py-3 px-2 text-gray-700' : '',
                          styles.layout === 'minimal' ? 'w-24 py-4 text-right text-gray-500' : '',
                          styles.layout === 'elegant' ? 'w-24 py-4 text-gray-700 tracking-widest' : '',
                          (styles.layout === 'modern' || styles.layout === 'bold') ? 'w-24 py-3 px-4' : '',
                          styles.layout === 'minimal' ? 'text-right' : 'text-center'
                        )}>{t.quantity}</th>
                        <th className={cn(
                          'text-center font-semibold uppercase text-xs',
                          styles.layout === 'classic' ? 'w-24 py-3 px-2 text-gray-700' : '',
                          styles.layout === 'minimal' ? 'w-28 py-4 text-right text-gray-500' : '',
                          styles.layout === 'elegant' ? 'w-28 py-4 text-gray-700 tracking-widest' : '',
                          (styles.layout === 'modern' || styles.layout === 'bold') ? 'w-28 py-3 px-4' : '',
                          styles.layout === 'minimal' ? 'text-right' : 'text-center'
                        )}>{t.rate}</th>
                        <th className={cn(
                          'text-right font-semibold uppercase text-xs',
                          styles.layout === 'classic' ? 'w-28 py-3 px-2 text-gray-700' : '',
                          styles.layout === 'minimal' ? 'w-32 py-4 text-gray-500' : '',
                          styles.layout === 'elegant' ? 'w-32 py-4 text-gray-700 tracking-widest' : '',
                          (styles.layout === 'modern' || styles.layout === 'bold') ? 'w-32 py-3 px-4' : ''
                        )}>{t.amount}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => {
                        const translatedDescription = translateDescription(item);
                        const rowClass = styles.layout === 'classic' || styles.layout === 'elegant' || styles.layout === 'minimal'
                          ? 'border-b border-gray-200'
                          : (styles.layout === 'bold' ? 'border-b-2 border-gray-200' : (index % 2 === 0 ? 'bg-gray-50' : 'bg-white'));

                        return (
                            <tr key={index} className={rowClass}>
                                <td className={cn(
                                  'text-sm text-gray-800',
                                  styles.layout === 'classic' || styles.layout === 'elegant' ? 'py-3 px-2' : '',
                                  styles.layout === 'minimal' ? 'py-4' : '',
                                  (styles.layout === 'modern' || styles.layout === 'bold') ? 'py-3 px-4' : '',
                                  styles.layout === 'bold' ? 'font-medium' : ''
                                )}>{translatedDescription}</td>
                                <td className={cn(
                                  'text-sm text-gray-700',
                                  styles.layout === 'classic' || styles.layout === 'elegant' ? 'py-3 px-2 text-center' : '',
                                  styles.layout === 'minimal' ? 'py-4 text-right text-gray-600' : '',
                                  (styles.layout === 'modern' || styles.layout === 'bold') ? 'py-3 px-4 text-center' : ''
                                )}>{item.quantity.toFixed(2)} {t.unit[item.unit as keyof typeof t.unit] || item.unit}</td>
                                <td className={cn(
                                  'text-sm text-gray-700',
                                  styles.layout === 'classic' || styles.layout === 'elegant' ? 'py-3 px-2 text-center' : '',
                                  styles.layout === 'minimal' ? 'py-4 text-right text-gray-600' : '',
                                  (styles.layout === 'modern' || styles.layout === 'bold') ? 'py-3 px-4 text-center' : ''
                                )}>{currencySymbol}{item.rate.toFixed(2)}</td>
                                <td className={cn(
                                  'text-sm text-gray-900',
                                  styles.layout === 'classic' || styles.layout === 'minimal' ? 'font-semibold' : '',
                                  styles.layout === 'elegant' ? 'text-base font-semibold' : '',
                                  styles.layout === 'bold' ? 'text-base font-bold' : '',
                                  styles.layout === 'classic' || styles.layout === 'elegant' ? 'py-3 px-2 text-right' : '',
                                  styles.layout === 'minimal' ? 'py-4 text-right' : '',
                                  (styles.layout === 'modern' || styles.layout === 'bold') ? 'py-3 px-4 text-right' : ''
                                )}>{currencySymbol}{item.amount.toFixed(2)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>

        {/* Total Section - varies by layout */}
        <div className="flex justify-end" style={{padding: styles.layout === 'modern' || styles.layout === 'bold' ? '0 48px' : '0', marginTop: styles.layout === 'elegant' ? '48px' : styles.layout === 'minimal' ? '32px' : '40px'}}>
            <div className={styles.layout === 'bold' ? 'w-96' : styles.layout === 'minimal' ? 'w-80' : styles.layout === 'elegant' ? 'w-80' : 'w-64'}>
              {/* Classic & Minimal layout */}
              {(styles.layout === 'classic' || styles.layout === 'minimal') && (
                <>
                  {hasVat && (
                    <>
                      <div className="flex justify-between py-2 text-sm">
                        <span className="text-gray-600">{t.subtotal}</span>
                        <span className={styles.layout === 'classic' ? 'font-semibold' : ''}>{currencySymbol}{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-2 text-sm">
                        <span className="text-gray-600">{t.vat} ({((vatRate || 0) * 100).toFixed(0)}%)</span>
                        <span className={styles.layout === 'classic' ? 'font-semibold' : ''}>{currencySymbol}{(vatAmount || 0).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className={cn('flex justify-between items-center py-3 px-4 mt-2', styles.layout === 'classic' ? 'text-base font-bold' : '', styles.layout === 'minimal' ? 'border-t-2 border-gray-300 pt-3 text-lg' : '', styles.tableHeaderBgClass, styles.tableHeaderTextClass)}>
                    <span className={cn('uppercase', styles.layout === 'minimal' ? 'font-bold text-gray-900' : '')}>{t.total}</span>
                    <span className={cn(styles.layout === 'minimal' ? 'text-2xl font-bold text-gray-900' : 'text-lg')}>{currencySymbol}{total.toFixed(2)}</span>
                  </div>
                  {totalRon && currency !== 'RON' && (
                    <div className="flex justify-between py-2 px-2 text-sm text-gray-600 mt-2">
                      <span>{t.totalRon}</span>
                      <span className={styles.layout === 'minimal' ? '' : 'font-semibold'}>{styles.layout === 'minimal' ? '' : 'RON '}{totalRon.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}

              {/* Elegant layout */}
              {styles.layout === 'elegant' && (
                <>
                  {hasVat && (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t.subtotal}</span>
                        <span className="font-semibold text-gray-800">{currencySymbol}{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t.vat} ({((vatRate || 0) * 100).toFixed(0)}%)</span>
                        <span className="font-semibold text-gray-800">{currencySymbol}{(vatAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  <div className={cn('border-t-2 pt-4', styles.accentClass)}>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-900 uppercase" style={{ letterSpacing: '0.05em' }}>{t.total}</span>
                      <span className="text-3xl font-bold text-gray-900">{currencySymbol}{total.toFixed(2)}</span>
                    </div>
                  </div>
                  {totalRon && currency !== 'RON' && (
                    <div className="flex justify-between pt-3 text-sm text-gray-600">
                      <span>{t.totalRon}</span>
                      <span className="font-semibold">RON {totalRon.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}

              {/* Modern layout */}
              {styles.layout === 'modern' && (
                <>
                  {hasVat && (
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t.subtotal}</span>
                        <span className="font-semibold">{currencySymbol}{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t.vat} ({((vatRate || 0) * 100).toFixed(0)}%)</span>
                        <span className="font-semibold">{currencySymbol}{(vatAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  <div className={cn('flex justify-between items-center py-4 px-6', styles.totalBgClass, styles.totalTextClass)}>
                    <span className="text-lg font-bold uppercase">{t.total}</span>
                    <span className="text-2xl font-bold">{currencySymbol}{total.toFixed(2)}</span>
                  </div>
                  {totalRon && currency !== 'RON' && (
                    <div className="flex justify-between py-2 px-2 text-sm text-gray-600 mt-2">
                      <span>{t.totalRon}</span>
                      <span className="font-semibold">RON {totalRon.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}

              {/* Bold layout */}
              {styles.layout === 'bold' && (
                <>
                  {hasVat && (
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-base font-semibold">
                        <span className="text-gray-600">{t.subtotal}</span>
                        <span className="text-gray-900">{currencySymbol}{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold">
                        <span className="text-gray-600">{t.vat} ({((vatRate || 0) * 100).toFixed(0)}%)</span>
                        <span className="text-gray-900">{currencySymbol}{(vatAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  <div className={cn('py-6 px-8', styles.totalBgClass, styles.totalTextClass)}>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-black uppercase">{t.total}</span>
                      <span className="text-4xl font-black">{currencySymbol}{total.toFixed(2)}</span>
                    </div>
                  </div>
                  {totalRon && currency !== 'RON' && (
                    <div className="flex justify-between py-3 px-4 text-base font-semibold text-gray-600 mt-2">
                      <span>{t.totalRon}</span>
                      <span>RON {totalRon.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
        </div>
      </main>

      {/* Footer - varies by layout */}
      <footer className={cn(
        'mt-auto text-center text-xs text-gray-500',
        styles.layout === 'modern' || styles.layout === 'bold' ? 'px-12 py-6 border-t-2 border-gray-200' : 'pt-6 border-t border-gray-200',
        styles.layout === 'elegant' ? 'pt-8' : 'pt-6'
      )}>
        {invoice.exchangeRate && invoice.totalRon && invoice.currency !== 'RON' && invoice.exchangeRateDate ? (
            <p className={cn(styles.layout === 'elegant' ? 'italic' : '', styles.layout === 'bold' ? 'font-semibold' : '')}>
              {invoice.usedMaxExchangeRate
                ? t.footerMaxRate(formatDateWithOrdinal(invoice.exchangeRateDate), invoice.currency, invoice.exchangeRate)
                : t.footerExchange(formatDateWithOrdinal(invoice.exchangeRateDate), invoice.currency, invoice.exchangeRate)}
            </p>
        ) : (
          <p className={cn(styles.layout === 'elegant' ? 'italic' : 'font-medium', styles.layout === 'bold' ? 'font-semibold' : '')}>{t.footerThanks}</p>
        )}
      </footer>
    </div>
  );
}
