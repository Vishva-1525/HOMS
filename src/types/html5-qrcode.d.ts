declare class Html5Qrcode {
  constructor(elementId: string)
  start(
    cameraConfig: { facingMode: string },
    config: { fps: number; qrbox?: { width: number; height: number } },
    onSuccess: (decodedText: string) => void,
    onError: (errorMessage: string) => void,
  ): Promise<void>
  stop(): Promise<void>
  clear(): Promise<void>
}

declare class Html5QrcodeScanner {
  constructor(
    elementId: string,
    config: unknown,
    verbose: boolean,
  )
}
