/**
 * Optional image-to-3D generation. The shop never depends on it: every product already has a
 * procedural package model. A provider (a vendor API reached through the server, never with keys in
 * the browser) can replace that model with a generated GLB. None is configured in this project, so
 * `configuredProvider()` returns null and nothing claims to generate models.
 */
import type { PackageFamily } from '../packaging'

export interface ModelJob {
  provider: string
  jobId: string
}

export type ModelPoll = { status: 'running' } | { status: 'done'; modelUrl: string } | { status: 'failed'; error: string }

export interface ModelProvider {
  id: string
  label: string
  submit(input: { productId: string; imageUrl: string; family: PackageFamily; dimsCm: [number, number, number] }): Promise<ModelJob>
  poll(job: ModelJob): Promise<ModelPoll>
  /** Downloads the finished model so it can be checked before it is stored. */
  fetchModel(url: string): Promise<ArrayBuffer>
}

export const MAX_MODEL_BYTES = 20 * 1024 * 1024

/** Checks a GLB (binary glTF 2.0) file: magic, version, declared length, size limit. */
export function validateGlb(buf: ArrayBuffer): string | null {
  if (buf.byteLength < 20) return 'The model file is empty or truncated.'
  if (buf.byteLength > MAX_MODEL_BYTES) return `The model is ${(buf.byteLength / 1048576).toFixed(1)} MB; the limit is 20 MB.`
  const v = new DataView(buf)
  if (v.getUint32(0, true) !== 0x46546c67) return 'Not a GLB file (wrong magic number).'
  if (v.getUint32(4, true) !== 2) return 'Only glTF 2.0 models are accepted.'
  if (v.getUint32(8, true) !== buf.byteLength) return 'The GLB header length does not match the file size.'
  return null
}

export interface GenerationResult {
  status: 'done' | 'failed' | 'timeout'
  modelUrl: string | null
  bytes: ArrayBuffer | null
  error: string | null
}

/**
 * Runs one generation: submit, poll until done (bounded), download and validate. Never throws:
 * failures come back as a result so the product keeps its procedural model.
 */
export async function runGeneration(
  provider: ModelProvider,
  input: Parameters<ModelProvider['submit']>[0],
  opts: { intervalMs?: number; timeoutMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<GenerationResult & { job: ModelJob | null }> {
  const interval = opts.intervalMs ?? 5000
  const timeout = opts.timeoutMs ?? 10 * 60 * 1000
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)))
  let job: ModelJob | null = null
  try {
    job = await provider.submit(input)
    for (let waited = 0; waited <= timeout; waited += interval) {
      const poll = await provider.poll(job)
      if (poll.status === 'failed') return { status: 'failed', modelUrl: null, bytes: null, error: poll.error, job }
      if (poll.status === 'done') {
        const bytes = await provider.fetchModel(poll.modelUrl)
        const invalid = validateGlb(bytes)
        if (invalid) return { status: 'failed', modelUrl: null, bytes: null, error: invalid, job }
        return { status: 'done', modelUrl: poll.modelUrl, bytes, error: null, job }
      }
      await sleep(interval)
    }
    return { status: 'timeout', modelUrl: null, bytes: null, error: 'The generation service did not finish in time.', job }
  } catch (e) {
    return { status: 'failed', modelUrl: null, bytes: null, error: e instanceof Error ? e.message : String(e), job }
  }
}

/** The provider this deployment uses, or null. No provider is configured in this project. */
export function configuredProvider(): ModelProvider | null {
  return null
}
