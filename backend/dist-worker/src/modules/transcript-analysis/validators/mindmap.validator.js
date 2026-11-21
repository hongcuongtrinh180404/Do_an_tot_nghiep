import { UnprocessableEntityException } from '@nestjs/common';
export class MindmapValidator {
    static validate(data, maxDurationSeconds, maxDepth = 4) {
        const errors = [];
        if (!data || typeof data !== 'object') {
            errors.push('Dữ liệu mindmap không phải là một object hợp lệ.');
            return { isValid: false, errors };
        }
        if (!data.root || typeof data.root !== 'object') {
            errors.push('Cấu trúc mindmap thiếu node gốc "root".');
            return { isValid: false, errors };
        }
        this.validateNode(data.root, 0, maxDepth, maxDurationSeconds, errors);
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    static validateOrFail(data, maxDurationSeconds, maxDepth = 4) {
        const result = this.validate(data, maxDurationSeconds, maxDepth);
        if (!result.isValid) {
            throw new UnprocessableEntityException(`Cấu trúc cây Mindmap không hợp lệ: ${result.errors.join('; ')}`);
        }
    }
    static sanitize(data, maxDurationSeconds, maxDepth = 4, fallbackTitle = 'Bài học') {
        if (!data || typeof data !== 'object') {
            return {
                root: {
                    id: 'root',
                    title: fallbackTitle.trim() || 'Bài học',
                    timestamp: 0,
                },
            };
        }
        const rawRecord = data;
        let rawRoot = rawRecord.root;
        if (!rawRoot && rawRecord.mindmap && typeof rawRecord.mindmap === 'object') {
            rawRoot = rawRecord.mindmap.root;
        }
        if (!rawRoot && rawRecord.data && typeof rawRecord.data === 'object') {
            rawRoot = rawRecord.data.root;
        }
        if (!rawRoot && typeof rawRecord.title === 'string') {
            rawRoot = rawRecord;
        }
        if (!rawRoot || typeof rawRoot !== 'object') {
            return {
                root: {
                    id: 'root',
                    title: fallbackTitle.trim() || 'Bài học',
                    timestamp: 0,
                },
            };
        }
        const sanitizedRoot = this.sanitizeNode(rawRoot, 0, maxDepth, maxDurationSeconds, 0, 0, fallbackTitle);
        sanitizedRoot.id = 'root';
        sanitizedRoot.timestamp = 0;
        return {
            root: sanitizedRoot,
        };
    }
    static sanitizeNode(rawNode, currentDepth, maxDepth, maxDurationSeconds, parentTimestamp, index, fallbackTitle) {
        const id = typeof rawNode.id === 'string' && rawNode.id.trim()
            ? rawNode.id.trim()
            : `node-${currentDepth}-${index}`;
        const title = typeof rawNode.title === 'string' && rawNode.title.trim()
            ? rawNode.title.trim()
            : fallbackTitle?.trim() || `Nội dung cấp ${currentDepth + 1}`;
        let timestamp = typeof rawNode.timestamp === 'number' && !isNaN(rawNode.timestamp)
            ? rawNode.timestamp
            : parentTimestamp;
        if (timestamp < 0) {
            timestamp = 0;
        }
        if (maxDurationSeconds > 0 && timestamp > maxDurationSeconds) {
            timestamp = maxDurationSeconds;
        }
        const node = {
            id,
            title,
            timestamp,
        };
        if (currentDepth >= maxDepth) {
            return node;
        }
        if (Array.isArray(rawNode.children) && rawNode.children.length > 0) {
            const sanitizedChildren = [];
            rawNode.children.forEach((child, childIndex) => {
                if (child && typeof child === 'object') {
                    sanitizedChildren.push(this.sanitizeNode(child, currentDepth + 1, maxDepth, maxDurationSeconds, timestamp, childIndex));
                }
            });
            if (sanitizedChildren.length > 0) {
                node.children = sanitizedChildren;
            }
        }
        return node;
    }
    static validateNode(node, currentDepth, maxDepth, maxDurationSeconds, errors) {
        if (!node.id || typeof node.id !== 'string' || !node.id.trim()) {
            errors.push(`Node tại cấp ${currentDepth} thiếu trường "id" hợp lệ.`);
        }
        if (!node.title || typeof node.title !== 'string' || !node.title.trim()) {
            errors.push(`Node "${node.id || 'unknown'}" thiếu trường "title" hoặc nội dung rỗng.`);
        }
        if (typeof node.timestamp !== 'number' || isNaN(node.timestamp)) {
            errors.push(`Node "${node.title || node.id}" có timestamp không phải là một số hợp lệ.`);
        }
        else {
            if (node.timestamp < 0) {
                errors.push(`Node "${node.title}" có timestamp âm (${node.timestamp}s).`);
            }
            if (maxDurationSeconds > 0 && node.timestamp > maxDurationSeconds + 5) {
                errors.push(`Node "${node.title}" có timestamp (${node.timestamp}s) vượt quá thời lượng video (${maxDurationSeconds}s).`);
            }
        }
        if (currentDepth > maxDepth) {
            errors.push(`Cây mindmap vượt quá độ sâu tối đa cho phép (tối đa ${maxDepth + 1} level). Node vi phạm: "${node.title}" tại level ${currentDepth + 1}.`);
        }
        if (node.children) {
            if (!Array.isArray(node.children)) {
                errors.push(`Trường "children" của node "${node.title}" phải là một mảng.`);
            }
            else {
                if (currentDepth >= maxDepth && node.children.length > 0) {
                    errors.push(`Node "${node.title}" ở level ${currentDepth + 1} (level tối đa: ${maxDepth + 1}) không được có node con thêm.`);
                }
                for (const child of node.children) {
                    this.validateNode(child, currentDepth + 1, maxDepth, maxDurationSeconds, errors);
                }
            }
        }
    }
}
//# sourceMappingURL=mindmap.validator.js.map