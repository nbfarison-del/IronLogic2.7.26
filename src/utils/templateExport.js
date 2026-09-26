/**
 * Export program templates as JSON files. Pure serialization is kept
 * separate from the download trigger so it stays testable.
 */

export function serializeTemplate(template) {
    const { id: _id, isSystem: _isSystem, ...rest } = template;
    return {
        exportedAt: new Date().toISOString(),
        exportedFrom: 'IronLogic',
        template: { ...rest, name: template.name },
    };
}

export function serializeTemplates(templates) {
    return {
        exportedAt: new Date().toISOString(),
        exportedFrom: 'IronLogic',
        count: templates.length,
        templates: templates.map(t => {
            const { id: _id, isSystem: _isSystem, ...rest } = t;
            return { ...rest, name: t.name };
        }),
    };
}

function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

const safeName = (name) => (name || 'template').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function downloadTemplate(template) {
    downloadJson(`ironlogic-template-${safeName(template.name)}.json`, serializeTemplate(template));
}

export function downloadAllTemplates(templates) {
    downloadJson('ironlogic-templates.json', serializeTemplates(templates));
}
