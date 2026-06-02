'use client';

import { useState } from 'react';
import api from '../../../utils/api';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { toast } from 'sonner';
import { Loader2, Upload, CheckCircle2, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import * as XLSX from 'xlsx';

export default function AdminImportSalesPage() {
    const [isImporting, setIsImporting] = useState(false);
    const [salesCSV, setSalesCSV] = useState<File | null>(null);
    const [salesPreview, setSalesPreview] = useState<any[]>([]);
    const [importResult, setImportResult] = useState<any>(null);
    const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSalesCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSalesCSV(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    setSalesPreview(jsonData);
                    toast.success('CSV file loaded! Previewing first few items...');
                } catch (error) {
                    console.error('Error parsing CSV:', error);
                    toast.error('Failed to parse CSV file');
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleImportSales = async () => {
        setIsImporting(true);
        try {
            const formData = new FormData();
            formData.append('saleDate', saleDate);
            if (salesCSV) {
                formData.append('csv', salesCSV);
            }

            const importRes = await api.post('/admin/import-sales', formData);
            if (importRes.data.success) {
                setImportResult(importRes.data);
                toast.success('Sales imported successfully!');
            }
        } catch (error: any) {
            console.error('Import sales failed:', error);
            const errorMsg = error.response?.data?.error || 'Failed to import sales';
            toast.error(errorMsg);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Admin: Import Sales</h1>
                        <p className="text-gray-500 mt-2">Import sales data from CSV or Excel file</p>
                    </div>
                </div>

                {importResult && (
                    <Card className="border-green-200 bg-green-50">
                        <CardHeader>
                            <CardTitle className="text-green-800 flex items-center gap-2">
                                <CheckCircle2 className="w-6 h-6" />
                                Import Completed Successfully
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-green-800">
                            <p><strong>Sales Imported:</strong> {importResult.importedCount} of {importResult.totalItems}</p>
                        </CardContent>
                    </Card>
                )}

                <Card className="bg-white p-6 shadow-sm border border-slate-200 rounded-2xl">
                    <CardHeader>
                        <CardTitle>Import Sales Data</CardTitle>
                        <CardDescription>
                            Upload a CSV/Excel file with columns like productName, quantity, price, saleDate, customerName (optional), status (optional, default paid)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Sale Date (default for all)</label>
                                <input
                                    type="date"
                                    value={saleDate}
                                    onChange={(e) => setSaleDate(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-slate-300"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Upload Sales CSV/Excel</label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                                    <FileText className="w-4 h-4" />
                                    <span className="text-sm font-semibold">
                                        {salesCSV ? salesCSV.name : 'Choose CSV/Excel File'}
                                    </span>
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleSalesCSVUpload}
                                        className="hidden"
                                    />
                                </label>
                                {salesCSV && (
                                    <button
                                        onClick={() => { setSalesCSV(null); setSalesPreview([]); setImportResult(null); }}
                                        className="text-slate-500 hover:text-red-500"
                                    >
                                        X
                                    </button>
                                )}
                            </div>
                        </div>
                        {salesPreview.length > 0 && (
                            <Card className="border-slate-200">
                                <CardHeader>
                                    <CardTitle className="text-base">Sales Preview</CardTitle>
                                </CardHeader>
                                <CardContent className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {Object.keys(salesPreview[0]).map((key, idx) => (
                                                    <TableHead key={idx}>{key}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {salesPreview.slice(0, 5).map((row, idx) => (
                                                <TableRow key={idx}>
                                                    {Object.values(row).map((value, valIdx) => (
                                                        <TableCell key={valIdx}>{String(value)}</TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {salesPreview.length > 5 && (
                                        <p className="text-sm text-slate-500 mt-2">...and {salesPreview.length - 5} more</p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                        <Button
                            onClick={handleImportSales}
                            disabled={isImporting || !salesCSV}
                            variant="gradient"
                            size="lg"
                            className="w-full"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-5 h-5 mr-2" />
                                    Import Sales
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
