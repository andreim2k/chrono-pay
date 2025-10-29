
'use client';

import { Button } from '@/components/ui/button';
import { Upload, FileJson, FileText, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ExportMenuProps {
  data: Record<string, any>[];
  filename: string;
}

export function ExportMenu({ data, filename }: ExportMenuProps) {
  const { toast } = useToast();

  const getFinalFilename = (extension: string) => {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    return `${filename}_${timestamp}.${extension}`;
  };

  const handleJsonExport = () => {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const finalFileName = getFinalFilename('json');

      const link = document.createElement('a');
      link.href = url;
      link.download = finalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Data exported to ${finalFileName}.`,
      });
    } catch (error) {
      console.error('JSON export failed:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not export data as JSON.',
      });
    }
  };

  const handlePdfExport = () => {
    try {
      const doc = new jsPDF();
      const tableData = data.map(row => {
        // Flatten nested 'items' array
        const itemsDescription = Array.isArray(row.items) 
          ? row.items.map((item: any) => item.description).join('; ') 
          : '';
        const { items, ...rest } = row;
        return { ...rest, items: itemsDescription };
      });
      
      const headers = Object.keys(tableData[0] || {});
      const body = tableData.map(row => headers.map(header => row[header]));

      (doc as any).autoTable({
        head: [headers],
        body: body,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      });

      const finalFileName = getFinalFilename('pdf');
      doc.save(finalFileName);

      toast({
        title: 'Export Successful',
        description: `Data exported to ${finalFileName}.`,
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not export data as PDF.',
      });
    }
  };

  const handleExcelExport = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
      const finalFileName = getFinalFilename('xlsx');
      XLSX.writeFile(workbook, finalFileName);

      toast({
        title: 'Export Successful',
        description: `Data exported to ${finalFileName}.`,
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not export data as Excel.',
      });
    }
  };

  const hasData = data.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={!hasData}>
          <Upload className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={handleJsonExport}>
          <FileJson className="mr-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handlePdfExport}>
          <FileText className="mr-2 h-4 w-4" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleExcelExport}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
