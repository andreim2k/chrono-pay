
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


  return (
    <div className="bg-white text-gray-900 p-12 font-mono" style={{ width: '800px', minHeight: '1131px', display: 'flex', flexDirection: 'column' }}>
      <main className="flex-grow">
        {/* Header */}
        <header className="flex justify-between items-start pb-8">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold tracking-wider text-gray-900" style={{ letterSpacing: '0.1em' }}>{companyName}</h1>
              <div className="text-sm text-gray-600 mt-4 space-y-2">
                  <p><span className="font-bold text-sm">{t.address}:</span> {companyAddress}</p>
                  {companyVat && <p><span className="font-bold text-sm">{lang === 'ro' ? 'CUI' : 'VAT'}:</span> {companyVat}</p>}
                  
                  <div className="pt-2">
                    {companyBankName && <p className="text-sm"><span className="font-bold text-sm">{t.bank}:</span> {companyBankName}</p>}
                    {companyIban && <p className="text-sm"><span className="font-bold text-sm">{t.iban}:</span> {companyIban}</p>}
                    {companySwift && <p className="text-sm"><span className="font-bold text-sm">{t.swift}:</span> {companySwift}</p>}
                  </div>
              </div>
            </div>
            <div className="text-right">
                <h2 className="text-4xl font-bold text-black uppercase tracking-widest">{t.invoice}</h2>
                <p className="mt-1 text-sm text-black"># {invoiceNumber}</p>
            </div>
        </header>

        {/* Client Info and Dates */}
        <div className="grid grid-cols-2 gap-8 mt-16 mb-16">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t.billedTo}</p>
            <p className="text-lg font-bold text-gray-800 mt-2">{clientName}</p>
            <p className="text-sm text-gray-600">{clientAddress}</p>
            {clientVat && <p className="text-sm text-gray-600">{t.vatId}: {clientVat}</p>}
          </div>
          <div className="text-right">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t.invoiceDate}</p>
                <p className="text-lg text-gray-800 mt-2">{formatDateWithOrdinal(date)}</p>
              </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-10">
            <table className="w-full text-left">
                <thead className='bg-gray-50'>
                    <tr>
                        <th className="py-3 px-4 text-left font-semibold text-gray-600 uppercase text-xs">{t.description}</th>
                        <th className="py-3 px-4 text-center w-32 font-semibold text-gray-600 uppercase text-xs">{t.quantity}</th>
                        <th className="py-3 px-4 text-center w-32 font-semibold text-gray-600 uppercase text-xs">{t.rate}</th>
                        <th className="py-3 px-4 text-right w-40 font-semibold text-gray-600 uppercase text-xs">{t.amount}</th>
                    </tr>
                </thead>
                <tbody className="text-gray-800 text-sm bg-gray-50/20">
                    {items.map((item, index) => {
                        const servicePeriod = format(new Date(item.description.split(' for ')[1]), lang === 'ro' ? 'LLLL yyyy' : 'MMMM yyyy', lang === 'ro' ? { locale: ro } : {});
                        const translatedDescription = t.consultancyServices(servicePeriod);

                        return (
                            <tr key={index} className="border-b border-gray-200">
                                <td className="py-4 px-4 text-left whitespace-nowrap">{translatedDescription}</td>
                                <td className="py-4 px-4 text-center">{item.quantity.toFixed(2)} {t.unit[item.unit as keyof typeof t.unit] || item.unit}</td>
                                <td className="py-4 px-4 text-center">{currencySymbol}{item.rate.toFixed(2)}</td>
                                <td className="py-4 px-4 text-right">{currencySymbol}{item.amount.toFixed(2)}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>

        {/* Total */}
        <div className="flex justify-end mt-8">
            <div className="w-full max-w-sm space-y-2 py-4">
                 {hasVat && (
                    <>
                        <div className="flex justify-between items-center text-md">
                            <p className='text-gray-600'>{t.subtotal}</p>
                            <p>{currencySymbol}{subtotal.toFixed(2)}</p>
                        </div>
                        <div className="flex justify-between items-center text-md">
                            <p className='text-gray-600'>{t.vat} ({((vatRate || 0) * 100).toFixed(0)}%)</p>
                            <p>{currencySymbol}{(vatAmount || 0).toFixed(2)}</p>
                        </div>
                    </>
                  )}
                <div className={`flex justify-between items-center text-2xl font-bold text-gray-900 ${hasVat ? 'border-t-2 border-gray-300 pt-2 mt-2' : ''}`}>
                    <p>{t.total}</p>
                    <p>{currencySymbol}{total.toFixed(2)}</p>
                </div>
                 {totalRon && currency !== 'RON' && (
                  <div className="flex justify-between items-center text-md font-medium text-gray-600 border-t border-dashed pt-2 mt-2">
                    <p>{t.totalRon}</p>
                    <p>RON {totalRon.toFixed(2)}</p>
                  </div>
                )}
            </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto pt-4 text-center text-xs text-gray-400 border-t border-gray-300">
        {invoice.exchangeRate && invoice.totalRon && invoice.currency !== 'RON' && invoice.exchangeRateDate ? (
            <p>
              {invoice.usedMaxExchangeRate
                ? t.footerMaxRate(formatDateWithOrdinal(invoice.exchangeRateDate), invoice.currency, invoice.exchangeRate)
                : t.footerExchange(formatDateWithOrdinal(invoice.exchangeRateDate), invoice.currency, invoice.exchangeRate)}
            </p>
        ) : (
          <p>{t.footerThanks}</p>
        )}
      </footer>
    </div>
  );
}

    