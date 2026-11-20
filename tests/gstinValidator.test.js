import { describe, it, expect } from 'vitest';
import {
  validateGSTIN,
  calculateGSTINChecksum,
  parseGSTPortalText,
  GST_STATE_CODES,
  PAN_ENTITY_TYPES,
} from '../src/services/gstinValidator.js';

describe('GSTIN Validator Service Tests', () => {
  it('rejects empty, null, or undefined inputs', () => {
    expect(validateGSTIN('').isValid).toBe(false);
    expect(validateGSTIN(null).isValid).toBe(false);
    expect(validateGSTIN(undefined).isValid).toBe(false);
    expect(validateGSTIN(12345).isValid).toBe(false);
  });

  it('rejects strings not exactly 15 characters long', () => {
    const shortGstin = validateGSTIN('27AABCU9603R1');
    expect(shortGstin.isValid).toBe(false);
    expect(shortGstin.errorMessage).toContain('must be exactly 15 characters');

    const longGstin = validateGSTIN('27AABCU9603R1ZM123');
    expect(longGstin.isValid).toBe(false);
  });

  it('rejects strings with invalid structure or characters', () => {
    // 14th character must be 'Z' in Indian GST format
    const invalidChar14 = validateGSTIN('27AABCU9603R1XM');
    expect(invalidChar14.isValid).toBe(false);
    expect(invalidChar14.errorMessage).toContain('Invalid GSTIN format structure');
  });

  it('validates legitimate GSTIN and extracts state, PAN, and entity type accurately', () => {
    // Maharashtra state code 27, PAN AABCU9603R, entity 'C' = Company, checksum 'N'
    const result = validateGSTIN('27AABCU9603R1ZN');
    expect(result.isValid).toBe(true);
    expect(result.stateCode).toBe('27');
    expect(result.stateName).toBe('Maharashtra');
    expect(result.pan).toBe('AABCU9603R');
    expect(result.entityType).toBe('Company / Corporate');
  });

  it('correctly maps Delhi, Gujarat, and Karnataka state codes', () => {
    expect(GST_STATE_CODES['07']).toBe('Delhi');
    expect(GST_STATE_CODES['24']).toBe('Gujarat');
    expect(GST_STATE_CODES['29']).toBe('Karnataka');
    expect(GST_STATE_CODES['33']).toBe('Tamil Nadu');
  });

  it('computes GST checksum character', () => {
    const chk = calculateGSTINChecksum('27AABCU9603R1Z');
    expect(typeof chk).toBe('string');
    expect(chk.length).toBe(1);
  });

  it('parses pasted text from the GST portal and extracts trade name and address', () => {
    const samplePaste = `
      Registration Number: 27AABCU9603R1ZM
      Legal Name: ACME ENTERPRISES PRIVATE LIMITED
      Trade Name: ACME ENTERPRISES
      Address: Plot 42, MIDC Industrial Area, Andheri East, Mumbai, Maharashtra 400093
    `;

    const parsed = parseGSTPortalText(samplePaste);
    expect(parsed.gstin).toBe('27AABCU9603R1ZM');
    expect(parsed.tradeName).toContain('ACME');
    expect(parsed.address).toContain('MIDC');
  });

  it('validates state codes and PAN entity type mappings', () => {
    expect(GST_STATE_CODES['27']).toBe('Maharashtra');
    expect(GST_STATE_CODES['24']).toBe('Gujarat');
    expect(PAN_ENTITY_TYPES['C']).toBe('Company / Corporate');
    expect(PAN_ENTITY_TYPES['P']).toBe('Individual / Sole Proprietor');
  });
});
