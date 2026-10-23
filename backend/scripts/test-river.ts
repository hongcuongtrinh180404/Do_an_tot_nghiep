import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Locate and parse .env file
const envPath = path.resolve(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error(`❌ Không tìm thấy file .env tại đường dẫn: ${envPath}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const match = trimmed.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
}

// 2. Identify River API keys and target models
const riverKeys: { name: string; key: string }[] = [];
for (let i = 1; i <= 3; i++) {
  const envName = `RIVER_API_KEY_${i}`;
  const val = envVars[envName]?.trim();
  if (val) {
    riverKeys.push({ name: envName, key: val });
  }
}

// Fallback check general RIVER_API_KEY if not already included
if (envVars['RIVER_API_KEY'] && !riverKeys.some((k) => k.key === envVars['RIVER_API_KEY'])) {
  riverKeys.push({ name: 'RIVER_API_KEY', key: envVars['RIVER_API_KEY'].trim() });
}

// 2b. Optional CLI arguments to filter specific keys (e.g., "1", "2", "RIVER_API_KEY_1")
const filterArgs = process.argv.slice(2).map((a) => a.trim().toLowerCase());
let targetKeys = riverKeys;

if (filterArgs.length > 0) {
  targetKeys = riverKeys.filter((item) => {
    const keyNum = item.name.replace(/\D/g, '');
    const keyLower = item.name.toLowerCase();
    return filterArgs.some(
      (arg) => arg === keyNum || keyLower.includes(arg) || arg === keyLower,
    );
  });
}

const riverBaseUrl = envVars['RIVER_BASE_URL'] || 'https://api.river.ai/v1';
const riverModel1 = envVars['RIVER_MODEL_1'] || envVars['RIVER_MODEL'] || 'deepseek-ai/DeepSeek-V4.1-Flash';
const riverModel2 = envVars['RIVER_MODEL_2'] || '';
const riverTimeoutMs = Number(envVars['RIVER_TIMEOUT_MS'] || 60000);

console.log('='.repeat(65));
console.log('🔍 KIỂM TRA KẾT NỐI VÀ XOAY KHÓA RIVER AI TỪ FILE .env');
console.log('='.repeat(65));
console.log(`📁 File .env: ${envPath}`);
console.log(`🌐 Base URL: ${riverBaseUrl}`);
console.log(`🤖 Model chính (Model 1): ${riverModel1}`);
console.log(`🔄 Model dự phòng (Model 2): ${riverModel2 || '(Chưa cấu hình - chỉ xoay key)'}`);
console.log(`🔑 Số lượng key phát hiện: ${targetKeys.length}/${riverKeys.length}`);
if (filterArgs.length > 0) {
  console.log(`🎯 Bộ lọc chỉ định: [${filterArgs.join(', ')}]`);
}
console.log('='.repeat(65));

if (targetKeys.length === 0) {
  console.warn('⚠️ Không tìm thấy biến môi trường RIVER_API_KEY nào phù hợp trong .env!');
  console.warn('👉 Gợi ý: Hãy thêm RIVER_API_KEY_1, RIVER_API_KEY_2, RIVER_API_KEY_3 vào file backend/.env');
  process.exit(1);
}

function maskKey(key: string): string {
  if (key.length <= 10) return '***';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

async function testApiKey(name: string, apiKey: string) {
  console.log(`\n▶ Đang kiểm tra [${name}] (Key: ${maskKey(apiKey)})...`);

  // Detect placeholder
  if (apiKey.includes('key_thuc_te') || apiKey.includes('your_') || apiKey.includes('placeholder')) {
    console.log(`   ⚠️ Bỏ qua: Đây là placeholder (${apiKey}), chưa phải key thật.`);
    return false;
  }

  const client = new OpenAI({
    apiKey,
    baseURL: riverBaseUrl,
    timeout: riverTimeoutMs,
  });

  let model1Success = false;

  // Test Model 1
  try {
    console.log(`   ⏳ [Model 1] Gửi test request tới: ${riverModel1}...`);
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: riverModel1,
      messages: [{ role: 'user', content: 'Ping! Trả lời ngắn gọn: "River AI Model 1 OK"' }],
      max_tokens: 30,
    });

    const duration = Date.now() - startTime;
    const responseText = response.choices[0]?.message?.content?.trim() || '(Không có nội dung)';

    console.log(`   ✅ [Model 1] THÀNH CÔNG (${duration}ms)`);
    console.log(`   💬 Phản hồi: "${responseText}"`);
    model1Success = true;
  } catch (err: unknown) {
    const errorObj = err as Record<string, unknown>;
    const status = errorObj?.status as number;
    const msg = (errorObj?.message as string) || String(err);
    console.error(`   ❌ [Model 1] THẤT BẠI: ${msg}`);

    if (status === 401 || status === 403 || msg.includes('API key') || msg.includes('Unauthorized')) {
      console.error('   👉 Lý do: API Key không hợp lệ hoặc đã bị vô hiệu hóa.');
      return false; // Key invalid -> không cần thử tiếp model 2 trên key này
    } else if (status === 429 || msg.includes('429')) {
      console.error('   👉 Lý do: Key đã chạm hạn ngạch (Rate Limit / Quota Exceeded).');
    } else if (status === 404 || msg.includes('not found')) {
      console.error(`   👉 Lý do: Tên model [${riverModel1}] không tồn tại trên River AI.`);
    }
  }

  // Test Model 2 (nếu có cấu hình)
  if (riverModel2) {
    try {
      console.log(`   ⏳ [Model 2] Gửi test request dự phòng tới: ${riverModel2}...`);
      const startTime2 = Date.now();

      const response2 = await client.chat.completions.create({
        model: riverModel2,
        messages: [{ role: 'user', content: 'Ping! Trả lời ngắn gọn: "River AI Model 2 OK"' }],
        max_tokens: 30,
      });

      const duration2 = Date.now() - startTime2;
      const responseText2 = response2.choices[0]?.message?.content?.trim() || '(Không có nội dung)';

      console.log(`   ✅ [Model 2] THÀNH CÔNG (${duration2}ms)`);
      console.log(`   💬 Phản hồi: "${responseText2}"`);
      return true;
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown>;
      const msg = (errorObj?.message as string) || String(err);
      console.error(`   ⚠️ [Model 2] THẤT BẠI: ${msg}`);
      return model1Success;
    }
  }

  return model1Success;
}

async function runAll() {
  let successCount = 0;
  for (const item of targetKeys) {
    const success = await testApiKey(item.name, item.key);
    if (success) successCount++;
  }

  console.log('\n' + '='.repeat(65));
  console.log(`📊 TỔNG KẾT: ${successCount}/${targetKeys.length} key River AI hoạt động thành công.`);
  console.log('='.repeat(65));
}

runAll();
