import unitsCsv from '../ede/QID_Units.CSV?raw';
import objectTypesCsv from '../ede/QID_ObjTypes.CSV?raw';
import stateTextsCsv from '../ede/QID_StateTexts.CSV?raw';

export interface EDEObject {
  keyName: string;
  objectName: string;
  objectType: string;
  objectTypeCode: number;
  objectInstance: number;
  description?: string;
  commandable?: boolean;
  minPresentValue?: number;
  maxPresentValue?: number;
  hiLimit?: number;
  lowLimit?: number;
  units?: string;
  unitCode?: number;
  stateTextReference?: string;
  stateText?: string[];
}

export interface EDEDevice {
  deviceInstance: number;
  deviceName: string;
  objects: EDEObject[];
}

const UNIT_LOOKUP = buildLookup(unitsCsv);
const OBJECT_TYPE_LOOKUP = buildLookup(objectTypesCsv);
const STATE_TEXT_LOOKUP = buildStateTextLookup(stateTextsCsv);

export function parseEDEFile(content: string): EDEDevice[] {
  if (!content) {
    return [];
  }

  const devices = new Map<number, EDEDevice>();
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const columns = splitCsvLine(rawLine);
    if (columns.length < 5) continue;

    const [
      keyNameRaw,
      deviceInstanceRaw,
      objectNameRaw,
      objectTypeRaw,
      objectInstanceRaw,
      descriptionRaw,
      minPVRaw,
      maxPVRaw,
      commandableRaw,
      hiLimitRaw,
      lowLimitRaw,
      stateTextRefRaw,
      unitCodeRaw,
    ] = [
      columns[0],
      columns[1],
      columns[2],
      columns[3],
      columns[4],
      columns[5],
      columns[6],
      columns[7],
      columns[8],
      columns[9],
      columns[10],
      columns[11],
      columns[12],
    ];

    const deviceInstance = parseNumber(deviceInstanceRaw);
    const objectTypeCode = parseNumber(objectTypeRaw);
    const objectInstance = parseNumber(objectInstanceRaw);

    if (Number.isNaN(deviceInstance) || Number.isNaN(objectTypeCode)) {
      continue;
    }

    const device = ensureDevice(devices, deviceInstance);
    const objectName = cleanValue(objectNameRaw);

    if (objectTypeCode === 8) {
      if (objectName) {
        device.deviceName = objectName;
      }
      continue;
    }

    const unitCode = parseNumber(unitCodeRaw);
    const stateTextReference = cleanValue(stateTextRefRaw);

    const edeObject: EDEObject = {
      keyName: cleanValue(keyNameRaw) || `Object_${objectInstance}`,
      objectName: objectName || cleanValue(keyNameRaw) || `Object ${objectInstance}`,
      objectType:
        OBJECT_TYPE_LOOKUP.get(String(objectTypeCode)) ||
        `type_${objectTypeCode}`,
      objectTypeCode,
      objectInstance: Number.isNaN(objectInstance) ? 0 : objectInstance,
      description: cleanValue(descriptionRaw),
      commandable: normalizeBoolean(commandableRaw),
      minPresentValue: parseFloatSafe(minPVRaw),
      maxPresentValue: parseFloatSafe(maxPVRaw),
      hiLimit: parseFloatSafe(hiLimitRaw),
      lowLimit: parseFloatSafe(lowLimitRaw),
      units: UNIT_LOOKUP.get(String(unitCode)) || undefined,
      unitCode: Number.isNaN(unitCode) ? undefined : unitCode,
      stateTextReference,
      stateText: stateTextReference ? STATE_TEXT_LOOKUP.get(stateTextReference) : undefined,
    };

    device.objects.push(edeObject);
  }

  return Array.from(devices.values())
    .sort((a, b) => a.deviceInstance - b.deviceInstance)
    .map((device) => ({
      ...device,
      objects: device.objects.sort((a, b) => a.objectInstance - b.objectInstance),
    }));
}

function ensureDevice(store: Map<number, EDEDevice>, deviceInstance: number) {
  if (!store.has(deviceInstance)) {
    store.set(deviceInstance, {
      deviceInstance,
      deviceName: `Device ${deviceInstance}`,
      objects: [],
    });
  }
  return store.get(deviceInstance)!;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function cleanValue(value?: string) {
  if (!value) return '';
  return value.replace(/^"+|"+$/g, '').trim();
}

function parseNumber(value?: string) {
  if (typeof value === 'number') return value;
  if (!value) return Number.NaN;
  const normalized = value.replace(/,/g, '.');
  const parsed = parseInt(normalized, 10);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

function parseFloatSafe(value?: string) {
  if (!value) return undefined;
  const normalized = value.replace(/,/g, '.');
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeBoolean(value?: string) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized.startsWith('y') || normalized === '1' || normalized === 'true';
}

function buildLookup(csv: string) {
  const map = new Map<string, string>();
  if (!csv) return map;

  const lines = csv.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const [key, value] = splitCsvLine(rawLine);
    if (!key) continue;
    map.set(cleanValue(key), cleanValue(value));
  }

  return map;
}

function buildStateTextLookup(csv: string) {
  const map = new Map<string, string[]>();
  if (!csv) return map;

  const lines = csv.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = splitCsvLine(rawLine).map(cleanValue);
    if (!parts.length) continue;
    const [key, ...texts] = parts;
    if (!key) continue;
    map.set(
      key,
      texts.filter(Boolean)
    );
  }
  return map;
}
