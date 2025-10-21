
'use client';

import React from 'react';
import type { Invoice } from '@/lib/types';
import { format, getDate } from 'date-fns';
import { ro } from 'date-fns/locale';


interface InvoiceHtmlPreviewProps {
  invoice: Omit<Invoice, 'id'>;
}

const translations = {
    en: {
        address: 'Address',
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
        consultancyServices: (period: string) => `Consultancy services for ${period}`,
        unit: {
            days: 'days',
        }
    },
    ro: {
        address: 'Adresă',
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
        consultancyServices: (period: string) => `Servicii de consultanță pentru ${period}`,
        unit: {
            days: 'zile',
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


export function InvoiceHtmlPreview({ invoice }: InvoiceHtmlPreviewProps) {
  const {
    companyName, companyAddress, companyVat, invoiceNumber, clientName,
    clientAddress, clientVat, date, items, currency, subtotal, vatAmount, total,
    companyBankName, companyIban, companySwift, language, vatRate, totalRon
  } = invoice;
  
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

  const translateDescription = (description: string) => {
    if (lang === 'en') return description;

    // Example: "ProjectX: Consultancy services for MMMM yyyy"
    const parts = description.split(': Consultancy services for ');
    if (parts.length === 2) {
      const projectName = parts[0];
      const datePart = parts[1];
      const servicePeriod = format(new Date(datePart), 'LLLL yyyy', { locale: ro });
      return `${projectName}: ${t.consultancyServices(servicePeriod)}`;
    }
    return description; // fallback
  }


  return (
    <div className="bg-white text-gray-900 font-sans" style={{ width: '794px', minHeight: '1123px', display: 'flex', flexDirection: 'column', padding: '60px' }}>
      <main className="flex-grow">
        {/* Header with colored accent bar */}
        <div className="border-b-4 border-blue-600 pb-6 mb-8">
          <header className="flex justify-between items-start">
              <div className="flex flex-col">
                <h1 className="text-4xl font-bold text-gray-900 mb-1" style={{ letterSpacing: '-0.02em' }}>{companyName}</h1>
                <div className="text-sm text-gray-600 mt-4 space-y-1 leading-relaxed">
                    <p className="text-gray-700">{companyAddress}</p>
                    {companyVat && <p className="text-gray-700">{lang === 'ro' ? 'CUI' : 'VAT'}: {companyVat}</p>}
                </div>
              </div>
              <div className="text-right">
                  <h2 className="text-5xl font-bold text-blue-600 uppercase" style={{ letterSpacing: '0.05em' }}>{t.invoice}</h2>
                  <p className="mt-2 text-lg font-semibold text-gray-700">#{invoiceNumber}</p>
              </div>
          </header>
        </div>

        {/* Client Info and Dates - Side by Side Cards */}
        <div className="grid grid-cols-2 gap-6 mb-10">
          <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-blue-600">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">{t.billedTo}</p>
            <p className="text-lg font-bold text-gray-900 mb-1">{clientName}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{clientAddress}</p>
            {clientVat && <p className="text-sm text-gray-600 mt-1">{t.vatId}: {clientVat}</p>}
            {invoice.projectName && <p className="text-sm text-gray-600 mt-2">Project: <span className="font-medium">{invoice.projectName}</span></p>}
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-blue-600">
              <div className="mb-4">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">{t.invoiceDate}</p>
                <p className="text-base text-gray-800 font-medium">{formatDateWithOrdinal(date)}</p>
              </div>
              {companyBankName && (
                <div className="pt-3 border-t border-gray-200 space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{t.bank}</p>
                  <p className="text-xs text-gray-700 font-medium">{companyBankName}</p>
                  {companyIban && <p className="text-xs text-gray-600"><span className="font-semibold">{t.iban}:</span> {companyIban}</p>}
                  {companySwift && <p className="text-xs text-gray-600"><span className="font-semibold">{t.swift}:</span> {companySwift}</p>}
                </div>
              )}
          </div>
        </div>

        {/* Items Table - Professional Design */}
        <div className="mt-8 mb-8">
            <table className="w-full">
                <thead>
                    <tr className="bg-blue-600 text-white">
                        <th className="py-4 px-4 text-left font-semibold uppercase text-xs tracking-wider">{t.description}</th>
                        <th className="py-4 px-4 text-center w-24 font-semibold uppercase text-xs tracking-wider">{t.quantity}</th>
                        <th className="py-4 px-4 text-center w-32 font-semibold uppercase text-xs tracking-wider">{t.rate}</th>
                        <th className="py-4 px-4 text-right w-32 font-semibold uppercase text-xs tracking-wider">{t.amount}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => {
                        const translatedDescription = translateDescription(item.description);

                        return (
                            <tr key={index} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                                <td className="py-4 px-4 text-sm text-gray-800">{translatedDescription}</td>
                                <td className="py-4 px-4 text-center text-sm text-gray-700">{item.quantity.toFixed(2)} {t.unit[item.unit as keyof typeof t.unit] || item.unit}</td>
                                <td className="py-4 px-4 text-center text-sm text-gray-700">{currencySymbol}{item.rate.toFixed(2)}</td>
                                <td className="py-4 px-4 text-right text-sm font-semibold text-gray-900">{currencySymbol}{item.amount.toFixed(2)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>

        {/* Total Section - Enhanced Design */}
        <div className="flex justify-end mt-10">
            <div className="w-80">
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  {hasVat && (
                      <>
                          <div className="flex justify-between items-center py-2">
                              <p className='text-sm font-medium text-gray-600'>{t.subtotal}</p>
                              <p className="text-base font-semibold text-gray-800">{currencySymbol}{subtotal.toFixed(2)}</p>
                          </div>
                          <div className="flex justify-between items-center py-2">
                              <p className='text-sm font-medium text-gray-600'>{t.vat} ({((vatRate || 0) * 100).toFixed(0)}%)</p>
                              <p className="text-base font-semibold text-gray-800">{currencySymbol}{(vatAmount || 0).toFixed(2)}</p>
                          </div>
                          <div className="border-t border-gray-300 my-3"></div>
                      </>
                    )}
                  <div className="flex justify-between items-center py-2 bg-blue-600 -mx-6 -mb-6 px-6 pb-6 pt-4 rounded-b-lg">
                      <p className="text-base font-bold text-white uppercase tracking-wide">{t.total}</p>
                      <p className="text-2xl font-bold text-white">{currencySymbol}{total.toFixed(2)}</p>
                  </div>
                   {totalRon && currency !== 'RON' && (
                    <div className="flex justify-between items-center pt-4 px-2">
                      <p className="text-sm font-medium text-gray-600">{t.totalRon}</p>
                      <p className="text-base font-semibold text-gray-800">RON {totalRon.toFixed(2)}</p>
                    </div>
                  )}
                </div>
            </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto pt-8 text-center text-xs text-gray-500 border-t border-gray-200">
        {invoice.exchangeRate && invoice.totalRon && invoice.currency !== 'RON' && invoice.exchangeRateDate ? (
            <p className="leading-relaxed">
              {invoice.usedMaxExchangeRate
                ? t.footerMaxRate(formatDateWithOrdinal(invoice.exchangeRateDate), invoice.currency, invoice.exchangeRate)
                : t.footerExchange(formatDateWithOrdinal(invoice.exchangeRateDate), invoice.currency, invoice.exchangeRate)}
            </p>
        ) : (
          <p className="font-medium text-gray-600">{t.footerThanks}</p>
        )}
      </footer>
    </div>
  );
}
