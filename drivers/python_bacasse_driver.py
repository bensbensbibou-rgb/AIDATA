import argparse
import asyncio
import json
import os
import sys

from bacpypes3.app import Application
from bacpypes3.argparse import SimpleArgumentParser
from bacpypes3.apdu import ReadPropertyRequest, WhoIsRequest, IAmRequest
from bacpypes3.pdu import Address
from bacpypes3.primitivedata import (
    ObjectIdentifier,
    Real,
    Unsigned,
    Integer,
    Boolean,
    Double,
)

# Optional helper from bacnet-mcp if available
try:
    sys.path.append(os.path.join(os.getcwd(), "bacnet-mcp"))
    from server import bacnet_to_json  # type: ignore
except Exception:
    bacnet_to_json = None


class SimpleBacApp(Application):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._iam_responses = []

    async def do_IAmRequest(self, apdu: IAmRequest) -> None:  # type: ignore[override]
        self._iam_responses.append(
            {
                "device": str(getattr(apdu, "iAmDeviceIdentifier", "")),
                "address": str(getattr(apdu, "pduSource", "")),
            }
        )

    def pop_iam(self):
        out, self._iam_responses = self._iam_responses, []
        return out


async def build_app(local_ip: str, device_instance: int, bind_port: int) -> SimpleBacApp:
    # Reuse bacpypes3 CLI parser to build the stack (network + device).
    original_argv = sys.argv.copy()
    try:
        sys.argv = [
            sys.argv[0],
            "--instance",
            str(device_instance),
            "--address",
            f"{local_ip}/24",
        ]
        args = SimpleArgumentParser().parse_args()
        # force port if parser supports it
        try:
            setattr(args, "port", bind_port)
        except Exception:
            pass
        app = SimpleBacApp.from_args(args)
        if hasattr(app, "startup"):
            await app.startup()
        return app
    finally:
        sys.argv = original_argv


async def read_property(app: SimpleBacApp, target: str, obj_type: str, instance: int, prop: str, timeout: float):
    try:
        return await asyncio.wait_for(
            app.read_property(Address(target), ObjectIdentifier(f"{obj_type},{instance}"), prop),
            timeout=timeout,
        )
    except Exception:
        req = ReadPropertyRequest(
            objectIdentifier=ObjectIdentifier(f"{obj_type},{instance}"),
            propertyIdentifier=prop,
        )
        req.pduDestination = Address(target)
        ack = await asyncio.wait_for(app.request(req), timeout=timeout)
        return getattr(ack, "propertyValue", getattr(ack, "value", None))


def _simplify(val):
    """
    Best-effort simplifier for bacpypes3 values.
    """
    try:
        if hasattr(val, "get_value_type") and hasattr(val, "cast_out"):
            vt = val.get_value_type()
            if vt:
                try:
                    return val.cast_out(vt)
                except Exception:
                    pass
        if hasattr(val, "cast_out"):
            for guess in (Real, Double, Integer, Unsigned, Boolean):
                try:
                    return val.cast_out(guess)
                except Exception:
                    continue
    except Exception:
        pass

    if bacnet_to_json:
        try:
            return bacnet_to_json(val)
        except Exception:
            pass

    for attr in ("cast_out", "get_value"):
        if hasattr(val, attr):
            try:
                return getattr(val, attr)()
            except Exception:
                pass
    for attr in ("app_to_object", "app_to_any", "value"):
        if hasattr(val, attr):
            try:
                out = getattr(val, attr)()
                return _simplify(out)
            except Exception:
                try:
                    out = getattr(val, attr)
                    return _simplify(out)
                except Exception:
                    pass
    if isinstance(val, (list, tuple, set)):
        return [_simplify(v) for v in val]
    return str(val)


async def who_is(app: SimpleBacApp, broadcast: str, low_limit: int | None, high_limit: int | None, timeout: float):
    req = WhoIsRequest()
    if low_limit is not None:
        req.deviceInstanceRangeLowLimit = low_limit
    if high_limit is not None:
        req.deviceInstanceRangeHighLimit = high_limit
    req.pduDestination = Address(broadcast)
    await app.request(req)
    await asyncio.sleep(timeout)
    return app.pop_iam()


async def async_main():
    parser = argparse.ArgumentParser(description="Client BACnet minimal (bacpypes3) pour lecture rapide.")
    parser.add_argument("--host", required=True, help="Adresse IP de la cible (ex: 192.168.1.7)")
    parser.add_argument("--port", type=int, default=int(os.getenv("BACNET_PORT", "47808")), help="Port BACnet/IP cible")
    parser.add_argument("--local-ip", default=os.getenv("BACNET_HOST", "0.0.0.0"), help="IP locale a binder (ex: 192.168.1.177)")
    parser.add_argument("--device-id", type=int, default=int(os.getenv("BACNET_DEVICE_ID", "19149")), help="Instance device locale (unique sur le reseau)")
    parser.add_argument("--obj-type", default="analogValue", help="Type d'objet (ex: analogValue)")
    parser.add_argument("--instance", type=int, default=1, help="Instance de l'objet")
    parser.add_argument("--property", default="presentValue", help="Propriete a lire")
    parser.add_argument("--timeout", type=float, default=8.0, help="Timeout lecture (s)")
    parser.add_argument("--whois", action="store_true", help="Effectuer un Who-Is au lieu d'une lecture")
    parser.add_argument("--whois-timeout", type=float, default=3.0, help="Temps d'attente des I-Am apres Who-Is")
    parser.add_argument("--whois-low", type=int, default=None, help="Plancher Who-Is (optionnel)")
    parser.add_argument("--whois-high", type=int, default=None, help="Plafond Who-Is (optionnel)")
    parser.add_argument("--json-out", action="store_true", help="Retour JSON sur stdout")
    parser.add_argument("--bind-port", type=int, default=int(os.getenv("BACNET_BIND_PORT", "47809")), help="Port local de bind BACnet (evite le conflit avec d'autres services)")
    args = parser.parse_args()

    target = f"{args.host}:{args.port}"
    app = await build_app(args.local_ip, args.device_id, args.bind_port)
    try:
        if args.whois:
            devices = await who_is(
                app,
                broadcast=f"{args.host}:47808" if ":" not in args.host else args.host,
                low_limit=args.whois_low,
                high_limit=args.whois_high,
                timeout=args.whois_timeout,
            )
            payload = {"devices": devices}
            print(json.dumps(payload, ensure_ascii=False) if args.json_out else payload)
            return

        value = await read_property(app, target, args.obj_type, args.instance, args.property, args.timeout)
        payload = {
            "target": target,
            "object": f"{args.obj_type}:{args.instance}",
            "property": args.property,
            "dtype": type(value).__name__,
            "value": _simplify(value),
            "raw": str(value),
        }
        print(json.dumps(payload, ensure_ascii=False) if args.json_out else payload)
    finally:
        if hasattr(app, "close"):
            app.close()
        elif hasattr(app, "shutdown"):
            await app.shutdown()


if __name__ == "__main__":
    try:
        asyncio.run(async_main())
    except KeyboardInterrupt:
        pass
