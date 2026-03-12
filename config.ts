/**
 * SLIK Reporting Configuration Module
 * Manages global constants and file metadata
 */
export const SLIK_CONFIG = {
  SENDER_TYPE: "0801",
  ORG_CODE: "017649",
  FILE_SEQ: "1",
  SEPARATOR: "|",
  AES: {
    KEY: "TKiDZgGuncwJTu0PPY8yhYdRRhIreMjX",
    IV: "vidn"
  },
  MANDATORY_SEGMENTS: ['P01', 'A01', 'D01', 'D02', 'F01', 'F02', 'K01', 'M01'] as const
};

// Export individual string constants for backward compatibility with crypto utils
export const AES_KEY_STR = SLIK_CONFIG.AES.KEY;
export const AES_IV_STR = SLIK_CONFIG.AES.IV;
