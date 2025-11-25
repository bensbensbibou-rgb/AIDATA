export type ConformanceCode = 'R' | 'W' | 'O';

export interface BACnetPropertyDefinition {
  id: number;
  type: string;
  conformance: ConformanceCode;
  writable: boolean;
  units?: boolean;
  array?: boolean;
  arraySize?: number;
  list?: boolean;
  defaultValue?: any;
  range?: { min: number; max: number };
  description?: string;
}

const COMMON: Record<string, BACnetPropertyDefinition> = {
  OBJECT_IDENTIFIER: {
    id: 75,
    type: 'BACnetObjectIdentifier',
    conformance: 'R',
    writable: false,
    description: 'Identifiant unique (type + instance).',
  },
  OBJECT_NAME: {
    id: 77,
    type: 'CharacterString',
    conformance: 'R',
    writable: false,
    description: 'Nom lisible de l’objet.',
  },
  OBJECT_TYPE: {
    id: 79,
    type: 'BACnetObjectType',
    conformance: 'R',
    writable: false,
    description: 'Type BACnet déclaré.',
  },
};

const EVENT_CORE: Record<string, BACnetPropertyDefinition> = {
  STATUS_FLAGS: {
    id: 111,
    type: 'BACnetStatusFlags',
    conformance: 'R',
    writable: false,
    description: 'Drapeaux in_alarm/fault/overridden/out_of_service.',
  },
  EVENT_STATE: {
    id: 36,
    type: 'BACnetEventState',
    conformance: 'R',
    writable: false,
    description: 'NORMAL, HIGH_LIMIT, LOW_LIMIT…',
  },
  RELIABILITY: {
    id: 103,
    type: 'BACnetReliability',
    conformance: 'O',
    writable: false,
    description: 'Fiabilité actuelle du signal.',
  },
  OUT_OF_SERVICE: {
    id: 81,
    type: 'BOOLEAN',
    conformance: 'R',
    writable: true,
    defaultValue: false,
    description: 'TRUE si l’objet est déconnecté de son hardware.',
  },
};

const COMMANDABLE_CORE: Record<string, BACnetPropertyDefinition> = {
  PRIORITY_ARRAY: {
    id: 87,
    type: 'BACnetPriorityArray[16]',
    conformance: 'R',
    writable: false,
    array: true,
    arraySize: 17,
    description: 'Pile de commandes (priorités 1..16).',
  },
  RELINQUISH_DEFAULT: {
    id: 104,
    type: 'Same-as-Present_Value',
    conformance: 'R',
    writable: true,
    description: 'Valeur appliquée lorsque toutes les priorités sont relâchées.',
  },
};

const ALARM_CORE: Record<string, BACnetPropertyDefinition> = {
  NOTIFICATION_CLASS: {
    id: 17,
    type: 'Unsigned',
    conformance: 'O',
    writable: true,
    description: 'Classe de notification utilisée pour l’alarme.',
  },
  EVENT_ENABLE: {
    id: 35,
    type: 'BACnetEventTransitionBits',
    conformance: 'O',
    writable: true,
    description: 'Transitions surveillées (TO_OFFNORMAL, TO_FAULT, TO_NORMAL).',
  },
  HIGH_LIMIT: {
    id: 45,
    type: 'Same-as-Present_Value',
    conformance: 'O',
    writable: true,
  },
  LOW_LIMIT: {
    id: 59,
    type: 'Same-as-Present_Value',
    conformance: 'O',
    writable: true,
  },
  DEADBAND: {
    id: 25,
    type: 'Same-as-Present_Value',
    conformance: 'O',
    writable: true,
  },
};

type ObjectPropertyDictionary = Record<string, BACnetPropertyDefinition>;

const makeAnalog = (writable: boolean): ObjectPropertyDictionary => ({
  ...EVENT_CORE,
  PRESENT_VALUE: {
    id: 85,
    type: 'REAL',
    conformance: writable ? 'W' : 'R',
    writable,
    units: true,
    description: 'Valeur flottante (32 bits).',
  },
  UNITS: {
    id: 117,
    type: 'BACnetEngineeringUnits',
    conformance: 'R',
    writable: false,
  },
  DESCRIPTION: {
    id: 28,
    type: 'CharacterString',
    conformance: 'O',
    writable: true,
  },
  MIN_PRES_VALUE: {
    id: 69,
    type: 'REAL',
    conformance: 'O',
    writable: true,
  },
  MAX_PRES_VALUE: {
    id: 65,
    type: 'REAL',
    conformance: 'O',
    writable: true,
  },
  RESOLUTION: {
    id: 106,
    type: 'REAL',
    conformance: 'O',
    writable: false,
  },
  COV_INCREMENT: {
    id: 22,
    type: 'REAL',
    conformance: 'O',
    writable: true,
  },
  ...ALARM_CORE,
});

