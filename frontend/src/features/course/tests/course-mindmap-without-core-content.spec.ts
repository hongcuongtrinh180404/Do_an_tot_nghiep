import { describe, expect, it } from 'vitest';
import { convertCurriculumToFlowElements, generateDefaultCollapsedIds, type CourseMindmapRawData } from '../utils/mindmap-converter.util';
import { COURSE_MINDMAP_LAYOUT_VERSION } from '../utils/mindmap-node-size.util';

const dates = { createdAt: '', updatedAt: '' };
const raw: CourseMindmapRawData = {
  course: { id: 'course', title: 'Khóa học' },
  sections: [{ id: 'section', courseId: 'course', title: 'Chương', order: 0, ...dates }],
  lessonsBySection: {
    section: [{
      id: 'lesson', sectionId: 'section', title: 'Bài học', order: 0, isPreview: false,
      ...dates,
      // Old API/cache data must not recreate the retired fourth level.
      ...{ description: '[{"id":"point","text":"Old core content"}]' },
    }],
  },
};

describe('Curriculum mindmap without manual lesson core content', () => {
  it('renders only course, section and lesson nodes even with legacy data', () => {
    const { nodes, edges } = convertCurriculumToFlowElements(raw, new Set());
    expect(nodes.map((node) => node.type)).toEqual(['courseRoot', 'section', 'lesson']);
    expect(edges).toHaveLength(2);
    expect(nodes.find((node) => node.type === 'lesson')?.data).not.toHaveProperty('keyPointCount');
    expect(JSON.stringify(nodes)).not.toContain('Old core content');
  });

  it('only collapses chapters by default', () => {
    expect([...generateDefaultCollapsedIds(raw)]).toEqual(['section']);
    expect(convertCurriculumToFlowElements(raw, generateDefaultCollapsedIds(raw)).nodes).toHaveLength(2);
  });

  it('invalidates old saved snapshots containing retired key point nodes', () => {
    expect(COURSE_MINDMAP_LAYOUT_VERSION).toBeGreaterThan(4);
  });
});
