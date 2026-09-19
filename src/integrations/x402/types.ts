export interface X402PaymentChallenge {
  status: 402;
  error: 'Payment Required';
  scheme: 'x402-v2';
  payTo: string;
  amountMon: number;
  currency: 'MON';
  chainId: number;
  resourceId: string;
  challengeNonce: string;
  serviceProof: string;
  expiresAt: number;
}

export interface X402PaymentReceipt {
  scheme: 'x402-v2';
  txHash: string;
  payer: string;
  payTo: string;
  amountMon: number;
  challengeNonce: string;
  timestamp: number;
  signature: string;
}

export interface SatelliteSceneData {
  sceneId: string;
  coordinates: { lat: number; lng: number };
  resolutionMeters: number;
  cloudCoveragePercent: number;
  spectralBands: string[];
  capturedAt: number;
  rasterPayloadUri: string;
  dataSizeBytes: number;
}

export type X402Response<T> =
  | { status: 402; challenge: X402PaymentChallenge }
  | { status: 200; data: T; receiptAcknowledged: boolean };
