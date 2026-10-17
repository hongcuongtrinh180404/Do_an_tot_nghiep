import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

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

// 2. Identify Gemini API keys and target model
const geminiKeys: { name: string; key: string }[] = [];
for (const [key, val] of Object.entries(envVars)) {
  if (key.startsWith('GEMINI_API_KEY') && val) {
    geminiKeys.push({ name: key, key: val });
  }
}

// Also check general GEMINI_API_KEY or process.env
if (envVars['GEMINI_API_KEY'] && !geminiKeys.some((k) => k.name === 'GEMINI_API_KEY')) {
  geminiKeys.push({ name: 'GEMINI_API_KEY', key: envVars['GEMINI_API_KEY'] });
}

// 2b. Optional CLI arguments to filter specific keys (e.g., "2 5 6" or "GEMINI_API_KEY_2")
const filterArgs = process.argv.slice(2).map((a) => a.trim().toLowerCase());
let targetKeys = geminiKeys;

if (filterArgs.length > 0) {
  targetKeys = geminiKeys.filter((item) => {
    const keyNum = item.name.replace(/\D/g, '');
    const keyLower = item.name.toLowerCase();
    return filterArgs.some(
      (arg) => arg === keyNum || keyLower.includes(arg) || arg === keyLower
    );
  });
}

const configuredModel = envVars['GEMINI_MODEL'] || 'gemini-2.5-flash';

console.log('='.repeat(60));
console.log('🔍 KIỂM TRA CẤU HÌNH GEMINI API TỪ FILE .env');
console.log('='.repeat(60));
console.log(`📁 File .env: ${envPath}`);
console.log(`🤖 Model cấu hình trong .env: ${configuredModel}`);
console.log(`🔑 Số lượng key kiểm tra: ${targetKeys.length}/${geminiKeys.length}`);
if (filterArgs.length > 0) {
  console.log(`🎯 Bộ lọc chỉ định: [${filterArgs.join(', ')}]`);
}
console.log('='.repeat(60));

if (targetKeys.length === 0) {
  console.warn('⚠️ Không tìm thấy biến môi trường GEMINI_API_KEY phù hợp với bộ lọc!');
  process.exit(1);
}

function maskKey(key: string): string {
  if (key.length <= 10) return '***';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

async function testApiKey(name: string, apiKey: string) {
  console.log(`\n▶ Đang kiểm tra [${name}] (Key: ${maskKey(apiKey)})...`);

  // Detect obvious placeholder
  if (apiKey.includes('key_thuc_te') || apiKey.includes('your_api_key')) {
    console.log(`   ⚠️ Bỏ qua: Đây là placeholder (${apiKey}), chưa phải key thật.`);
    return false;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Test with configured model
    console.log(`   ⏳ Đang gửi request test tới model: ${configuredModel}...`);
    const startTime = Date.now();

    try {
      const response = await ai.models.generateContent({
        model: configuredModel,
        contents: 'Xin chào, hãy trả lời đúng 1 câu ngắn: "Gemini API hoạt động tốt!"',
      });

      const duration = Date.now() - startTime;
      const responseText = response.text?.trim() || '(Không có nội dung trả về)';

      console.log(`   ✅ KẾT QUẢ: THÀNH CÔNG (${duration}ms)`);
      console.log(`   💬 Phản hồi từ Gemini: "${responseText}"`);
      return true;
    } catch (modelErr: any) {
      console.log(`   ⚠️ Lỗi với model "${configuredModel}": ${modelErr.message}`);

      // Fallback try with standard official models if configuredModel is unusual (e.g. gemini-3.8-flash)
      const fallbackModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      for (const fallback of fallbackModels) {
        if (fallback === configuredModel) continue;
        console.log(`   🔄 Thử lại với model chuẩn: ${fallback}...`);
        try {
          const fbResponse = await ai.models.generateContent({
            model: fallback,
            contents: 'Ping',
          });
          console.log(`   ✅ THÀNH CÔNG với model fallback [${fallback}]!`);
          console.log(`   💬 Phản hồi: "${fbResponse.text?.trim()}"`);
          console.log(`   💡 Gợi ý: Hãy đổi GEMINI_MODEL trong file .env thành "${fallback}"`);
          return true;
        } catch {
          // Continue to next fallback
        }
      }
      throw modelErr;
    }
  } catch (error: any) {
    console.error(`   ❌ THẤT BẠI: ${error.message || error}`);
    if (error.status === 400 || error.message?.includes('API_KEY_INVALID')) {
      console.error('   👉 Lý do: API Key không hợp lệ hoặc đã hết hạn.');
    } else if (error.status === 404 || error.message?.includes('not found')) {
      console.error('   👉 Lý do: Tên Model không tồn tại trên hệ thống Gemini.');
    } else if (error.status === 429 || error.message?.includes('RESOURCE_EXHAUSTED')) {
      console.error('   👉 Lý do: Vượt quá quota (Rate limit) của API Key.');
    }
    return false;
  }
}

async function runAll() {
  let successCount = 0;
  for (const item of targetKeys) {
    const success = await testApiKey(item.name, item.key);
    if (success) successCount++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 TỔNG KẾT: ${successCount}/${targetKeys.length} key được kiểm tra hoạt động thành công.`);
  console.log('='.repeat(60));
}

runAll();
