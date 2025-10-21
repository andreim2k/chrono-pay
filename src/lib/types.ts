

export type Client = {
  id: string;
  name: string;
  address: string;
  vat: string;
  iban: string;
  logoUrl?: string;
  currency?: string;
  bankName?: string;
  swift?: string;
  invoiceNumberPrefix?: string;
  hasVat?: boolean;
  maxExchangeRate?: number;
  maxExchangeRateDate?: string;
d.ts
  language?: 'English' | 'Romanian';
  vatRate?: number;
};

export type Project = {
  id:string;
  name: string;
  clientId: string;
  clientName: string;
  invoiceTheme?: InvoiceTheme;
};

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'Admin' | 'Member';
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  companyName: string;
  companyAddress: string;
  companyVat: string;
  companyIban?: string;
  companyBankName?: string;
  companySwift?: string;
  clientName: string;
  clientAddress: string;
  clientVat: string;
  projectId: string;
  projectName: string;
  date: string;
  currency: string;
  language?: 'English' | 'Romanian';
  items: {
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  vatAmount?: number;
  vatRate?: number;
  total: number;
  status: 'Created' | 'Sent' | 'Paid';
  totalRon?: number;
  exchangeRate?: number;
  exchangeRateDate?: string;
  usedMaxExchangeRate?: boolean;
  theme?: InvoiceTheme;
};

export type InvoiceTheme = 'Classic' | 'Modern' | 'Sunset' | 'Ocean' | 'Monochrome' | 'Minty' | 'Velvet' | 'Corporate Blue' | 'Earthy Tones' | 'Creative' | 'Slate Gray' | 'Dark Charcoal' | 'Navy Blue' | 'Forest Green' | 'Burgundy' | 'Teal' | 'Coral' | 'Lavender' | 'Golden' | 'Steel Blue' | 'Light Blue' | 'Sky Blue' | 'Mint Green' | 'Lime' | 'Peach' | 'Rose' | 'Lilac' | 'Sand' | 'Olive' | 'Maroon' | 'Deep Purple' | 'Turquoise' | 'Charcoal' | 'Crimson' | 'Sapphire';
