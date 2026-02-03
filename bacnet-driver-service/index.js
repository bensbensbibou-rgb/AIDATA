const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const cors = require('cors');
const os = require('os');
const { Server } = require('socket.io');
const Bacnet = require('@biancoroyal/bacstack');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const PORT = parseInt(process.env.PORT || '8100', 10);
const BACNET_PORT = parseInt(process.env.BACNET_PORT || '47808', 10);
const BACNET_DEVICE_ID = parseInt(process.env.BACNET_MCP_DEVICE_INSTANCE || process.env.BACNET_DEVICE_ID || '19149', 10);
const POLL_MS = parseInt(process.env.POLL_MS || '5000', 10);
const PG_URL = process.env.PG_URL || 'postgres://user:password@localhost:5432/mydb';
const PG_TABLE = process.env.PG_TABLE || 'bacnet_history';
const WHOIS_LOW = parseInt(process.env.BACNET_WHOIS_LOW || '0', 10);
const WHOIS_HIGH = parseInt(process.env.BACNET_WHOIS_HIGH || '4194303', 10);
const TARGET_HOST = process.env.BACNET_MCP_TARGET_HOST || process.env.BACNET_TARGET_HOST || null;
const TARGET_PORT = parseInt(process.env.BACNET_MCP_TARGET_PORT || process.env.BACNET_TARGET_PORT || '47808', 10);

function parseMaxSegmentsEnv(raw) {
  const token = String(raw ?? '').trim().toUpperCase();
  const map = {
    '0': Bacnet.enum.MaxSegmentsAccepted.SEGMENTS_0,
    '2': Bacnet.enum.MaxSegmentsAccepted.SEGMENTS_2,
    '4': Bacnet.enum.MaxSegmentsAccepted.SEGMENTS_4,
    '8': Bacnet.enum.MaxSegmentsAccepted.SEGMENTS_8,
    '16': Bacnet.enum.MaxSegmentsAccepted.SEGMENTS_16,
    '32': Bacnet.enum.MaxSegmentsAccepted.SEGMENTS_32,
    '64': Bacnet.enum.MaxSegmentsAccepted.SEGMENTS_64,
    'MORE_THAN_64': Bacnet.enum.MaxSegmentsAccepted.MORE_THAN_64,
    'MORE': Bacnet.enum.MaxSegmentsAccepted.MORE_THAN_64,
    'UNLIMITED': Bacnet.enum.MaxSegmentsAccepted.MORE_THAN_64
  };
  if (map[token]) return map[token];
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    if (numeric <= 0) return map['0'];
    if (numeric <= 2) return map['2'];
    if (numeric <= 4) return map['4'];
    if (numeric <= 8) return map['8'];
    if (numeric <= 16) return map['16'];
    if (numeric <= 32) return map['32'];
    if (numeric <= 64) return map['64'];
    return map['MORE_THAN_64'];
  }
  return map['MORE_THAN_64'];
}

function parseMaxApduEnv(raw) {
  const token = String(raw ?? '').trim().toUpperCase();
  const map = {
    '50': Bacnet.enum.MaxApduLengthAccepted.OCTETS_50,
    '128': Bacnet.enum.MaxApduLengthAccepted.OCTETS_128,
    '206': Bacnet.enum.MaxApduLengthAccepted.OCTETS_206,
    '480': Bacnet.enum.MaxApduLengthAccepted.OCTETS_480,
    '1024': Bacnet.enum.MaxApduLengthAccepted.OCTETS_1024,
    '1476': Bacnet.enum.MaxApduLengthAccepted.OCTETS_1476
  };
  if (map[token]) return map[token];
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    if (numeric <= 50) return map['50'];
    if (numeric <= 128) return map['128'];
    if (numeric <= 206) return map['206'];
    if (numeric <= 480) return map['480'];
    if (numeric <= 1024) return map['1024'];
    return map['1476'];
  }
  return map['1476'];
}

const BACNET_READ_OPTS = {
  // Allow segmented responses by default (tunable via env if a device is picky)
  maxSegments: parseMaxSegmentsEnv(process.env.BACNET_MAX_SEGMENTS || 'MORE'),
  maxApdu: parseMaxApduEnv(process.env.BACNET_MAX_APDU || '1476')
};

