import { test, expect } from '@playwright/test';
import { createUsername } from '../public/js/utils.js';

test.describe('createUsername', () => {
  test('returns empty string for falsy inputs', () => {
    expect(createUsername()).toBe('');
    expect(createUsername(null)).toBe('');
    expect(createUsername(undefined)).toBe('');
    expect(createUsername('')).toBe('');
  });

  test('converts to lowercase', () => {
    expect(createUsername('JOHN')).toBe('john');
  });

  test('replaces spaces with underscores', () => {
    expect(createUsername('John Doe')).toBe('john_doe');
    expect(createUsername('John   Doe')).toBe('john_doe');
  });

  test('removes accents/diacritics', () => {
    expect(createUsername('José')).toBe('jose');
    expect(createUsername('João')).toBe('joao');
    expect(createUsername('Müller')).toBe('muller');
    expect(createUsername('François')).toBe('francois');
  });

  test('removes non-alphanumeric characters (except underscore)', () => {
    expect(createUsername('user@domain.com')).toBe('userdomaincom');
    expect(createUsername('user!#$123')).toBe('user123');
    expect(createUsername('user-name')).toBe('username');
  });

  test('handles combined complex cases', () => {
    expect(createUsername('  Jõão Cláudio @2024!  ')).toBe('joao_claudio_2024');
  });
});
