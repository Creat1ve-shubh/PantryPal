import { useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Download,
  Printer,
  Share2,
  Home,
  BarChart3,
  Mail,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Order Confirmation Page
 * Displayed after successful bill creation
 *
 * Features:
 * - Order/Bill summary and receipt
 * - Download as PDF
 * - Print receipt (thermal printer)
 * - Email receipt
 * - Share options
 * - Navigation to next action
 */
export default function OrderConfirmation() {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  const paymentMethod = (location.state?.paymentMethod as string) || "cash";

  /**
   * Fetch bill details
   */
  const {
    data: bill,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["bill", billId],
    queryFn: async () => {
      const response = await api.request(`/api/bills/${billId}`, {
        method: "GET",
      });
      return response;
    },
    enabled: !!billId,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="text-center py-12">
          <CardContent>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="text-center py-12" variant="destructive">
          <CardContent className="space-y-4">
            <h2 className="text-2xl font-bold text-red-600">Error</h2>
            <p className="text-gray-600">Failed to load order details</p>
            <Button onClick={() => navigate("/billing")}>Go to Billing</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /**
   * Download receipt as PDF
   */
  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${bill.bill_number}.pdf`);

      toast({
        title: "✓ Downloaded",
        description: "Receipt saved to your device",
      });
    } catch (error) {
      console.error("Failed to download PDF:", error);
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive",
      });
    }
  };

  /**
   * Print receipt (thermal printer)
   */
  const handlePrint = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open("", "", "height=600,width=800");
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print dialog",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.write("<html><head><title>Receipt</title>");
    printWindow.document.write("<style>");
    printWindow.document.write(`
      body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; }
      .receipt { max-width: 400px; }
      h1 { text-align: center; font-size: 16px; }
      .divider { border-top: 1px dashed #000; margin: 10px 0; }
      table { width: 100%; border-collapse: collapse; }
      td { padding: 4px 0; }
      .label { width: 40%; }
      .value { text-align: right; }
      .total { font-weight: bold; font-size: 14px; }
      @media print { body { margin: 0; padding: 0; } }
    `);
    printWindow.document.write("</style></head><body>");
    printWindow.document.write(receiptRef.current.innerHTML);
    printWindow.document.write("</body></html>");
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);

    toast({
      title: "✓ Sent to Printer",
      description: "Receipt sent to thermal printer",
    });
  };

  /**
   * Send receipt via email (to customer if available)
   */
  const handleEmailReceipt = async () => {
    try {
      await api.request(`/api/bills/${billId}/email-receipt`, {
        method: "POST",
        body: JSON.stringify({
          email: bill.customer?.email,
        }),
      });

      toast({
        title: "✓ Email Sent",
        description: "Receipt has been sent to the customer's email",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    }
  };

  const subtotal = bill.items.reduce(
    (sum: number, item: any) => sum + item.unit_price * item.quantity,
    0
  );
  const discountAmount = (subtotal * (bill.discount_percent || 0)) / 100;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const tax =
    bill.tax_amount || (subtotalAfterDiscount * (bill.tax_percent || 5)) / 100;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 animate-bounce" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Order Complete!</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Thank you for your purchase. Receipt details below.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receipt */}
        <div className="lg:col-span-2">
          <Card ref={receiptRef} className="bg-white">
            <CardHeader className="text-center border-b-2">
              <CardTitle className="text-2xl">PantryPal Receipt</CardTitle>
              <CardDescription>Order Confirmation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Bill Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Bill #</p>
                  <p className="font-bold text-lg">{bill.bill_number}</p>
                </div>
                <div>
                  <p className="text-gray-600">Date & Time</p>
                  <p className="font-bold">
                    {new Date(bill.created_at).toLocaleString()}
                  </p>
                </div>
                {bill.customer && (
                  <>
                    <div className="col-span-2">
                      <p className="text-gray-600">Customer</p>
                      <p className="font-bold">{bill.customer.name}</p>
                      {bill.customer.phone && (
                        <p className="text-sm text-gray-600">
                          {bill.customer.phone}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="border-t-2 border-dashed my-4" />

              {/* Items */}
              <div className="space-y-3">
                <h3 className="font-bold uppercase text-sm">Items</h3>
                {bill.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div>
                      <p className="font-semibold">{item.product_name}</p>
                      <p className="text-gray-600">
                        {item.quantity} × ₹{item.unit_price}
                      </p>
                    </div>
                    <p className="font-semibold">
                      ₹{(item.quantity * item.unit_price).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-dashed my-4" />

              {/* Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Discount ({bill.discount_percent || 0}%)</span>
                    <span>−₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax ({bill.tax_percent || 5}%)</span>
                  <span>+₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-primary">
                    ₹{bill.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="border-t-2 border-dashed my-4" />

              {/* Payment Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method</span>
                  <span className="font-semibold uppercase">
                    {paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="font-semibold text-green-600">
                    Completed
                  </span>
                </div>
              </div>

              {bill.notes && (
                <>
                  <div className="border-t-2 border-dashed my-4" />
                  <div className="text-sm">
                    <p className="text-gray-600 text-xs uppercase mb-1">
                      Notes
                    </p>
                    <p className="italic">{bill.notes}</p>
                  </div>
                </>
              )}

              <div className="border-t-2 border-dashed my-4" />
              <p className="text-center text-xs text-gray-500">
                Thank you for your business!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Bill Number</p>
                <p className="text-xl font-bold">{bill.bill_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Items</p>
                <p className="text-xl font-bold">{bill.items.length}</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-primary">
                  ₹{bill.total_amount.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>

              <Button
                onClick={handlePrint}
                variant="outline"
                className="w-full justify-start"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>

              {bill.customer?.email && (
                <Button
                  onClick={handleEmailReceipt}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Receipt
                </Button>
              )}

              <Button
                onClick={() => navigate("/billing")}
                variant="outline"
                className="w-full justify-start"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View All Bills
              </Button>
            </CardContent>
          </Card>

          {/* Navigation */}
          <Button
            onClick={() => navigate("/barcode-scanner")}
            size="lg"
            className="w-full"
          >
            <Home className="h-4 w-4 mr-2" />
            New Sale
          </Button>
        </div>
      </div>
    </div>
  );
}
