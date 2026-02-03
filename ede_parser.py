import csv
import os
from typing import List, Dict, Any, Set

class EDEParser:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.devices: Dict[int, Dict[str, Any]] = {}
        self.objects_by_device: Dict[int, List[Dict[str, Any]]] = {}
        self._parsed = False

    def parse(self):
        if self._parsed:
            return

        if not os.path.exists(self.file_path):
            print(f"Warning: EDE file not found at {self.file_path}")
            return

        try:
            with open(self.file_path, 'r', encoding='utf-8', errors='replace') as f:
                # Skip header lines until we find the data
                # Based on the file content seen:
                # Line 8 starts with # keyname...
                # Line 9 is the first data line
                
                reader = csv.reader(f, delimiter=';')
                for row in reader:
                    if not row or len(row) < 5:
                        continue
                    
                    # Check if it's a data row (simple heuristic: 2nd col is a number)
                    # Row structure based on file view:
                    # 0: keyname "Device(504)"
                    # 1: device obj.-instance "504"
                    # 2: object-name "GTBQIDMCRC"
                    # 3: object-type "8" (Device) or "17" (Schedule), etc.
                    # 4: object-instance "504" or "3004402"
                    
                    try:
                        dev_instance = int(row[1])
                        obj_name = row[2]
                        obj_type_id = int(row[3])
                        obj_instance = int(row[4])
                        description = row[5] if len(row) > 5 else ""
                        
                        # Register Device
                        if dev_instance not in self.devices:
                            self.devices[dev_instance] = {
                                "deviceId": dev_instance,
                                "address": str(dev_instance), # Assuming IP/MSTP mapping is handled elsewhere or simplified
                                "name": f"Device {dev_instance}",
                                "segment": "EDE",
                                "pollFrequency": 30000
                            }
                            self.objects_by_device[dev_instance] = []

                        # If this row IS the device object (type 8), update device name
                        if obj_type_id == 8:
                            self.devices[dev_instance]["name"] = obj_name
                        else:
                            # It's a child object
                            # Map numeric type to string if possible, or keep as ID
                            # Common types: 0=AI, 1=AO, 2=AV, 3=BI, 4=BO, 5=BV
                            obj_type_str = self._get_type_string(obj_type_id)
                            
                            self.objects_by_device[dev_instance].append({
                                "id": f"{obj_type_str}:{obj_instance}",
                                "type": obj_type_str,
                                "instance": obj_instance,
                                "name": obj_name,
                                "description": description,
                                "value": "N/A" # Placeholder
                            })
                            
                    except ValueError:
                        continue # Header or malformed line

            self._parsed = True
            print(f"EDE Parsed: Found {len(self.devices)} devices.")

        except Exception as e:
            print(f"Error parsing EDE file: {e}")

    def _get_type_string(self, type_id: int) -> str:
        # Basic mapping
        mapping = {
            0: "analogInput",
            1: "analogOutput",
            2: "analogValue",
            3: "binaryInput",
            4: "binaryOutput",
            5: "binaryValue",
            8: "device",
            13: "multiStateInput",
            14: "multiStateOutput",
            19: "multiStateValue",
            17: "schedule",
            20: "trendLog",
            # Add others as needed
        }
        return mapping.get(type_id, str(type_id))

    def get_devices(self) -> List[Dict[str, Any]]:
        self.parse()
        return list(self.devices.values())

    def get_objects(self, device_instance: int) -> List[Dict[str, Any]]:
        self.parse()
        return self.objects_by_device.get(device_instance, [])

# Singleton instance for easy import
ede_parser = EDEParser(os.path.join(os.getcwd(), "ede", "QID_EDE.CSV"))
