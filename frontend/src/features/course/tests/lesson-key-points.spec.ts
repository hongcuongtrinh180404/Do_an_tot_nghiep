import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeKeyPoints,
  deserializeKeyPoints,
  getKeyPointColor,
  getKeyPointPlaceholder,
  generateKeyPointId,
} from '../utils/lesson-key-points.util';
import { createLessonSchema } from '../schemas/create-lesson.schema';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('Lesson Key Points Utility & Palette', () => {
  it('1. should return exact pastel colors for first 5 indices', () => {
    assert.equal(getKeyPointColor(0).name, 'Vàng kem ấm');
    assert.equal(getKeyPointColor(0).bg, '#FFF8E6');
    assert.equal(getKeyPointColor(0).border, '#F3E0B5');

    assert.equal(getKeyPointColor(1).name, 'Hồng cam pastel');
    assert.equal(getKeyPointColor(1).bg, '#FFE2DE');
    assert.equal(getKeyPointColor(1).border, '#F0C4BF');

    assert.equal(getKeyPointColor(2).name, 'Lam xám dịu');
    assert.equal(getKeyPointColor(2).bg, '#ADB2C5');
    assert.equal(getKeyPointColor(2).border, '#9297AC');

    assert.equal(getKeyPointColor(3).name, 'Xanh xám nhạt');
    assert.equal(getKeyPointColor(3).bg, '#B5CFD1');
    assert.equal(getKeyPointColor(3).border, '#9BB7B9');

    assert.equal(getKeyPointColor(4).name, 'Xanh sương mù');
    assert.equal(getKeyPointColor(4).bg, '#D9E4E6');
    assert.equal(getKeyPointColor(4).border, '#C1D0D3');
  });

  it('2. should cycle colors according to index % 5', () => {
    // Index 5 cycles back to 0
    assert.equal(getKeyPointColor(5).bg, getKeyPointColor(0).bg);
    assert.equal(getKeyPointColor(5).name, 'Vàng kem ấm');

    // Index 6 cycles to 1
    assert.equal(getKeyPointColor(6).bg, getKeyPointColor(1).bg);
    assert.equal(getKeyPointColor(6).name, 'Hồng cam pastel');

    // Index 9 cycles to 4
    assert.equal(getKeyPointColor(9).bg, getKeyPointColor(4).bg);
    assert.equal(getKeyPointColor(9).name, 'Xanh sương mù');

    // Index 10 cycles to 0
    assert.equal(getKeyPointColor(10).bg, getKeyPointColor(0).bg);
  });

  it('3. should generate valid UUID v4 IDs', () => {
    const id1 = generateKeyPointId();
    const id2 = generateKeyPointId();

    assert.ok(UUID_V4_REGEX.test(id1), `Expected ${id1} to match UUID v4`);
    assert.ok(UUID_V4_REGEX.test(id2), `Expected ${id2} to match UUID v4`);
    assert.notEqual(id1, id2, 'IDs must be unique');
  });

  it('4. should provide dynamic placeholders', () => {
    assert.ok(getKeyPointPlaceholder(0).includes('vòng lặp for'));
    assert.ok(getKeyPointPlaceholder(1).includes('Cú pháp cơ bản'));
    assert.equal(getKeyPointPlaceholder(5), getKeyPointPlaceholder(0));
  });

  it('5. should serialize key points into clean JSON string of objects with UUIDs', () => {
    const points = [
      { id: '11111111-1111-4111-a111-111111111111', text: '  Khái niệm vòng lặp  ' },
      { id: '22222222-2222-4222-a222-222222222222', text: '' },
      { id: '33333333-3333-4333-a333-333333333333', text: '   ' },
      { id: '44444444-4444-4444-a444-444444444444', text: 'Cú pháp for...of' },
    ];
    const serialized = serializeKeyPoints(points);

    const parsed = JSON.parse(serialized);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].id, '11111111-1111-4111-a111-111111111111');
    assert.equal(parsed[0].text, 'Khái niệm vòng lặp');
    assert.equal(parsed[1].id, '44444444-4444-4444-a444-444444444444');
    assert.equal(parsed[1].text, 'Cú pháp for...of');
  });

  it('6. should handle empty or null values during serialization', () => {
    assert.equal(serializeKeyPoints([]), '[]');
    assert.equal(serializeKeyPoints(undefined), '[]');
    assert.equal(
      serializeKeyPoints([
        { id: '1', text: '   ' },
        { id: '2', text: '' },
      ]),
      '[]',
    );
  });

  it('7. should deserialize JSON object array correctly', () => {
    const json = JSON.stringify([
      { id: 'id-1', text: 'Ý thứ nhất' },
      { id: 'id-2', text: 'Ý thứ hai' },
    ]);
    const deserialized = deserializeKeyPoints(json);

    assert.equal(deserialized.length, 2);
    assert.equal(deserialized[0].id, 'id-1');
    assert.equal(deserialized[0].text, 'Ý thứ nhất');
    assert.equal(deserialized[1].id, 'id-2');
    assert.equal(deserialized[1].text, 'Ý thứ hai');
  });

  it('8. should deserialize legacy JSON string arrays with stable position-based IDs', () => {
    const legacyJson = JSON.stringify(['Ý cũ 1', 'Ý cũ 2']);
    const deserialized = deserializeKeyPoints(legacyJson);
    const expected = [
      { id: 'kp-0', text: 'Ý cũ 1' },
      { id: 'kp-1', text: 'Ý cũ 2' },
    ];

    assert.deepEqual(deserialized, expected);
    assert.deepEqual(deserializeKeyPoints(legacyJson), expected);
    assert.equal(new Set(deserialized.map((point) => point.id)).size, expected.length);
  });

  it('9. should deserialize legacy multiline text with stable IDs and trimmed content', () => {
    const legacyText = '  Ý thứ nhất  \n\nÝ thứ hai\r\n   \r\nÝ thứ ba  ';
    const deserialized = deserializeKeyPoints(legacyText);
    const expected = [
      { id: 'kp-0', text: 'Ý thứ nhất' },
      { id: 'kp-1', text: 'Ý thứ hai' },
      { id: 'kp-2', text: 'Ý thứ ba' },
    ];

    assert.deepEqual(deserialized, expected);
    assert.deepEqual(deserializeKeyPoints(legacyText), expected);
    assert.equal(new Set(deserialized.map((point) => point.id)).size, expected.length);
  });

  it('10. should return empty array when deserializing null, undefined, or empty string', () => {
    assert.deepEqual(deserializeKeyPoints(null), []);
    assert.deepEqual(deserializeKeyPoints(undefined), []);
    assert.deepEqual(deserializeKeyPoints('   '), []);
  });

  it('11. should preserve existing UUIDs and other saved IDs across repeated reads', () => {
    const points = [
      { id: '11111111-1111-4111-a111-111111111111', text: 'Ý đã có UUID' },
      { id: 'kp-7', text: 'Ý đã lưu từ dữ liệu cũ' },
      { id: 'existing-id', text: 'Ý đã có ID riêng' },
    ];
    const json = JSON.stringify(points);

    assert.deepEqual(deserializeKeyPoints(json), points);
    assert.deepEqual(deserializeKeyPoints(json), points);
  });

  it('12. should assign stable fallback IDs to JSON objects without a saved ID', () => {
    const json = JSON.stringify([
      { text: 'Ý chưa có ID' },
      { id: '', text: 'Ý có ID rỗng' },
      { id: '   ', text: 'Ý có ID chỉ chứa khoảng trắng' },
      { id: 'saved-id', text: 'Ý đã có ID' },
    ]);
    const expected = [
      { id: 'kp-0', text: 'Ý chưa có ID' },
      { id: 'kp-1', text: 'Ý có ID rỗng' },
      { id: 'kp-2', text: 'Ý có ID chỉ chứa khoảng trắng' },
      { id: 'saved-id', text: 'Ý đã có ID' },
    ];

    assert.deepEqual(deserializeKeyPoints(json), expected);
    assert.deepEqual(deserializeKeyPoints(json), expected);
  });

  it('13. should preserve legacy IDs and content through serialization and repeated reads', () => {
    for (const source of [JSON.stringify(['Ý cũ 1', 'Ý cũ 2']), 'Ý cũ 1\nÝ cũ 2']) {
      const points = deserializeKeyPoints(source);
      const serialized = serializeKeyPoints(points);

      assert.deepEqual(JSON.parse(serialized), points);
      assert.deepEqual(deserializeKeyPoints(serialized), points);
      assert.equal(serializeKeyPoints(deserializeKeyPoints(serialized)), serialized);
    }
  });
});

