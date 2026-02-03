from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

class Auth(BaseModel):
    key: str | None = None

class BACnet(BaseModel):
    host: str = "192.168.1.149"
    port: int = 47808
    instance: int = 1235
    network: int = 1

class Device(BaseModel):
    name: str
    host: str
    port: int

class Settings(BaseSettings):
    auth: Auth = Auth()
    bacnet: BACnet = BACnet()
    devices: list[Device] = [
        Device(name="1007", host="192.168.1.7", port=47808),
        Device(name="poste_pilotage", host="192.168.1.149", port=47808)
    ]
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        env_prefix="BACNET_MCP_",
    )
