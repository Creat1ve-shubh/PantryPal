/**
 * Utility for Thermal Printer integration using Web Serial API
 * This allows direct printing to USB/Serial ESC/POS printers from the browser.
 */

interface PrinterItem {
    name: string;
    quantity: number;
    price: number;
    total: number;
}

interface ReceiptData {
    organizationName: string;
    billNumber: string;
    date: Date;
    items: PrinterItem[];
    total: number;
    footer?: string;
}

export class ThermalPrinter {
    private static ESC = "\x1B";
    private static GS = "\x1D";
    private static LF = "\x0A";

    /**
     * Check if Serial API is supported
     */
    public static isSupported(): boolean {
        return "serial" in navigator;
    }

    /**
     * Connect to printer and print receipt
     */
    public static async printReceipt(data: ReceiptData): Promise<void> {
        if (!this.isSupported()) {
            throw new Error("Serial API not supported in this browser. Use Chrome or Edge.");
        }

        try {
            // Prompt user to select port
            const port = await (navigator as any).serial.requestPort();
            await port.open({ baudRate: 9600 });

            const encoder = new TextEncoder();
            const writer = port.writable.getWriter();

            // Printer Initialization
            await writer.write(encoder.encode(this.ESC + "@"));

            // Center Alignment
            await writer.write(encoder.encode(this.ESC + "a" + "\x01"));

            // Bold + Large Text for Title
            await writer.write(encoder.encode(this.ESC + "E" + "\x01"));
            await writer.write(encoder.encode(data.organizationName + this.LF));
            await writer.write(encoder.encode(this.ESC + "E" + "\x00"));

            // Regular Text
            await writer.write(encoder.encode("--------------------------------" + this.LF));
            await writer.write(encoder.encode(`Bill: #${data.billNumber}` + this.LF));
            await writer.write(encoder.encode(`${data.date.toLocaleString()}` + this.LF));
            await writer.write(encoder.encode("--------------------------------" + this.LF));

            // Left Alignment for items
            await writer.write(encoder.encode(this.ESC + "a" + "\x00"));

            for (const item of data.items) {
                const line = `${item.name.padEnd(20)} ${item.quantity} x ${item.price.toFixed(2)}`;
                await writer.write(encoder.encode(line + this.LF));
            }

            await writer.write(encoder.encode("--------------------------------" + this.LF));

            // Right Alignment for Total
            await writer.write(encoder.encode(this.ESC + "a" + "\x02"));
            await writer.write(encoder.encode(`TOTAL: $${data.total.toFixed(2)}` + this.LF));

            // Center for footer
            await writer.write(encoder.encode(this.ESC + "a" + "\x01"));
            await writer.write(encoder.encode(this.LF + (data.footer || "Thank you!") + this.LF));

            // Cut Paper (some printers support this)
            await writer.write(encoder.encode(this.GS + "V" + "\x41" + "\x03"));

            // Cleanup
            writer.releaseLock();
            await port.close();

            console.log("Print job sent successfully");
        } catch (error) {
            console.error("Printing failed:", error);
            throw error;
        }
    }
}
