import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateInvoicePDF } from "../../client/src/lib/pdfGenerator";
import { ThermalPrinter } from "../../client/src/lib/thermalPrinter";

// Mock jsPDF and autoTable
vi.mock("jspdf", () => {
    return {
        default: function () {
            return {
                internal: {
                    pageSize: {
                        getWidth: () => 210,
                    },
                },
                setFontSize: vi.fn(),
                setTextColor: vi.fn(),
                text: vi.fn(),
                setDrawColor: vi.fn(),
                line: vi.fn(),
                setFont: vi.fn(),
                save: vi.fn(),
            };
        },
    };
});

vi.mock("jspdf-autotable", () => ({
    default: vi.fn().mockImplementation((doc) => {
        (doc as any).lastAutoTable = { finalY: 100 };
    }),
}));

describe("PDF Generator Utility", () => {
    it("should call jspdf methods with correct data", () => {
        const data = {
            billNumber: "INV-001",
            date: new Date(),
            items: [
                { id: "1", name: "Product A", quantity: 2, price: 10, total: 20 },
            ],
            subtotal: 20,
            tax: 2,
            total: 22,
            organizationName: "Test Org",
        };

        expect(() => generateInvoicePDF(data)).not.toThrow();
    });
});

describe("Thermal Printer Utility", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock navigator.serial
        (global.navigator as any).serial = {
            requestPort: vi.fn(),
        };
    });

    it("should check for Serial API support", () => {
        expect(ThermalPrinter.isSupported()).toBe(true);

        delete (global.navigator as any).serial;
        expect(ThermalPrinter.isSupported()).toBe(false);
    });

    it("should attempt to print and fail if port request is denied", async () => {
        (global.navigator as any).serial = {
            requestPort: vi.fn().mockRejectedValue(new Error("User denied")),
        };

        const data = {
            organizationName: "Test Org",
            billNumber: "INV-001",
            date: new Date(),
            items: [{ name: "Item 1", quantity: 1, price: 10, total: 10 }],
            total: 10,
        };

        await expect(ThermalPrinter.printReceipt(data)).rejects.toThrow("User denied");
    });
});
