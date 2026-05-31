'use client';

import { useState } from 'react';
import api from '../../../utils/api';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { toast } from 'sonner';
import { Loader2, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import ConfirmationDialog from '../../../components/ui/ConfirmationDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { useCategories } from '../../../context/CategoryContext';

export default function AdminImportPage() {
    const { refreshCategories } = useCategories();
    const [isImporting, setIsImporting] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [totalCategories, setTotalCategories] = useState(0);
    const [totalProducts, setTotalProducts] = useState(0);
    const [importResult, setImportResult] = useState<any>(null);
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

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Admin: Import Price List</h1>
                        <p className="text-gray-500 mt-2">Replace existing inventory with new price list data</p>
                    </div>
                    <div className="flex gap-4">
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
                    </div>
                </div>

                {/* Import Result */}
                {importResult && (
                    <Card className="border-green-200 bg-green-50">
                        <CardHeader>
                            <CardTitle className="text-green-800 flex items-center gap-2">
                                <CheckCircle2 className="h-6 w-6" />
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