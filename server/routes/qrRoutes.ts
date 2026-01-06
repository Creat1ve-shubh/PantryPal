import { Request, Response, NextFunction, Router } from "express";
import QRCode from "qrcode";
import { productService } from "../services";
import { isAuthenticated } from "../auth";
import { requireOrgId } from "../middleware/tenantContext";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

/**
 * Generate QR code for a product
 * POST /api/products/:id/generate-qr
 */
router.post(
  "/api/products/:id/generate-qr",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const orgId = requireOrgId(req);

    // Get the product scoped to org
    const product = await productService.getProduct(id, orgId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Generate QR code from product ID (always use ID for consistency)
    // This ensures the QR code value matches something scannable
    const qrData = product.id;

    // Generate QR code as base64 image
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    console.log(`🔍 Generating QR for product ${id}, QR code value: ${qrData}`);

    // Update product with both QR code data AND image (so scanner can find it)
    const updatedProduct = await productService.updateProduct(
      id,
      {
        qr_code: qrData, // Store the scannable QR code value (product ID)
        qr_code_image: qrCodeImage,
      },
      orgId
    );

    console.log(
      `✅ Updated product ${id} with qr_code: ${updatedProduct.qr_code}`
    );

    res.json({
      success: true,
      qr_code: qrData,
      qr_code_image: qrCodeImage,
      product: updatedProduct,
    });
  })
);

/**
 * Generate barcode for a product
 * POST /api/products/:id/generate-barcode
 */
router.post(
  "/api/products/:id/generate-barcode",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const orgId = requireOrgId(req);

    // Get the product
    const product = await productService.getProduct(id, orgId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Generate barcode from product ID (ISBN/EAN-13 format)
    // If product has an existing barcode, use it, otherwise use product ID
    const barcodeData = product.barcode || product.id;

    // Update product with barcode (so scanner can find it)
    const updatedProduct = await productService.updateProduct(
      id,
      { barcode: barcodeData },
      orgId
    );

    res.json({
      success: true,
      barcode: barcodeData,
      product: updatedProduct,
    });
  })
);

export default router;
