export interface DeviceScannerInfo {
    vendorId: number;
    productId: number;
    productName: string;
}

export class DedicatedScanner {
    private device: any | null = null;
    private onDataCallback: ((data: string) => void) | null = null;
    private onConnectionChange: ((connected: boolean, name?: string) => void) | null = null;

    static isSupported(): boolean {
        return typeof navigator !== 'undefined' && 'hid' in navigator;
    }

    constructor() {
        if (DedicatedScanner.isSupported()) {
            (navigator as any).hid.addEventListener('connect', (event: any) => {
                console.log('Scanner connected:', event.device.productName);
                this.handleDeviceConnection(event.device);
            });

            (navigator as any).hid.addEventListener('disconnect', (event: any) => {
                console.log('Scanner disconnected:', event.device.productName);
                if (this.device === event.device) {
                    this.device = null;
                    this.onConnectionChange?.(false);
                }
            });
        }
    }

    async connect() {
        if (!DedicatedScanner.isSupported()) throw new Error('WebHID not supported');

        try {
            const devices = await (navigator as any).hid.requestDevice({
                filters: [],
            });

            if (devices.length > 0) {
                await this.handleDeviceConnection(devices[0]);
            }
        } catch (error) {
            console.error('Failed to connect scanner:', error);
            throw error;
        }
    }

    private async handleDeviceConnection(device: any) {
        if (!device.opened) {
            await device.open();
        }

        this.device = device;
        this.onConnectionChange?.(true, device.productName);

        device.addEventListener('inputreport', (event: any) => {
            // In professional POS mode with HID access, we can listen for reports directly
            // This prevents the data from leaking into other input fields
            console.log('HID Input Report received');
        });
    }

    onData(callback: (data: string) => void) {
        this.onDataCallback = callback;
    }

    onStatusChange(callback: (connected: boolean, name?: string) => void) {
        this.onConnectionChange = callback;
        // Check existing devices
        if (DedicatedScanner.isSupported()) {
            (navigator as any).hid.getDevices().then((devices: any[]) => {
                if (devices.length > 0) {
                    const scanner = devices[0];
                    if (scanner.opened) {
                        this.device = scanner;
                        this.onConnectionChange?.(true, scanner.productName);
                    }
                }
            });
        }
    }
}

export const dedicatedScanner = new DedicatedScanner();
