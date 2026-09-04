
'use server';
/**
 * @fileOverview A flow to get currency exchange rates from BNR.
 *
 * - getExchangeRate - A function that fetches the exchange rate for a given currency.
 * - GetExchangeRateInput - The input type for the getExchangeRate function.
 * - GetExchangeRateOutput - The return type for the getExchangeRate function.
 */

import { z } from 'zod';
import { parseStringPromise } from 'xml2js';

const GetExchangeRateInputSchema = z.object({
    currency: z.string().describe('The currency to get the exchange rate for (e.g., EUR, USD).'),
});
export type GetExchangeRateInput = z.infer<typeof GetExchangeRateInputSchema>;

const GetExchangeRateOutputSchema = z.object({
    rate: z.number().optional().describe('The exchange rate against RON.'),
    date: z.string().optional().describe('The date the exchange rate was published.'),
    error: z.string().optional().describe('An error message if fetching failed.'),
});
export type GetExchangeRateOutput = z.infer<typeof GetExchangeRateOutputSchema>;

async function fetchAndParseBNRXml(): Promise<{data: any, error: string | null}> {
    try {
        const response = await fetch('https://curs.bnr.ro/nbrfxrates.xml', { next: { revalidate: 3600 } });
        if (!response.ok) {
            return { data: null, error: `Failed to fetch from BNR. Status: ${response.status} ${response.statusText}` };
        }
        const xmlText = await response.text();
        const parsedXml = await parseStringPromise(xmlText);
        return { data: parsedXml, error: null };
    } catch (error: any) {
        console.error('Error fetching or parsing BNR XML:', error);
        return { data: null, error: `Could not connect to BNR. Please check your internet connection. (${error.message})` };
    }
}

export async function getExchangeRate(input: GetExchangeRateInput): Promise<GetExchangeRateOutput> {
    const { currency } = input;
    const today = new Date().toISOString().split('T')[0];

    if (currency.toUpperCase() === 'RON') {
        return { rate: 1, date: today };
    }

    const { data: bnrData, error: fetchError } = await fetchAndParseBNRXml();
    if (fetchError) {
        return { error: fetchError };
    }

    if (!bnrData) {
        return { error: 'BNR data is empty or malformed.' };
    }

    const cube = bnrData?.DataSet?.Body?.[0]?.Cube?.[0];
    const rates = cube?.Rate;
    const rateDate = cube?.$?.date;

    if (!rates) {
        return { error: 'Could not find rates in BNR data.' };
    }

    const currencyRate = rates.find((r: any) => r.$.currency === currency.toUpperCase());
    
    if (currencyRate) {
      const rateValue = parseFloat(currencyRate._);
      // Handle multiplier if present
      const multiplier = currencyRate.$.multiplier ? parseInt(currencyRate.$.multiplier, 10) : 1;
      return { rate: rateValue / multiplier, date: rateDate };
    }

    return { error: `Currency '${currency.toUpperCase()}' not found in BNR data.` };
}
