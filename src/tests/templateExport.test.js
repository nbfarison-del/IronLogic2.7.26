import { describe, it, expect } from 'vitest';
import { serializeTemplate, serializeTemplates } from '../utils/templateExport';

const template = {
    id: 'abc123',
    name: '12-Week Olympic Block',
    weeks: [{ days: [] }],
    isSystem: false,
};

describe('templateExport', () => {
    it('serializes a single template without internal fields', () => {
        const out = serializeTemplate(template);
        expect(out.exportedFrom).toBe('IronLogic');
        expect(out.template.name).toBe('12-Week Olympic Block');
        expect(out.template.weeks).toHaveLength(1);
        expect(out.template.id).toBeUndefined();
        expect(out.template.isSystem).toBeUndefined();
    });

    it('serializes a collection with a count', () => {
        const out = serializeTemplates([template, { ...template, id: 'def456', name: 'Second' }]);
        expect(out.count).toBe(2);
        expect(out.templates).toHaveLength(2);
        expect(out.templates[1].name).toBe('Second');
        expect(out.templates[0].id).toBeUndefined();
    });

    it('handles an empty collection', () => {
        const out = serializeTemplates([]);
        expect(out.count).toBe(0);
        expect(out.templates).toEqual([]);
    });
});
