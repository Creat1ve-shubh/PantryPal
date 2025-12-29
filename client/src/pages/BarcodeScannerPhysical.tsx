import { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { api, type Product } from "@/lib/api";
import { dedicatedScanner, DedicatedScanner } from "@/lib/dedicatedScanner";
import {
  Barcode,
  Search,
  Package,
  Plus,
  Minus,
  ShoppingCart,
  AlertCircle,
  CheckCircle2,
  Usb,
  Wifi,
  Keyboard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Barcode Scanner for Physical Scanner Devices
 * 
 * Performance POS Mode:
 * - Auto-detection for USB/Bluetooth HID Scanners
 * - Keyboard Wedge fallback with 2ms character tracking
 * - Dedicated Hardware status indicators
 */
export default function BarcodeScanner() {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(1);
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    name?: string;
    type: "usb" | "bt" | "wedge";
  }>({ connected: false, type: "wedge" });

  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Setup Hardware Detection
  useEffect(() => {
    if (DedicatedScanner.isSupported()) {
      dedicatedScanner.onStatusChange((connected, name) => {
        setConnectionStatus({
          connected,
          name,
          type: name?.toLowerCase().includes("bluetooth") ? "bt" : "usb",
        });

        if (connected) {
          toast({
            title: "Scanner Detected",
            description: `${name} is ready for production use.`,
          });
        }
      });
    }
  }, [toast]);

  // Auto-focus input on mount for immediate scanning
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep input focused for continuous scanning
  useEffect(() => {
    const handleWindowClick = () => {
      inputRef.current?.focus();
    };

    window.addEventListener("click", handleWindowClick);
    return () => window.removeEventListener("click", handleWindowClick);
  }, []);

  const processBarcode = async (code: string) => {
    if (!code.trim()) return;

    setIsSearching(true);
    try {
      const foundProduct = await api.searchProductByCode(code);

      setProduct(foundProduct);
      setScanHistory((prev) => [code, ...prev.slice(0, 9)]); // Keep last 10 scans

      toast({
        title: "✓ Product Found",
        description: `${foundProduct.name} - ₹${foundProduct.mrp}`,
      });
    } catch (error: any) {
      setProduct(null);
      toast({
        title: "Product Not Found",
        description: error.message || `No product matches barcode: ${code}`,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
      setBarcodeInput(""); // Clear for next scan
      inputRef.current?.focus(); // Re-focus for next scan
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(barcodeInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Physical scanners typically send Enter after barcode
    if (e.key === "Enter") {
      e.preventDefault();
      processBarcode(barcodeInput);
    }
  };

  const pairHardware = async () => {
    try {
      await dedicatedScanner.connect();
    } catch (err) {
      toast({
        title: "Connection Failed",
        description: "Please ensure the scanner is plugged in and you allow access.",
        variant: "destructive",
      });
    }
  };

  const getStockStatus = (product: Product) => {
    const stock = product.quantity_in_stock || 0;
    const minLevel = product.min_stock_level || 0;

    if (stock === 0) {
      return {
        label: "Out of Stock",
        variant: "destructive" as const,
        className: "bg-red-100 text-red-700 border-red-300",
      };
    } else if (stock < minLevel) {
      return {
        label: "Low Stock",
        variant: "destructive" as const,
        className: "bg-orange-100 text-orange-700 border-orange-300",
      };
    } else {
      return {
        label: "In Stock",
        variant: "default" as const,
        className: "bg-green-100 text-green-700 border-green-300",
      };
    }
  };

  const handleStockUpdate = async (delta: number) => {
    if (!product) return;
    const newQuantity = stockQuantity + delta;
    if (newQuantity < 1) return;
    setStockQuantity(newQuantity);
  };

  const handleAddToCart = () => {
    if (!product) return;
    toast({
      title: "Added to Cart",
      description: `${stockQuantity}x ${product.name}`,
    });
    setProduct(null);
    setStockQuantity(1);
    inputRef.current?.focus();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Connection Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">POS Barcode Scanner</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Professional high-speed scanning for 1D/2D barcodes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Card className={`px-4 py-2 flex items-center gap-3 border-2 transition-all ${connectionStatus.connected ? "border-green-500 bg-green-50 dark:bg-green-950/20 shadow-sm shadow-green-200" : "border-amber-500 bg-amber-50 dark:bg-amber-950/20 shadow-sm shadow-amber-200"}`}>
            {connectionStatus.connected ? (
              connectionStatus.type === "usb" ? <Usb className="h-5 w-5 text-green-600 animate-pulse" /> : <Wifi className="h-5 w-5 text-green-600 animate-pulse" />
            ) : (
              <Keyboard className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">POS Hardware</p>
              <p className="font-bold text-sm">
                {connectionStatus.connected ? connectionStatus.name : "Keyboard Wedge"}
              </p>
            </div>
            {!connectionStatus.connected && (
              <Button size="sm" variant="outline" className="ml-2 h-8 text-xs bg-white dark:bg-black" onClick={pairHardware}>
                Connnect Device
              </Button>
            )}
          </Card>
        </div>
      </div>

      {/* Instructions */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <Barcode className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Production Mode:</strong> Scanner will auto-detect and focus. Point your device at any 1D/2D code.
          <br />
          <strong>Support:</strong> EAN-13, UPC-A, Code-128, QR, DataMatrix supported.
        </AlertDescription>
      </Alert>

      {/* Barcode Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Scan or Enter Barcode
          </CardTitle>
          <CardDescription>
            Position your scanner and scan the product barcode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBarcodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode / QR Code</Label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  id="barcode"
                  type="text"
                  placeholder="Ready to scan..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="font-mono text-lg h-12 border-2 focus-visible:ring-primary/20"
                  autoComplete="off"
                  autoFocus
                />
                <Button
                  type="submit"
                  disabled={isSearching || !barcodeInput.trim()}
                  className="h-12 px-8"
                >
                  {isSearching ? (
                    <>Searching...</>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Product Details */}
      {product && (
        <Card className="border-2 border-primary overflow-hidden">
          <div className="h-2 bg-primary"></div>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl">{product.name}</CardTitle>
                <CardDescription className="text-base mt-1">
                  {product.category} {product.brand && `• ${product.brand}`}
                </CardDescription>
              </div>
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-tight">MRP</p>
                <p className="text-xl font-bold">₹{product.mrp}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-tight">Buying</p>
                <p className="text-xl font-bold">₹{product.buying_cost}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-tight">Available</p>
                <p className="text-xl font-bold text-primary">
                  {product.quantity_in_stock || 0} {product.unit || "pcs"}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-tight">Status</p>
                <Badge className={`${getStockStatus(product).className} hover:${getStockStatus(product).className}`}>
                  {getStockStatus(product).label}
                </Badge>
              </div>
            </div>

            {/* Stock Alerts */}
            {product.quantity_in_stock === 0 && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Item is <strong>OUT OF STOCK</strong>. Cannot add to bill.
                </AlertDescription>
              </Alert>
            )}

            {product.quantity_in_stock! > 0 &&
              product.quantity_in_stock! < (product.min_stock_level || 5) && (
                <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950/10">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200">
                    Low stock reminder. Re-order soon.
                  </AlertDescription>
                </Alert>
              )}

            {/* Quantity Selector */}
            <div className="space-y-3 p-4 border rounded-xl bg-gray-50 dark:bg-gray-900/50">
              <Label className="font-bold text-sm">Add to Bill</Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border-2 rounded-lg bg-white dark:bg-black overflow-hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStockUpdate(-1)}
                    disabled={stockQuantity <= 1}
                    className="h-10 w-10 rounded-none hover:bg-red-50"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={stockQuantity}
                    onChange={(e) =>
                      setStockQuantity(parseInt(e.target.value) || 1)
                    }
                    className="w-16 border-0 text-center text-lg font-bold h-10 ring-0 focus-visible:ring-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStockUpdate(1)}
                    className="h-10 w-10 rounded-none hover:bg-green-50"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  size="lg"
                  className="flex-1 h-12 font-bold shadow-lg"
                  onClick={handleAddToCart}
                  disabled={!product.quantity_in_stock}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Confirm & Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card className="border-dashed border-2">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-500 uppercase tracking-widest">
              <Barcode className="h-4 w-4" />
              Recent History
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              {scanHistory.map((code, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="font-mono cursor-pointer hover:bg-primary hover:text-white transition-colors py-1 px-3"
                  onClick={() => processBarcode(code)}
                >
                  {code}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
