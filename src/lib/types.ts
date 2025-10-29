

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'Admin' | 'Member';
  // Merged company fields
  companyName?: string;
  companyAddress?: string;
  companyVat?: string;
  companyIban?: string;
  companyBankName?: string;
  companySwift?: string;
  companyLogoUrl?: string;
  companyPhone?: string;
  companyEmail?: string;
}

export type Client = {
  id: string;
  name: string;
  address: string;
  vat: string;
  vatRate: number;
  iban?: string;
  logoUrl?: string;
  bankName?: string;
  swift?: string;
  language?: 'English' | 'Romanian';
  order?: number;
};

export type Company = {
  id?: string; // id is not needed here as we use a specific doc
  name: string;
  address: string;
  vat: string;
iban: string;
  bankName: string;
  swift: string;
  vatRate: number;
  logoUrl?: string;
};

export type Project = {
  id:string;
  name: string;
  clientId: string;
  clientName: string;
  invoiceTheme?: InvoiceTheme;
  order?: number;
  currency?: string;
  invoiceNumberPrefix?: string;
  hasVat?: boolean;
  maxExchangeRate?: number;
  maxExchangeRateDate?: string;
  rate?: number;
  rateType?: 'daily' | 'hourly';
  hoursPerDay?: number;
};

export type Timecard = {
    id: string;
    projectId: string;
    projectName: string;
    clientId: string;
    clientName: string;
    date: string; // YYYY-MM-DD
    hours: number;
    description?: string;
    status: 'Unbilled' | 'Billed';
    invoiceId?: string; // ID of the invoice this timecard is billed on
}

export type Invoice = {
  id: string;
  invoiceNumber: string;
  companyName: string;
  companyAddress: string;
  companyVat: string;
  companyIban?: string;
  companyBankName?: string;
  companySwift?: string;
  companyPhone?: string;
  companyEmail?: string;
  clientName: string;
  clientAddress: string;
  clientVat: string;
  projectId: string;
  projectName?: string;
  date: string;
  dueDate: string;
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
  billedTimecardIds?: string[];
  hasVat?: boolean; // Temporary field for creation logic
};

export type InvoiceTheme = 'Classic' | 'Modern' | 'Sunset' | 'Ocean' | 'Monochrome' | 'Minty' | 'Velvet' | 'Corporate Blue' | 'Earthy Tones' | 'Creative' | 'Slate Gray' | 'Dark Charcoal' | 'Navy Blue' | 'Forest Green' | 'Burgundy' | 'Teal' | 'Coral' | 'Lavender' | 'Golden' | 'Steel Blue' | 'Light Blue' | 'Sky Blue' | 'Mint Green' | 'Lime' | 'Peach' | 'Rose' | 'Lilac' | 'Sand' | 'Olive' | 'Maroon' | 'Deep Purple' | 'Turquoise' | 'Charcoal' | 'Crimson' | 'Sapphire';

    
