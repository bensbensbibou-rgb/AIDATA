from bacnet_mcp.settings import Settings

def get_device(
    settings: Settings,
    name: str | None = None,
    host: str | None = None,
    port: int | None = None,
) -> tuple[str, int]:
    """Find a device by name, or return the default settings."""
    if name:
        for device in settings.devices:
            if device.name == name:  # Utilisez la notation par points pour accéder aux attributs
                return device.host, device.port
        raise RuntimeError("Device not found")
    return (
        host if host is not None else settings.bacnet.host,
        port if port is not None else settings.bacnet.port,
    )
