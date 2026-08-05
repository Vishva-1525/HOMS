import type { ExtensionRequest, GateCheckpoint, GateLog, OutpassWithStudent } from '@/lib/types'

const DB_NAME = 'homs-security-offline'
const DB_VERSION = 1

export interface CachedPassRecord {
  pass: OutpassWithStudent
  cached_at: string
}

export interface CachedAdmissionNo {
  student_id: string
  admission_no: string
}

export interface CachedEntryCode {
  code: string
  outpass_id: string
}

export interface CachedScannerName {
  id: string
  full_name: string
}

export interface SecurityScanOutboxItem {
  client_id: string
  outpass_id: string
  checkpoint: GateCheckpoint
  scanned_at: string
  scanned_by: string
  status: 'pending' | 'syncing' | 'failed'
  error?: string
  retry_count: number
}

export interface SecurityMetaRecord {
  key: string
  value: string
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('passes')) {
        db.createObjectStore('passes', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('gate_logs')) {
        const store = db.createObjectStore('gate_logs', { keyPath: 'id' })
        store.createIndex('outpass_id', 'outpass_id', { unique: false })
      }
      if (!db.objectStoreNames.contains('extensions')) {
        const store = db.createObjectStore('extensions', { keyPath: 'id' })
        store.createIndex('outpass_id', 'outpass_id', { unique: false })
      }
      if (!db.objectStoreNames.contains('admission_nos')) {
        db.createObjectStore('admission_nos', { keyPath: 'student_id' })
      }
      if (!db.objectStoreNames.contains('entry_codes')) {
        db.createObjectStore('entry_codes', { keyPath: 'code' })
      }
      if (!db.objectStoreNames.contains('scanner_names')) {
        db.createObjectStore('scanner_names', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('outbox')) {
        const store = db.createObjectStore('outbox', { keyPath: 'client_id' })
        store.createIndex('status', 'status', { unique: false })
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open security offline DB'))
  })

  return dbPromise
}

function tx<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeNames, mode)
        Promise.resolve(run(transaction))
          .then(resolve)
          .catch(reject)
        transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
      }),
  )
}

