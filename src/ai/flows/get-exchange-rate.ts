
'use server';
/**
 * @fileOverview A flow to get currency exchange rates from BNR.
 *
 * - getExchangeRate - A function that fetches the exchange rate for a given currency.
 * - GetExchangeRateInput - The input type for the getExchangeRate function.
 * - GetExchangeRateOutput - The return type for the getExchangeRate function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {parseStringPromise} from 'xml2js';

const GetExchangeRateInputSchema = z.object({
    currency: z.string().describe('The currency to get the exchange rate for (e.g., EUR, USD).'),
});
export type GetExchangeRateInput = z.infer<typeof GetExchangeRateInputSchema>;

const GetExchangeRateOutputSchema = z.object({
    rate: z.number().optional().describe('The exchange rate against RON.'),
    date: z.string().optional().describe('The date the exchange rate was published.'),
});
export type GetExchangeRateOutput = z.infer<typeof GetExchangeRateOutputSchema>;

async function fetchAndParseBNRXml() {
    try {
        const response = await fetch('https://www.bnr.ro/nbrfxrates.xml');
        if (!response.ok) {
            throw new Error(`Failed to fetch BNR data: ${response.statusText}`);
        }
        const xmlText = await response.text();
        const parsedXml = await parseStringPromise(xmlText);
        return parsedXml;
    } catch (error) {
        console.error('Error fetching or parsing BNR XML:', error);
        return null;
    }
}


export async function getExchangeRate(input: GetExchangeRateInput): Promise<GetExchangeRateOutput> {
  return getExchangeRateFlow(input);
}


const getExchangeRateFlow = ai.defineFlow(
  {
    name: 'getExchangeRateFlow',
    inputSchema: GetExchangeRateInputSchema,
    outputSchema: GetExchangeRateOutputSchema,
  },
  async ({ currency }) => {
    const today = new Date().toISOString().split('T')[0];

    if (currency.toUpperCase() === 'RON') {
        return { rate: 1, date: today };
    }

    const bnrData = await fetchAndParseBNRXml();
    if (!bnrData) {
        return { rate: undefined, date: undefined };
    }

    const cube = bnrData?.DataSet?.Body?.[0]?.Cube?.[0];
    const rates = cube?.Rate;
    const rateDate = cube?.$?.date;

    if (!rates) {
        return { rate: undefined, date: undefined };
    }

    const currencyRate = rates.find((r: any) => r.$.currency === currency.toUpperCase());
    
    if (currencyRate) {
      const rateValue = parseFloat(currencyRate._);
      // Handle multiplier if present
      const multiplier = currencyRate.$.multiplier ? parseInt(currencyRate.$.multiplier, 10) : 1;
      return { rate: rateValue / multiplier, date: rateDate };
    }

    return { rate: undefined, date: undefined };
  }
);
