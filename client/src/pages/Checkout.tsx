import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/contexts/AuthContext";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2,
  ShoppingCart,
  Package,
  DollarSign,
  User,
  ArrowLeft,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

/**
 * Checkout Page - Cart Review & Bill Creation
 *
 * Features:
 * - Cart review with item removal/quantity editing
 * - Customer selection or quick-add new customer
 * - Tax & discount application
 * - Payment method selection (cash/card/upi/razorpay)
 * - Real-time calculations
 * - Production-ready error handling
 */
export default function Checkout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const cartStore = useCartStore();

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(5); // Default 5% IGST
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "upi" | "razorpay"
  >("cash");
  const [notes, setNotes] = useState("");
  const [isCreatingBill, setIsCreatingBill] = useState(false);

  // Fetch customers for selection
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      try {
        const response = await api.request("/api/customers", {
          method: "GET",
        });
        return response || [];
      } catch (err) {
        console.error("Failed to fetch customers:", err);
        return [];
      }
    },
  });

  // Check if cart is empty
  if (cartStore.isEmpty()) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card className="text-center py-12">
          <CardContent className="space-y-4">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto" />
            <h2 className="text-2xl font-bold">Cart is Empty</h2>
            <p className="text-gray-600">
              Scan products or search to add items to your cart
            </p>
            <Button
              onClick={() => navigate("/barcode-scanner")}
              className="w-full mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Scanner
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate totals
  const subtotal = cartStore.getSubtotal();
  const cartLevelDiscount = (subtotal * discountPercent) / 100;
  const subtotalAfterDiscount = subtotal - cartLevelDiscount;
  const tax = (subtotalAfterDiscount * taxPercent) / 100;
  const total = subtotalAfterDiscount + tax;

  /**
   * Handle bill creation (finalize and move to order confirmation)
   */
  const handleCreateBill = async () => {
    // Validation
    if (!selectedCustomerId && !newCustomerName) {
      toast({
        title: "Error",
        description: "Please select or create a customer",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingBill(true);
    try {
      // Prepare bill data
      const billData = {
        customer_id: selectedCustomerId || undefined,
        new_customer_name: newCustomerName || undefined,
        new_customer_phone: newCustomerPhone || undefined,
        items: cartStore.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
        })),
        discount_percent: discountPercent,
        tax_percent: taxPercent,
        notes,
        payment_method: paymentMethod,
        subtotal,
        tax,
        total,
      };

      // Create bill via API
      const response = await api.request("/api/bills", {
        method: "POST",
        body: JSON.stringify(billData),
      });

      const billId = response.id;

      // Clear cart after successful bill creation
      cartStore.clearCart();

      // Navigate to confirmation with bill ID
      navigate(`/order-confirmation/${billId}`, {
        state: { paymentMethod },
      });

      toast({
        title: "✓ Bill Created",
        description: `Bill #${response.bill_number} created successfully`,
      });
    } catch (error: any) {
      console.error("Failed to create bill:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to create bill. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBill(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review items and complete your purchase
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/barcode-scanner")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Continue Shopping
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Cart Items Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Cart Items ({cartStore.getItemCount()})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cartStore.items.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.product.name}</h4>
                    <p className="text-sm text-gray-600">
                      ₹{item.unit_price} × {item.quantity} = ₹
                      {(item.unit_price * item.quantity).toFixed(2)}
                    </p>
                    {item.discount_percent > 0 && (
                      <p className="text-sm text-orange-600">
                        -{item.discount_percent}% discount
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 border rounded">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          cartStore.updateQuantity(
                            item.product_id,
                            item.quantity - 1
                          )
                        }
                        className="h-8 w-8"
                      >
                        −
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          cartStore.updateQuantity(
                            item.product_id,
                            item.quantity + 1
                          )
                        }
                        className="h-8 w-8"
                      >
                        +
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cartStore.removeItem(item.product_id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Customer */}
              <div className="space-y-2">
                <Label htmlFor="customer">Select Existing Customer</Label>
                <Select
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                >
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Choose a customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}{" "}
                        {customer.phone && `(${customer.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* OR Divider */}
              <div className="flex items-center gap-2 text-gray-400">
                <div className="flex-1 border-t" />
                <span className="text-xs">OR</span>
                <div className="flex-1 border-t" />
              </div>

              {/* New Customer */}
              <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <Label htmlFor="customerName" className="text-sm font-semibold">
                  Create New Customer
                </Label>
                <Input
                  id="customerName"
                  placeholder="Customer name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  disabled={!!selectedCustomerId}
                />
                <Input
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  disabled={!!selectedCustomerId}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Order notes, special instructions, delivery details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-20"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary & Payment */}
        <div className="space-y-4">
          {/* Bill Summary */}
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Bill Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="discount" className="text-sm">
                    Discount %
                  </Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-20 h-8"
                  />
                </div>
                {cartLevelDiscount > 0 && (
                  <div className="flex justify-between text-sm text-orange-600">
                    <span>Discount Amount</span>
                    <span>−₹{cartLevelDiscount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Tax */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="tax" className="text-sm">
                    Tax %
                  </Label>
                  <Input
                    id="tax"
                    type="number"
                    min="0"
                    max="100"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-20 h-8"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax Amount</span>
                  <span>+₹{tax.toFixed(2)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="pt-3 border-t-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2 pt-4 border-t">
                <Label
                  htmlFor="paymentMethod"
                  className="text-sm font-semibold"
                >
                  Payment Method
                </Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value: any) => setPaymentMethod(value)}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">💵 Cash</SelectItem>
                    <SelectItem value="card">🏧 Card</SelectItem>
                    <SelectItem value="upi">📱 UPI</SelectItem>
                    <SelectItem value="razorpay">💳 Razorpay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Create Bill Button */}
              <Button
                onClick={handleCreateBill}
                disabled={
                  isCreatingBill || (!selectedCustomerId && !newCustomerName)
                }
                size="lg"
                className="w-full mt-4"
              >
                {isCreatingBill ? (
                  <>Processing...</>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Complete Purchase
                  </>
                )}
              </Button>

              {/* Back Button */}
              <Button
                variant="outline"
                onClick={() => navigate("/barcode-scanner")}
                className="w-full"
              >
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