// Maps and in-memory state
let points = []; // [{point_id, device_id, object_type, instance, property_id, name}]
const deviceAddress = new Map(); // device_id -> address (string)
const lastValues = new Map(); // point_id -> { value, ts }
const configState = {
  host: process.env.BACNET_HOST || '0.0.0.0',
  port: BACNET_PORT,
  localAddress: process.env.BACNET_LOCAL_ADDRESS || '0.0.0.0',
  targetHost: TARGET_HOST,
  targetPort: TARGET_PORT
};

// BACnet client
const bacnet = new Bacnet({
  port: BACNET_PORT,
  interface: process.env.BACNET_HOST || '0.0.0.0',
  broadcastAddress: process.env.BACNET_BROADCAST || '255.255.255.255',
  deviceId: BACNET_DEVICE_ID
});
bacnet.on('iAm', (dev) => {
  if (dev && typeof dev.deviceId === 'number' && dev.address) {
    deviceAddress.set(dev.deviceId, dev.address);
  }
});

// PostgreSQL
const pool = new Pool({ connectionString: PG_URL });
let dbReady = false;

async function ensureTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS ${PG_TABLE} (
      id serial PRIMARY KEY,
      point_id text NOT NULL,
      device_id integer NOT NULL,
      object_type text NOT NULL,
      instance integer NOT NULL,
      property text NOT NULL,
      value jsonb,
      ts timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ${PG_TABLE}_point_ts_idx ON ${PG_TABLE}(point_id, ts DESC);
  `;
  await pool.query(sql);
  dbReady = true;
}

// Utilities
function toPointId(p) {
  return `${p.device_id}:${p.object_type}:${p.instance}:${p.property_id || 'presentValue'}`;
}

function parseObjectType(raw) {
  if (typeof raw === 'number') return raw;
  const s = String(raw || '').toLowerCase();
  const map = {
    'analoginput': 0, 'ai': 0, 'analog-input': 0,
    'analogoutput': 1, 'ao': 1, 'analog-output': 1,
    'analogvalue': 2, 'av': 2, 'analog-value': 2,
    'binaryinput': 3, 'bi': 3, 'binary-input': 3,
    'binaryoutput': 4, 'bo': 4, 'binary-output': 4,
    'binaryvalue': 5, 'bv': 5, 'binary-value': 5,
    'multistateinput': 13, 'msi': 13, 'multi-state-input': 13,
    'multistateoutput': 14, 'mso': 14, 'multi-state-output': 14,
    'multistatevalue': 19, 'msv': 19, 'multi-state-value': 19,
    'device': 8
  };
  return map[s] ?? 0;
}

async function insertHistory(row) {
  if (!dbReady) return;
  const sql = `INSERT INTO ${PG_TABLE} (point_id, device_id, object_type, instance, property, value, ts)
               VALUES ($1,$2,$3,$4,$5,$6, now())`;
  const params = [
    row.point_id,
    row.device_id,
    row.object_type,
    row.instance,
    row.property_id || 'presentValue',
    row.value
  ];
  try {
    await pool.query(sql, params);
  } catch (err) {
    console.error('Insert history failed', err.message);
  }
}

function unwrapValue(val) {
  if (val && Array.isArray(val.values) && val.values[0]) return val.values[0].value;
  if (Array.isArray(val) && val[0] && val[0].value !== undefined) return val[0].value;
  return val;
}

function parseAddr(hostOrIp) {
  if (!hostOrIp) return null;
  return hostOrIp.includes(':') ? hostOrIp : `${hostOrIp}:${configState.targetPort || BACNET_PORT}`;
}

function parsePropertyId(propertyId) {
  if (propertyId === undefined || propertyId === null || propertyId === '') {
    return Bacnet.enum.PropertyIdentifier.PRESENT_VALUE;
  }
  const num = Number(propertyId);
  if (Number.isFinite(num)) return num;
  const direct = Bacnet.enum.PropertyIdentifier[propertyId];
  if (direct !== undefined) return direct;
  const upper = Bacnet.enum.PropertyIdentifier[String(propertyId).toUpperCase()];
  if (upper !== undefined) return upper;
  return Bacnet.enum.PropertyIdentifier.PRESENT_VALUE;
}

function readPropertyOnce({ targetHost, objectType, instance, propertyId }) {
  return new Promise((resolve) => {
    const addr = parseAddr(targetHost);
    if (!addr) return resolve({ error: 'no_address' });
    const objectId = { type: parseObjectType(objectType), instance: Number(instance) };
    const propId = parsePropertyId(propertyId);
    bacnet.readProperty(addr, objectId, propId, BACNET_READ_OPTS, (err, value) => {
      if (err) return resolve({ error: err.message });
      resolve({ value: unwrapValue(value), raw: value });
    });
  });
}

function readObjectList(host) {
  return new Promise((resolve) => {
    const addr = parseAddr(host);
    if (!addr) return resolve({ error: 'no_address' });
    const objectId = { type: Bacnet.enum.ObjectType.DEVICE, instance: configState.targetInstance || 1007 };
    const propId = Bacnet.enum.PropertyIdentifier.OBJECT_LIST;
    bacnet.readProperty(addr, objectId, propId, BACNET_READ_OPTS, (err, value) => {
      if (err) return resolve({ error: err.message });
      try {
        const list = [];
        const arr = value?.values?.[0]?.value || [];
        for (const item of arr) {
          if (item?.objectIdentifier?.type !== undefined && item.objectIdentifier.instance !== undefined) {
            list.push({ type: item.objectIdentifier.type, instance: item.objectIdentifier.instance });
          }
        }
        return resolve({ items: list });
      } catch (e) {
        return resolve({ error: e.message });
      }
    });
  });
}

function readPoint(point) {
  return new Promise((resolve) => {
    const addr = deviceAddress.get(point.device_id) || (configState.targetHost ? `${configState.targetHost}:${configState.targetPort}` : null);
    if (!addr) return resolve({ error: 'no_address' });
    const objectId = { type: point.object_type_num, instance: point.instance };
    const propId = point.property_id_num ?? Bacnet.enum.PropertyIdentifier.PRESENT_VALUE;
    bacnet.readProperty(addr, objectId, propId, BACNET_READ_OPTS, (err, value) => {
      if (err) {
        console.warn(`readProperty failed d${point.device_id} ${point.object_type}:${point.instance} @${addr}: ${err.message}`);
        return resolve({ error: err.message });
      }
      resolve({ value });
    });
  });
}

function writePoint(body) {
  return new Promise((resolve) => {
    const addr = deviceAddress.get(body.device_id);
    if (!addr) return resolve({ error: 'no_address' });
    const objectId = { type: parseObjectType(body.object_type), instance: Number(body.instance) };
    const propId = body.property_id_num ?? Bacnet.enum.PropertyIdentifier.PRESENT_VALUE;
    const priority = body.priority ? Number(body.priority) : undefined;
    const val = [
      {
        objectId,
        property: { id: propId, index: 0 },
        value: [{ type: Bacnet.enum.ApplicationTags.REAL, value: body.value }],
        priority
      }
    ];
    bacnet.writePropertyMultiple(addr, val, (err) => {
      if (err) return resolve({ error: err.message });
      resolve({ ok: true });
    });
  });
}

// Polling loop
async function pollLoop() {
  for (const p of points) {
    try {
      const res = await readPoint(p);
      if (res && !res.error) {
        const plain = unwrapValue(res.value);
        const ts = new Date().toISOString();
        lastValues.set(p.point_id, { value: plain, ts });
        emitValueUpdate(p.point_id, plain, ts);
        await insertHistory({
          point_id: p.point_id,
          device_id: p.device_id,
          object_type: String(p.object_type),
          instance: p.instance,
          property_id: p.property_id,
          value: plain
        });
      }
    } catch (err) {
      // Ignore per-point errors
    }
  }
}

setInterval(pollLoop, POLL_MS);

// Express app + WebSocket
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PY_BACASSE = path.join(__dirname, '..', 'drivers', 'python_bacasse_driver.py');
const PYTHON_DEFAULT_TIMEOUT = Number(process.env.BACNET_PY_TIMEOUT || 20000);
const PYTHON_POLL_LIMIT = Number(process.env.BACNET_PYTHON_POLL_LIMIT || 50);
const PYTHON_POLL_MS = Number(process.env.BACNET_PYTHON_POLL_MS || 15000);

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '2mb' }));

const upload = multer({ dest: path.join(__dirname, 'uploads') });

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/health/full', (_req, res) => res.json({ status: 'ok', dbReady }));

// Expose network interfaces for the UI
app.get(['/api/bacnet/interfaces', '/interfaces'], (_req, res) => {
  const nets = os.networkInterfaces();
  const list = [];
  for (const [name, addrs] of Object.entries(nets)) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) {
        list.push({ name, ip: a.address });
      }
    }
  }
  list.unshift({ name: 'All Interfaces (0.0.0.0)', ip: '0.0.0.0' });
  res.json({ interfaces: list });
});

app.get(['/config', '/api/bacnet/config'], (_req, res) => {
  res.json({
    host: configState.host,
    port: configState.port,
    localAddress: configState.localAddress,
    targetHost: configState.targetHost,
    targetPort: configState.targetPort,
    bacnet_port_runtime: BACNET_PORT
  });
});

app.post(['/config', '/api/bacnet/config'], (req, res) => {
  const body = req.body || {};
  if (body.host) configState.host = body.host;
  if (body.localAddress) configState.localAddress = body.localAddress;
  if (body.port) configState.port = Number(body.port);
  if (body.targetHost) configState.targetHost = body.targetHost;
  if (body.targetPort) configState.targetPort = Number(body.targetPort);
  res.json({ status: 'ok', config: configState, restart_required_for_bacnet_port: true });
});

// Debug: dump object list from device
app.get('/debug/object-list', async (req, res) => {
  const host = req.query.host || configState.targetHost;
  if (!host) return res.status(400).json({ error: 'host required' });
  try {
    const result = await readObjectList(host);
    if (result.error) return res.status(502).json(result);
    res.json({ status: 'ok', host, count: result.items.length, items: result.items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Python helper endpoints (bacpypes3 script) ---
function runPythonBacasse(args, timeoutMs = PYTHON_DEFAULT_TIMEOUT) {
  return new Promise((resolve) => {
    const child = spawn('python', [PY_BACASSE, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: null, stdout: stdout.trim(), stderr: `${stderr.trim()} ${err.message}`.trim() });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

app.get('/python/read', async (req, res) => {
  const host = req.query.host || configState.targetHost;
  const objType = req.query.type;
  const instance = req.query.instance;
  const property = req.query.property || 'presentValue';
  if (!host || !objType || instance === undefined) {
    return res.status(400).json({ error: 'host, type, instance required' });
  }
  const bindPort = process.env.BACNET_BIND_PORT || process.env.BACNET_TOOL_BIND_PORT || '47809';
  const localIp = configState.host || configState.localAddress || '0.0.0.0';
  const args = [
    '--host', String(host).split(':')[0],
    '--port', String(req.query.port || configState.targetPort || BACNET_PORT),
    '--local-ip', localIp,
    '--device-id', String(BACNET_DEVICE_ID),
    '--bind-port', String(bindPort),
    '--obj-type', String(objType),
    '--instance', String(instance),
    '--property', String(property),
    '--timeout', String(req.query.timeout || 8),
    '--json-out'
  ];
  const result = await runPythonBacasse(args);
  if (result.code !== 0) {
    return res.status(502).json({ error: 'python_error', code: result.code, stderr: result.stderr, stdout: result.stdout });
  }
  try {
    const parsed = JSON.parse(result.stdout);
    return res.json({ status: 'ok', ...parsed });
  } catch (err) {
    return res.status(502).json({ error: 'parse_error', stderr: result.stderr, stdout: result.stdout });
  }
});

app.post('/scan/python', async (req, res) => {
  const body = req.body || {};
  const broadcast = body.host || body.broadcast || process.env.BACNET_BROADCAST || '255.255.255.255';
  const bindPort = process.env.BACNET_BIND_PORT || process.env.BACNET_TOOL_BIND_PORT || '47809';
  const localIp = configState.host || configState.localAddress || '0.0.0.0';
  const args = [
    '--host', String(broadcast),
    '--port', String(configState.targetPort || BACNET_PORT),
    '--local-ip', localIp,
    '--device-id', String(BACNET_DEVICE_ID),
    '--bind-port', String(bindPort),
    '--whois',
    '--whois-timeout', String(body.timeout || 3),
    '--json-out'
  ];
  if (body.low !== undefined) args.push('--whois-low', String(body.low));
  if (body.high !== undefined) args.push('--whois-high', String(body.high));
  const result = await runPythonBacasse(args, Number(body.timeout || 5) * 3000 + PYTHON_DEFAULT_TIMEOUT);
  if (result.code !== 0) {
    return res.status(502).json({ error: 'python_error', code: result.code, stderr: result.stderr, stdout: result.stdout });
  }
  try {
    const parsed = JSON.parse(result.stdout);
    let devices = Array.isArray(parsed.devices) ? parsed.devices : [];

    // Fallback: if Who-Is found nothing, but an EDE est chargee, fabriquer les devices depuis points.
    if (devices.length === 0 && points.length > 0) {
      const byDevice = new Map();
      for (const p of points) {
        if (!byDevice.has(p.device_id)) {
          byDevice.set(p.device_id, {
            device: `device,${p.device_id}`,
            address: configState.targetHost ? `${configState.targetHost}:${configState.targetPort || BACNET_PORT}` : '',
          });
        }
      }
      devices = Array.from(byDevice.values());
    }

    // Base probes if no EDE loaded
    const defaultProbes = [
      { type: 'analogValue', instance: 1, property: 'presentValue' },
      { type: 'analogValue', instance: 2, property: 'presentValue' }
    ];
    const probes = body.probes || defaultProbes;
    const enrichLimit = Number(body.enrich_limit || 20);

    const withObjects = [];
    for (const dev of devices) {
      const address = dev.address || dev.device || dev.ip || '';
      const deviceIdStr = String(dev.device || dev.deviceId || dev.id || '').replace('device,', '');
      const deviceId = Number(deviceIdStr) || 0;
      const objects = [];

      // Inject all EDE points for this device into the tree
      const edePoints = points.filter((p) => p.device_id === deviceId);
      for (const ep of edePoints) {
        const lv = lastValues.get(ep.point_id);
        objects.push({
          id: `${ep.object_type}:${ep.instance}`,
          type: ep.object_type,
          instance: ep.instance,
          name: ep.name || `${ep.object_type} ${ep.instance}`,
          presentValue: lv?.value ?? null,
          description: ep.description || null,
          units: ep.unit || null
        });
      }

      // Opportunistic read of a subset (probes) to populate values
      let readsDone = 0;
      for (const p of probes) {
        if (readsDone >= enrichLimit) break;
        const argsRead = [
          '--host', String(address).split(':')[0] || String(body.host || broadcast),
          '--port', String(body.target_port || configState.targetPort || BACNET_PORT),
          '--local-ip', localIp,
          '--device-id', String(BACNET_DEVICE_ID),
          '--obj-type', String(p.type || 'analogValue'),
          '--instance', String(p.instance || 1),
          '--property', String(p.property || 'presentValue'),
          '--timeout', String(body.timeout || 5),
          '--json-out'
        ];
        const r = await runPythonBacasse(argsRead, Number(body.timeout || 5) * 2000 + 2000);
        if (r.code === 0) {
          try {
            const j = JSON.parse(r.stdout);
            objects.push({
              id: `${p.type}:${p.instance}`,
              type: p.type,
              instance: p.instance,
              presentValue: j.value,
              name: `${p.type} ${p.instance}`
            });
            readsDone += 1;
          } catch (e) {
            // ignore parse errors
          }
        }
      }
      withObjects.push({
        deviceId,
        name: `Device ${deviceId || 'N/A'}`,
        address,
        vendor: null,
        lastSeen: null,
        objects
      });
    }

    return res.json({ status: 'ok', devices: withObjects });
  } catch (err) {
    return res.status(502).json({ error: 'parse_error', stderr: result.stderr, stdout: result.stdout });
  }
});

// Debug: read a single BACnet property quickly
app.get('/debug/read', async (req, res) => {
  const host = req.query.host || configState.targetHost;
  const type = req.query.type;
  const instance = req.query.instance;
  const property = req.query.property || 'presentValue';
  if (!host || !type || instance === undefined) {
    return res.status(400).json({ error: 'host, type, instance required' });
  }
  try {
    const result = await readPropertyOnce({ targetHost: host, objectType: type, instance, propertyId: property });
    if (result.error) return res.status(502).json(result);
    res.json({ status: 'ok', host, type, instance: Number(instance), property, value: result.value, raw: result.raw });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/scan', (_req, res) => {
  bacnet.whoIs({ lowLimit: WHOIS_LOW, highLimit: WHOIS_HIGH });
  const devices = getDevicesResponse();
  res.json({ status: 'scan_started', devices });
});

app.post('/ede/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file missing' });
  const rows = [];
  const filePath = req.file.path;

  // Fallback parser for EDE sans headers (lignes "OBJECT_ANALOG_INPUT:102;1007;Name;...").
  const manualParse = () => {
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('PROJECT_') || trimmed.startsWith('VERSION_') || trimmed.startsWith('TIMESTAMP_') || trimmed.startsWith('AUTHOR_')) continue;
        if (!trimmed.startsWith('OBJECT_')) continue;
        const cols = trimmed.split(';');
        if (cols.length < 3) continue;
        const typeInst = cols[0] || '';
        const device_id = Number(cols[1]);
        const name = cols[2] || '';
        // instance : try after colon, else column 4
        const afterColon = typeInst.split(':')[1];
        const instance = Number(afterColon || cols[4]);
        const object_type_raw = typeInst.split(':')[0].replace(/^OBJECT_/i, '').replace(/_/g, '');
        const description = cols[5] || null;
        const unit = cols[cols.length - 1] || null;
        if (!Number.isFinite(device_id) || !Number.isFinite(instance)) continue;
        const object_type_num = parseObjectType(object_type_raw);
        const property_id = 'presentValue';
        const property_id_num = Bacnet.enum.PropertyIdentifier.PRESENT_VALUE;
        const point = {
          device_id,
          object_type: object_type_raw || 'analogInput',
          object_type_num,
          instance,
          property_id,
          property_id_num,
          name: name || `${object_type_raw}-${instance}`,
          description,
          unit
        };
        point.point_id = toPointId(point);
        rows.push(point);
      }
    } catch (e) {
      // ignore
    }
  };

  // Try CSV parser first (with headers)
  let parsedWithHeaders = false;
  const stream = fs.createReadStream(filePath)
    .pipe(csv({ separator: ';' }))
    .on('data', (row) => {
      try {
        const device_id = Number(row.device_id || row.DEVICE_ID || row.DeviceId || row.DeviceID);
        const object_type_raw = row.object_type || row.OBJECT_TYPE || row.ObjectType;
        const instance = Number(row.instance || row.INSTANCE || row.ObjectInstance);
        const name = row.name || row.NAME || row.ObjectName || row.object_name;
        const property_id = row.property || row.PROPERTY || row.Property || 'presentValue';
        const description = row.description || row.DESCRIPTION || row.Desc || null;
        const unit = row.unit || row.UNIT || row.units || row.Units || null;
        if (!Number.isFinite(device_id) || !Number.isFinite(instance)) return;
        const object_type_num = parseObjectType(object_type_raw);
        const property_id_num =
          Bacnet.enum.PropertyIdentifier[property_id] ??
          Bacnet.enum.PropertyIdentifier.PRESENT_VALUE;
        const point = {
          device_id,
          object_type: object_type_raw || 'analogInput',
          object_type_num,
          instance,
          property_id,
          property_id_num,
          name: name || `${object_type_raw}-${instance}`,
          description,
          unit
        };
        point.point_id = toPointId(point);
        rows.push(point);
        parsedWithHeaders = true;
      } catch (err) {
        // ignore invalid rows
      }
    })
    .on('end', () => {
      if (!parsedWithHeaders && rows.length === 0) {
        manualParse();
      }
      points = rows;
      fs.unlink(filePath, () => {});
      broadcastTree();
      res.json({ status: 'ok', points: points.length, devices: new Set(rows.map(r => r.device_id)).size });
    })
    .on('error', (err) => {
      fs.unlink(filePath, () => {});
      res.status(500).json({ error: err.message });
    });
});

app.get('/points', (_req, res) => {
  res.json({
    points: points.map((p) => ({
      ...p,
      address: deviceAddress.get(p.device_id) || null,
      value: lastValues.get(p.point_id)?.value ?? null,
      ts: lastValues.get(p.point_id)?.ts ?? null
    }))
  });
});

app.post('/write', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.device_id || body.instance === undefined || !body.object_type) {
      return res.status(400).json({ error: 'device_id, object_type, instance required' });
    }
    const result = await writePoint(body);
    if (result.error) return res.status(500).json(result);
    const pid = toPointId({
      device_id: body.device_id,
      object_type: body.object_type,
      instance: Number(body.instance),
      property_id: body.property_id || 'presentValue'
    });
    const now = new Date().toISOString();
    lastValues.set(pid, { value: body.value, ts: now });
    emitValueUpdate(pid, body.value, now);
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/history', async (req, res) => {
  const { point_id, from, to, limit = 1000 } = req.query;
  if (!point_id) return res.status(400).json({ error: 'point_id required' });
  const params = [point_id];
  let sql = `SELECT point_id, value, ts FROM ${PG_TABLE} WHERE point_id=$1`;
  if (from) {
    params.push(new Date(from));
    sql += ` AND ts >= $${params.length}`;
  }
  if (to) {
    params.push(new Date(to));
    sql += ` AND ts <= $${params.length}`;
  }
  params.push(Math.min(Number(limit) || 1000, 5000));
  sql += ` ORDER BY ts DESC LIMIT $${params.length}`;
  try {
    const r = await pool.query(sql, params);
    res.json({ items: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// WebSocket events
io.on('connection', (socket) => {
  socket.emit('points_tree', getTree());
});

function getTree() {
  const devices = new Map();
  for (const p of points) {
    const key = p.device_id;
    if (!devices.has(key)) {
      devices.set(key, {
        device_id: p.device_id,
        address: deviceAddress.get(p.device_id) || null,
        points: []
      });
    }
    const d = devices.get(key);
    const lv = lastValues.get(p.point_id);
    d.points.push({
      id: p.point_id,
      name: p.name,
      description: p.description || null,
      unit: p.unit || null,
      object_type: p.object_type,
      instance: p.instance,
      property: p.property_id,
      value: lv?.value ?? null,
      ts: lv?.ts ?? null
    });
  }
  return Array.from(devices.values());
}

function broadcastTree() {
  io.emit('points_tree', getTree());
}

function emitValueUpdate(point_id, value, ts) {
  io.emit('point_update', { point_id, value, ts });
}

// Periodic python polling to fill lastValues from EDE points
async function pollPythonPoints() {
  if (!points.length) return;
  const fallbackHost =
    configState.targetHost ||
    TARGET_HOST ||
    process.env.BACNET_MCP_TARGET_HOST ||
    process.env.BACNET_TARGET_HOST ||
    '';
  if (!fallbackHost) return;

  const subset = points.slice(0, PYTHON_POLL_LIMIT);
  for (const p of subset) {
    try {
      const localIp = configState.host || configState.localAddress || '0.0.0.0';
      const bindPort = process.env.BACNET_BIND_PORT || process.env.BACNET_TOOL_BIND_PORT || '47809';
      const args = [
        '--host', fallbackHost,
        '--port', String(configState.targetPort || BACNET_PORT),
        '--local-ip', localIp,
        '--device-id', String(BACNET_DEVICE_ID),
        '--bind-port', String(bindPort),
        '--obj-type', String(p.object_type),
        '--instance', String(p.instance),
        '--property', String(p.property_id || 'presentValue'),
        '--timeout', '8',
        '--json-out'
      ];
      const r = await runPythonBacasse(args, PYTHON_DEFAULT_TIMEOUT);
      if (r.code === 0) {
        try {
          const j = JSON.parse(r.stdout);
          const ts = new Date().toISOString();
          lastValues.set(p.point_id, { value: j.value, ts });
          emitValueUpdate(p.point_id, j.value, ts);
        } catch (e) {
          // ignore parse errors
        }
      }
    } catch (err) {
      // ignore per-point errors
    }
  }
}

setInterval(pollPythonPoints, PYTHON_POLL_MS);

function getDevicesResponse() {
  return getTree().map((d) => ({
    deviceId: d.device_id,
    name: `Device ${d.device_id}`,
    address: d.address,
    objects: d.points.map((p) => ({
      id: `${p.object_type}:${p.instance}`,
      name: p.name,
      type: p.object_type,
      instance: p.instance,
      presentValue: p.value ?? null,
      description: p.description,
      units: p.unit
    }))
  }));
}

ensureTable()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`BACnet driver service listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to init DB (service still starting, history disabled)', err?.message || err);
    server.listen(PORT, () => {
      console.log(`BACnet driver service listening on ${PORT} (DB not ready, history disabled)`);
    });
  });

