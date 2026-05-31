'use client';

import { useState } from 'react';
import api from '../../../utils/api';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { toast } from 'sonner';
import { Loader2, Upload, AlertTriangle, CheckCircle2, ShoppingCart, Camera } from 'lucide-react';
import ConfirmationDialog from '../../../components/ui/ConfirmationDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { useCategories } from '../../../context/CategoryContext';

export default function AdminImportPage() {
    const { refreshCategories } = useCategories();
    const [isImporting, setIsImporting] = useState(false);
    const [isPurchasesImporting, setIsPurchasesImporting] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [totalCategories, setTotalCategories] = useState(0);
    const [totalProducts, setTotalProducts] = useState(0);
    const [importResult, setImportResult] = useState<any>(null);
    const [purchasesImportResult, setPurchasesImportResult] = useState<any>(null);
    const [backupData, setBackupData] = useState<any>(null);

    const handlePreview = async () => {
        try {
            const response = await api.get('/admin/preview');
            if (response.data.success) {
                setPreviewData(response.data.data);
                setTotalCategories(response.data.totalCategories);
                setTotalProducts(response.data.totalProducts);
            }
        } catch (error) {
            console.error('Failed to get preview:', error);
            toast.error('Failed to load preview data');
        }
    };

    const handleBackup = async () => {
        try {
            const response = await api.get('/admin/backup');
            if (response.data.success) {
                setBackupData(response.data.backup);
                // Download backup as JSON
                const dataStr = JSON.stringify(response.data.backup, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
                const exportFileDefaultName = `dairy-inventory-backup-${new Date().toISOString().split('T')[0]}.json`;
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
                toast.success('Backup created and downloaded successfully!');
            }
        } catch (error) {
            console.error('Failed to create backup:', error);
            toast.error('Failed to create backup');
        }
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            // Step 1: Backup
            const backupRes = await api.get('/admin/backup');
            if (backupRes.data.success) {
                setBackupData(backupRes.data.backup);
            }

            // Step 2: Delete existing data
            await api.delete('/admin/delete-data');

            // Step 3: Import new data
            const importRes = await api.post('/admin/import-pricelist');
            if (importRes.data.success) {
                setImportResult(importRes.data);
                await refreshCategories();
                toast.success('Price list imported successfully!');
            }
        } catch (error) {
            console.error('Import failed:', error);
            toast.error('Failed to import price list');
        } finally {
            setIsImporting(false);
            setIsConfirmOpen(false);
        }
    };

    const [purchaseDate, setPurchaseDate] = useState('2026-05-30');
    const [purchasePhoto, setPurchasePhoto] = useState<File | null>(null);
    
    const handleImportPurchases = async () => {
        setIsPurchasesImporting(true);
        try {
            const formData = new FormData();
            formData.append('purchaseDate', purchaseDate);
            if (purchasePhoto) {
                formData.append('image', purchasePhoto);
            }

            // Don't set Content-Type header manually, let axios set it with boundary!
            const importRes = await api.post('/admin/import-purchases', formData);
            
            if (importRes.data.success) {
                setPurchasesImportResult(importRes.data);
                toast.success('Purchases imported successfully!');
            }
        } catch (error: any) {
            console.error('Import purchases failed:', error);
            const errorMsg = error.response?.data?.error || 'Failed to import purchases';
            toast.error(errorMsg);
        } finally {
            setIsPurchasesImporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Admin: Import Price List</h1>
                        <p className="text-gray-500 mt-2">Replace existing inventory with new price list data</p>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                    <Button 
                        onClick={handleBackup}
                        variant="outline"
                    >
                        Create Backup
                    </Button>
                    <Button 
                        onClick={handlePreview}
                        disabled={isImporting}
                    >
                        Load Preview
                    </Button>
                    <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800">Import Purchases</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Purchase Date</label>
                                <input 
                                    type="date"
                                    value={purchaseDate}
                                    onChange={(e) => setPurchaseDate(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-slate-300"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Upload Photo (Optional)</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                                        <Camera className="w-4 h-4" />
                                        <span className="text-sm font-semibold">
                                            {purchasePhoto ? purchasePhoto.name : 'Choose File'}
                                        </span>
                                        <input 
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setPurchasePhoto(e.target.files?.[0] || null)}
                                            className="hidden"
                                        />
                                    </label>
                                    {purchasePhoto && (
                                        <button 
                                            onClick={() => setPurchasePhoto(null)}
                                            className="text-slate-500 hover:text-red-500"
                                        >
                                            X
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Button 
                            onClick={handleImportPurchases}
                            disabled={isPurchasesImporting}
                            variant="gradient"
                        >
                            {isPurchasesImporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                    Import Purchases
                                </>
                            )}
                        </Button>
                    </div>
                </div>
                </div>

                {/* Import Result */}
                {importResult && (
                    <Card className="border-green-200 bg-green-50">
                        <CardHeader>
                            <CardTitle className="text-green-800 flex items-center gap-2">
                                <CheckCircle2 className="w-6 h-6" />
                                Import Completed Successfully
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-green-800">
                            <p><strong>Categories Imported:</strong> {importResult.categoriesImported}</p>
                            <p><strong>Products Imported:</strong> {importResult.productsImported}</p>
                            <p><strong>Threshold Applied:</strong> {importResult.thresholdApplied}</p>
                            <p><strong>Cost Price Updated:</strong> {importResult.costPriceUpdated}</p>
                            <p><strong>Old Data Removed:</strong> {importResult.oldDataRemoved ? 'Yes' : 'No'}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Purchases Import Result */}
                {purchasesImportResult && (
                    <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                            <CardTitle className="text-blue-800 flex items-center gap-2">
                                <CheckCircle2 className="w-6 h-6" />
                                Purchases Import Completed Successfully
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-blue-800">
                            <p><strong>Purchases Imported:</strong> {purchasesImportResult.importedCount} of {purchasesImportResult.totalItems}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Summary Cards */}
                {previewData.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Categories</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold text-primary">{totalCategories}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Products</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-bold text-primary">{totalProducts}</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Preview Table */}
                {previewData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Price List Preview</CardTitle>
                            <CardDescription>First 10 products from the price list</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>Distribution Price</TableHead>
                                        <TableHead>Counter Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewData.slice(0, 10).map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.Category}</TableCell>
                                            <TableCell>{item['Product Name']}</TableCell>
                                            <TableCell>₹{item['Distribution Price']}</TableCell>
                                            <TableCell>₹{item['Counter Price']}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {previewData.length > 10 && (
                                <p className="text-gray-500 mt-4 text-sm">... and {previewData.length - 10} more products</p>
                            )}
                        </CardContent>
                        <CardContent className="border-t pt-6">
                            <Button 
                                onClick={() => setIsConfirmOpen(true)} 
                                disabled={isImporting}
                                variant="gradient"
                                size="lg"
                                className="w-full"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-5 w-5 mr-2" />
                                        Replace Existing Data
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Confirmation Dialog */}
                <ConfirmationDialog
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleImport}
                    title="Replace Existing Data?"
                    description="Warning: This will permanently delete all existing products and categories before importing the new price list. This action cannot be undone."
                    confirmText="Yes, Replace Data"
                    variant="danger"
                />
            </div>
        </div>
    );
}