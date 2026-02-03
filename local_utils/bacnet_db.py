import os
import sqlite3
from typing import Any, Dict, List, Optional

DB_PATH = os.path.join(os.getcwd(), "data", "bacnet_data.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_instance INTEGER UNIQUE,
            name TEXT,
            address TEXT,
            vendor TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id INTEGER,
            object_type TEXT,
            object_instance INTEGER,
            name TEXT,
            units TEXT,
            description TEXT,
            UNIQUE(device_id, object_type, object_instance)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS point_values (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            point_id INTEGER,
            ts DATETIME DEFAULT CURRENT_TIMESTAMP,
            value TEXT,
            status TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def upsert_device(device_instance: int, name: Optional[str], address: Optional[str], vendor: Optional[str]) -> int:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO devices (device_instance, name, address, vendor)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(device_instance) DO UPDATE SET
            name=excluded.name,
            address=excluded.address,
            vendor=excluded.vendor
        """,
        (device_instance, name, address, vendor),
    )
    conn.commit()
    cur.execute("SELECT id FROM devices WHERE device_instance = ?", (device_instance,))
    row = cur.fetchone()
    conn.close()
    return row["id"] if row else 0


def upsert_point(device_id: int, object_type: str, object_instance: int, name: str, units: Optional[str], description: Optional[str]) -> int:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO points (device_id, object_type, object_instance, name, units, description)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(device_id, object_type, object_instance) DO UPDATE SET
            name=excluded.name,
            units=excluded.units,
            description=excluded.description
        """,
        (device_id, object_type, object_instance, name, units, description),
    )
    conn.commit()
    cur.execute(
        "SELECT id FROM points WHERE device_id = ? AND object_type = ? AND object_instance = ?",
        (device_id, object_type, object_instance),
    )
    row = cur.fetchone()
    conn.close()
    return row["id"] if row else 0


def insert_point_value(point_id: int, value: Any, status: Optional[str]):
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO point_values (point_id, value, status) VALUES (?, ?, ?)",
        (point_id, None if value is None else str(value), status),
    )
    conn.commit()
    conn.close()


def fetch_points() -> List[Dict[str, Any]]:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT p.id, p.device_id, p.object_type, p.object_instance, d.device_instance
        FROM points p
        JOIN devices d ON d.id = p.device_id
        """
    )
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def fetch_latest_point_values() -> List[Dict[str, Any]]:
    conn = _connect()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT p.id as point_id,
               d.device_instance,
               p.object_type,
               p.object_instance,
               p.name,
               p.units,
               pv.value,
               pv.status,
               pv.ts
        FROM points p
        JOIN devices d ON d.id = p.device_id
        LEFT JOIN (
            SELECT point_id, value, status, ts
            FROM point_values
            WHERE id IN (
                SELECT MAX(id) FROM point_values GROUP BY point_id
            )
        ) pv ON pv.point_id = p.id
        ORDER BY d.device_instance, p.object_type, p.object_instance
        """
    )
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]