const makeBinary = (writable: boolean): ObjectPropertyDictionary => ({
  ...EVENT_CORE,
  PRESENT_VALUE: {
    id: 85,
    type: 'ENUMERATED',
    conformance: writable ? 'W' : 'R',
    writable,
    description: 'Valeur Active/Inactive.',
  },
  POLARITY: {
    id: 84,
    type: 'BACnetPolarity',
    conformance: 'R',
    writable: false,
  },
  INACTIVE_TEXT: {
    id: 46,
    type: 'CharacterString',
    conformance: 'O',
    writable: true,
  },
  ACTIVE_TEXT: {
    id: 4,
    type: 'CharacterString',
    conformance: 'O',
    writable: true,
  },
  ...(writable ? COMMANDABLE_CORE : {}),
});

const makeMultiState = (writable: boolean): ObjectPropertyDictionary => ({
  ...EVENT_CORE,
  PRESENT_VALUE: {
    id: 85,
    type: 'Unsigned',
    conformance: writable ? 'W' : 'R',
    writable,
  },
  NUMBER_OF_STATES: {
    id: 74,
    type: 'Unsigned',
    conformance: 'R',
    writable: false,
  },
  STATE_TEXT: {
    id: 110,
    type: 'CharacterString[]',
    conformance: 'O',
    writable: true,
    list: true,
  },
  ...(writable ? COMMANDABLE_CORE : {}),
});

const DEVICE_PROPS: ObjectPropertyDictionary = {
  SYSTEM_STATUS: { id: 112, type: 'BACnetDeviceStatus', conformance: 'R', writable: false },
  VENDOR_IDENTIFIER: { id: 120, type: 'Unsigned', conformance: 'R', writable: false },
  VENDOR_NAME: { id: 121, type: 'CharacterString', conformance: 'O', writable: false },
  MODEL_NAME: { id: 73, type: 'CharacterString', conformance: 'O', writable: false },
  FIRMWARE_REVISION: { id: 44, type: 'CharacterString', conformance: 'O', writable: false },
  APPLICATION_SOFTWARE_VERSION: { id: 12, type: 'CharacterString', conformance: 'O', writable: false },
  PROTOCOL_VERSION: { id: 98, type: 'Unsigned', conformance: 'R', writable: false },
  OBJECT_LIST: { id: 76, type: 'List<BACnetObjectIdentifier>', conformance: 'R', writable: false, list: true },
};

const SCHEDULE_PROPS: ObjectPropertyDictionary = {
  PRESENT_VALUE: { id: 85, type: 'PriorityArray', conformance: 'R', writable: false },
  WEEKLY_SCHEDULE: { id: 123, type: 'BACnetWeeklySchedule', conformance: 'R', writable: true, list: true },
  EXCEPTION_SCHEDULE: { id: 25, type: 'BACnetSpecialEvent', conformance: 'O', writable: true, list: true },
  EFFECTIVE_PERIOD: { id: 32, type: 'BACnetDateRange', conformance: 'R', writable: true },
  LIST_OF_OBJECT_PROPERTY_REFERENCES: {
    id: 53,
    type: 'List<BACnetDeviceObjectPropertyReference>',
    conformance: 'R',
    writable: true,
    list: true,
  },
};

const TREND_LOG_PROPS: ObjectPropertyDictionary = {
  LOG_BUFFER: { id: 131, type: 'List<BACnetLogRecord>', conformance: 'R', writable: false, list: true },
  BUFFER_SIZE: { id: 134, type: 'Unsigned', conformance: 'R', writable: false },
  RECORD_COUNT: { id: 140, type: 'Unsigned', conformance: 'R', writable: false },
  STOP_WHEN_FULL: { id: 167, type: 'Boolean', conformance: 'R', writable: true, defaultValue: true },
  ENABLE: { id: 80, type: 'Boolean', conformance: 'R', writable: true, defaultValue: true },
};

export const BACnetProperties: Record<string, ObjectPropertyDictionary> = {
  COMMON,
  ANALOG_INPUT: makeAnalog(false),
  ANALOG_OUTPUT: { ...makeAnalog(true), ...COMMANDABLE_CORE },
  ANALOG_VALUE: { ...makeAnalog(true), ...COMMANDABLE_CORE },
  BINARY_INPUT: makeBinary(false),
  BINARY_OUTPUT: makeBinary(true),
  BINARY_VALUE: makeBinary(true),
  MULTI_STATE_INPUT: makeMultiState(false),
  MULTI_STATE_OUTPUT: makeMultiState(true),
  MULTI_STATE_VALUE: makeMultiState(true),
  DEVICE: DEVICE_PROPS,
  SCHEDULE: SCHEDULE_PROPS,
  CALENDAR: {
    DATE_LIST: { id: 32, type: 'List<BACnetCalendarEntry>', conformance: 'R', writable: true, list: true },
  },
  TREND_LOG: TREND_LOG_PROPS,
};

export function getObjectProperties(objectType: string) {
  const normalized = objectType.replace(/[\s-]/g, '_').toUpperCase();
  return {
    ...COMMON,
    ...(BACnetProperties[normalized] || {}),
  };
}