function getStore(tx: IDBTransaction, name: string): IDBObjectStore {
  const store = tx.objectStore(name)
  if (!store) throw new Error(`Missing object store: ${name}`)
  return store
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

export async function clearSecurityOfflineDb(): Promise<void> {
  const names = [
    'passes',
    'gate_logs',
    'extensions',
    'admission_nos',
    'entry_codes',
    'scanner_names',
    'outbox',
    'meta',
  ]
  await tx(names, 'readwrite', async (transaction) => {
    for (const name of names) {
      getStore(transaction, name).clear()
    }
  })
}

export async function putPasses(passes: OutpassWithStudent[]): Promise<void> {
  await tx('passes', 'readwrite', (transaction) => {
    const store = getStore(transaction, 'passes')
    for (const pass of passes) {
      store.put({ id: pass.id, pass, cached_at: new Date().toISOString() } satisfies CachedPassRecord & { id: string })
    }
  })
}

export async function getPass(outpassId: string): Promise<OutpassWithStudent | null> {
  const row = await tx('passes', 'readonly', (transaction) =>
    req(getStore(transaction, 'passes').get(outpassId)),
  )
  return (row as CachedPassRecord | undefined)?.pass ?? null
}

export async function getAllPasses(): Promise<OutpassWithStudent[]> {
  const rows = await tx('passes', 'readonly', (transaction) =>
    req(getStore(transaction, 'passes').getAll()),
  )
  return (rows as (CachedPassRecord & { id: string })[]).map((row) => row.pass)
}

export async function putGateLogs(logs: GateLog[]): Promise<void> {
  await tx('gate_logs', 'readwrite', (transaction) => {
    const store = getStore(transaction, 'gate_logs')
    for (const log of logs) store.put(log)
  })
}

export async function getGateLogsForPass(outpassId: string): Promise<GateLog[]> {
  const logs = await tx('gate_logs', 'readonly', (transaction) =>
    req(getStore(transaction, 'gate_logs').index('outpass_id').getAll(outpassId)),
  )
  return (logs as GateLog[]).sort(
    (a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime(),
  )
}

export async function getAllGateLogs(): Promise<GateLog[]> {
  const logs = await tx('gate_logs', 'readonly', (transaction) =>
    req(getStore(transaction, 'gate_logs').getAll()),
  )
  return (logs as GateLog[]).sort(
    (a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime(),
  )
}

export async function putExtensions(extensions: ExtensionRequest[]): Promise<void> {
  await tx('extensions', 'readwrite', (transaction) => {
    const store = getStore(transaction, 'extensions')
    for (const ext of extensions) store.put(ext)
  })
}

export async function getExtensionsForPass(outpassId: string): Promise<ExtensionRequest[]> {
  const rows = await tx('extensions', 'readonly', (transaction) =>
    req(getStore(transaction, 'extensions').index('outpass_id').getAll(outpassId)),
  )
  return (rows as ExtensionRequest[]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export async function putAdmissionNos(rows: CachedAdmissionNo[]): Promise<void> {
  await tx('admission_nos', 'readwrite', (transaction) => {
    const store = getStore(transaction, 'admission_nos')
    for (const row of rows) store.put(row)
  })
}

export async function getAdmissionNo(studentId: string): Promise<string | undefined> {
  const row = await tx('admission_nos', 'readonly', (transaction) =>
    req(getStore(transaction, 'admission_nos').get(studentId)),
  )
  return (row as CachedAdmissionNo | undefined)?.admission_no
}

export async function putEntryCodes(rows: CachedEntryCode[]): Promise<void> {
  await tx('entry_codes', 'readwrite', (transaction) => {
    const store = getStore(transaction, 'entry_codes')
    for (const row of rows) store.put(row)
  })
}

export async function getOutpassIdByEntryCode(code: string): Promise<string | null> {
  const row = await tx('entry_codes', 'readonly', (transaction) =>
    req(getStore(transaction, 'entry_codes').get(code)),
  )
  return (row as CachedEntryCode | undefined)?.outpass_id ?? null
}

export async function putScannerNames(rows: CachedScannerName[]): Promise<void> {
  await tx('scanner_names', 'readwrite', (transaction) => {
    const store = getStore(transaction, 'scanner_names')
    for (const row of rows) store.put(row)
  })
}

export async function getScannerNames(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {}
  const map: Record<string, string> = {}
  await tx('scanner_names', 'readonly', async (transaction) => {
    const store = getStore(transaction, 'scanner_names')
    for (const id of ids) {
      const row = (await req(store.get(id))) as CachedScannerName | undefined
      if (row?.full_name) map[id] = row.full_name
    }
  })
  return map
}

export async function addOutboxItem(item: SecurityScanOutboxItem): Promise<void> {
  await tx('outbox', 'readwrite', (transaction) => {
    getStore(transaction, 'outbox').put(item)
  })
}

export async function updateOutboxItem(item: SecurityScanOutboxItem): Promise<void> {
  await addOutboxItem(item)
}

export async function removeOutboxItem(clientId: string): Promise<void> {
  await tx('outbox', 'readwrite', (transaction) => {
    getStore(transaction, 'outbox').delete(clientId)
  })
}

export async function getPendingOutboxItems(): Promise<SecurityScanOutboxItem[]> {
  const rows = await tx('outbox', 'readonly', (transaction) =>
    req(getStore(transaction, 'outbox').getAll()),
  )
  return (rows as SecurityScanOutboxItem[])
    .filter((row) => row.status === 'pending' || row.status === 'failed')
    .sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime())
}

export async function getOutboxCount(): Promise<number> {
  const rows = await getPendingOutboxItems()
  return rows.length
}

export async function setMeta(key: string, value: string): Promise<void> {
  await tx('meta', 'readwrite', (transaction) => {
    getStore(transaction, 'meta').put({ key, value } satisfies SecurityMetaRecord)
  })
}

export async function getMeta(key: string): Promise<string | null> {
  const row = await tx('meta', 'readonly', (transaction) =>
    req(getStore(transaction, 'meta').get(key)),
  )
  return (row as SecurityMetaRecord | undefined)?.value ?? null
}
