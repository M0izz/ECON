import { X402PaymentChallenge, X402PaymentReceipt, SatelliteSceneData, X402Response } from './types';

export class X402SatelliteServer {
  public readonly providerId: string;
  public readonly providerWallet: string;
  public readonly resourcePriceMon: number;
  private settledReceipts: Set<string> = new Set();

  constructor(
    providerId: string = 'GeoVision-Provider',
    providerWallet: string = '0x555286A645c110E663B514571A15C198547A5',
    resourcePriceMon: number = 0.5
  ) {
    this.providerId = providerId;
    this.providerWallet = providerWallet;
    this.resourcePriceMon = resourcePriceMon;
  }

  /**
   * Endpoint: GET /api/satellite/scene/:sceneId
   */
  public handleGetScene(sceneId: string, authHeader?: string): X402Response<SatelliteSceneData> {
    if (!authHeader || !authHeader.startsWith('x402-v2 ')) {
      // Issue 402 Payment Challenge
      const challenge: X402PaymentChallenge = {
        status: 402,
        error: 'Payment Required',
        scheme: 'x402-v2',
        payTo: this.providerId,
        amountMon: this.resourcePriceMon,
        currency: 'MON',
        chainId: 10143,
        resourceId: `satellite-scene-${sceneId}`,
        challengeNonce: `nonce-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        serviceProof: 'SATELLITE_ORBITAL_PASS_SENTINEL_2B',
        expiresAt: Date.now() + 300000, // 5 min validity
      };
      return { status: 402, challenge };
    }

    try {
      const receiptRaw = authHeader.replace('x402-v2 ', '').trim();
      const receipt: X402PaymentReceipt = JSON.parse(receiptRaw);

      if (receipt.amountMon < this.resourcePriceMon) {
        throw new Error('Insufficient payment amount');
      }

      if (this.settledReceipts.has(receipt.txHash)) {
        throw new Error('Receipt already redeemed');
      }

      this.settledReceipts.add(receipt.txHash);

      const sceneData: SatelliteSceneData = {
        sceneId,
        coordinates: { lat: 37.7749, lng: -122.4194 },
        resolutionMeters: 0.5,
        cloudCoveragePercent: 4.2,
        spectralBands: ['B02-Blue', 'B03-Green', 'B04-Red', 'B08-NIR'],
        capturedAt: Date.now() - 3600000 * 2,
        rasterPayloadUri: `s3://econ-sentinel-archive/scenes/${sceneId}.tiff`,
        dataSizeBytes: 48291040,
      };

      return {
        status: 200,
        data: sceneData,
        receiptAcknowledged: true,
      };
    } catch (err: any) {
      // If payment verification fails, return challenge again
      return {
        status: 402,
        challenge: {
          status: 402,
          error: 'Payment Required',
          scheme: 'x402-v2',
          payTo: this.providerId,
          amountMon: this.resourcePriceMon,
          currency: 'MON',
          chainId: 10143,
          resourceId: `satellite-scene-${sceneId}`,
          challengeNonce: `nonce-retry-${Date.now()}`,
          serviceProof: `VERIFICATION_FAILED: ${err.message}`,
          expiresAt: Date.now() + 300000,
        },
      };
    }
  }
}

export const defaultSatelliteServer = new X402SatelliteServer();
