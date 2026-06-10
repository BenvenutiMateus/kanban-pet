import { test, expect } from '@playwright/test';
import {
  uid,
  esc,
  initials,
  createUsername,
  fmtDate,
  fmtTs,
  today,
  toast
} from '../public/js/utils.js';

test.describe('utils.js', () => {

  test.describe('uid', () => {
    test('should start with an underscore', () => {
      expect(uid().startsWith('_')).toBe(true);
    });

    test('should generate a string of length 10', () => {
      expect(uid().length).toBe(10);
    });

    test('should generate unique ids', () => {
      const id1 = uid();
      const id2 = uid();
      expect(id1).not.toBe(id2);
    });
  });

  test.describe('esc', () => {
    test('should escape HTML entities', () => {
      const input = '<a> & "b"</a>';
      const expected = '&lt;a&gt; &amp; &quot;b&quot;&lt;/a&gt;';
      expect(esc(input)).toBe(expected);
    });

    test('should handle empty or undefined inputs', () => {
      expect(esc('')).toBe('');
      expect(esc(undefined)).toBe('');
      expect(esc(null)).toBe('');
    });
  });

  test.describe('initials', () => {
    test('should extract the first letters of up to two words and uppercase them', () => {
      expect(initials('João da Silva')).toBe('JD');
      expect(initials('Maria')).toBe('M');
    });

    test('should handle extra whitespace', () => {
      expect(initials('   Ana   Beatriz  ')).toBe('AB');
    });
  });

  test.describe('createUsername', () => {
    test('should convert strings to lowercase, remove diacritics, and replace spaces with underscores', () => {
      expect(createUsername('João Silva')).toBe('joao_silva');
      expect(createUsername('Maria Conceição')).toBe('maria_conceicao');
    });

    test('should strip invalid characters', () => {
      expect(createUsername('Test!@# User$%^')).toBe('test_user');
    });

    test('should handle empty or undefined inputs', () => {
      expect(createUsername('')).toBe('');
      expect(createUsername(undefined)).toBe('');
      expect(createUsername(null)).toBe('');
    });
  });

  test.describe('fmtDate', () => {
    test('should format YYYY-MM-DD to DD/MM/YYYY', () => {
      expect(fmtDate('2023-10-25')).toBe('25/10/2023');
    });

    test('should return empty string for falsy values', () => {
      expect(fmtDate('')).toBe('');
      expect(fmtDate(undefined)).toBe('');
      expect(fmtDate(null)).toBe('');
    });
  });

  test.describe('fmtTs', () => {
    test('should format timestamp to pt-BR locale format', () => {
      const ts = new Date('2023-05-15T10:30:00Z').getTime();
      const formatted = fmtTs(ts);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted).toMatch(/\d{2}.*\d{2}:\d{2}/);
    });
  });

  test.describe('today', () => {
    test('should return current date in YYYY-MM-DD format adjusted for local timezone', () => {
      const result = today();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      const expected = d.toISOString().split('T')[0];

      expect(result).toBe(expected);
    });
  });

  test.describe('toast', () => {

    test.afterEach(() => {
      delete global.document;
    });

    test('should create and append a toast element to the DOM', () => {
      const mockContainer = {
        appendChild: () => {}
      };

      const mockElement = {
        style: {},
        classList: { add: () => {} },
        remove: () => {}
      };

      global.document = {
        getElementById: (id) => id === 'toast-container' ? mockContainer : null,
        createElement: (tag) => tag === 'div' ? mockElement : null
      };

      let appendCalled = false;
      mockContainer.appendChild = (el) => {
        expect(el).toBe(mockElement);
        appendCalled = true;
      };

      // Temporarily mock setTimeout just for the sync execution of toast()
      const originalSetTimeout = global.setTimeout;
      const timeouts = [];
      global.setTimeout = (cb, delay) => { timeouts.push({cb, delay}); return 1; };

      try {
        toast('Test message', 'success');
      } finally {
        global.setTimeout = originalSetTimeout;
      }

      expect(appendCalled).toBe(true);
      expect(mockElement.className).toBe('toast');
      expect(mockElement.textContent).toBe('✓ Test message');
      expect(mockElement.style.borderLeft).toBe('3px solid var(--green)');

      // Verify the timeout was scheduled
      expect(timeouts.length).toBe(1);
      expect(timeouts[0].delay).toBe(3000);

      // Execute the first timeout callback
      global.setTimeout = (cb, delay) => { timeouts.push({cb, delay}); return 2; };
      try {
        timeouts[0].cb();
      } finally {
        global.setTimeout = originalSetTimeout;
      }

      // Now a second timeout should be scheduled
      expect(timeouts.length).toBe(2);
      expect(timeouts[1].delay).toBe(300);

      // We could also test the second callback
      let removed = false;
      mockElement.remove = () => { removed = true; };
      timeouts[1].cb();
      expect(removed).toBe(true);
    });

    test('should handle different toast types', () => {
      const mockContainer = { appendChild: () => {} };
      const mockElement = { style: {}, classList: { add: () => {} }, remove: () => {} };

      global.document = {
        getElementById: () => mockContainer,
        createElement: () => mockElement
      };

      const originalSetTimeout = global.setTimeout;
      global.setTimeout = () => 1;

      try {
        toast('Error msg', 'error');
        expect(mockElement.textContent).toBe('✕ Error msg');
        expect(mockElement.style.borderLeft).toBe('3px solid var(--red)');

        toast('Info msg');
        expect(mockElement.textContent).toBe('Info msg');
        expect(mockElement.style.borderLeft).toBe('3px solid var(--accent)');
      } finally {
        global.setTimeout = originalSetTimeout;
      }
    });
  });
});