describe('createLessonSchema Validation with Key Points', () => {
  it('1. should pass validation when valid key points are provided', () => {
    const validData = {
      title: 'Bài 1: Giới thiệu lập trình',
      keyPoints: [
        { id: generateKeyPointId(), text: 'Khái niệm cơ bản' },
        { id: generateKeyPointId(), text: 'Cài đặt môi trường' },
      ],
      order: 0,
      contentType: 'video' as const,
      isPreview: false,
    };

    const result = createLessonSchema.safeParse(validData);
    assert.equal(result.success, true);
  });

  it('2. should reject when keyPoints array is empty', () => {
    const invalidData = {
      title: 'Bài 1: Giới thiệu lập trình',
      keyPoints: [],
      order: 0,
      contentType: 'video' as const,
      isPreview: false,
    };

    const result = createLessonSchema.safeParse(invalidData);
    assert.equal(result.success, false);
  });

  it('3. should reject when all keyPoints are whitespace or empty strings', () => {
    const invalidData = {
      title: 'Bài 1: Giới thiệu lập trình',
      keyPoints: [
        { id: generateKeyPointId(), text: '   ' },
        { id: generateKeyPointId(), text: '' },
      ],
      order: 0,
      contentType: 'video' as const,
      isPreview: false,
    };

    const result = createLessonSchema.safeParse(invalidData);
    assert.equal(result.success, false);
    if (!result.success) {
      const messages = result.error.issues.map((e) => e.message);
      assert.ok(messages.includes('Vui lòng nhập ít nhất 1 ý cốt lõi của bài học'));
    }
  });

  it('4. should reject when an individual key point exceeds 200 characters', () => {
    const longPoint = 'A'.repeat(201);
    const invalidData = {
      title: 'Bài 1: Giới thiệu lập trình',
      keyPoints: [{ id: generateKeyPointId(), text: longPoint }],
      order: 0,
      contentType: 'video' as const,
      isPreview: false,
    };

    const result = createLessonSchema.safeParse(invalidData);
    assert.equal(result.success, false);
    if (!result.success) {
      const messages = result.error.issues.map((e) => e.message);
      assert.ok(messages.includes('Mỗi ý cốt lõi không được vượt quá 200 ký tự'));
    }
  });
});

