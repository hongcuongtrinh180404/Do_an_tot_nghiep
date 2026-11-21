/**
 * Script kiểm tra và xác minh năng lực thực thi Transaction (ClientSession)
 * trên MongoDB Replica Set (rs0).
 *
 * Chạy bằng lệnh:
 *   npx tsx scripts/verify-mongo-transactions.ts
 */

import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/thc_datn';
  console.log(`[Mongo TX Verify] Đang kết nối tới: ${uri}...`);

  const connection = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });

  console.log('✅ Kết nối MongoDB thành công.');

  // 1. Kiểm tra trạng thái Replica Set
  try {
    const adminDb = connection.connection.db?.admin();
    if (!adminDb) {
      throw new Error('Không thể truy cập admin database');
    }
    const status = await adminDb.command({ replSetGetStatus: 1 });
    console.log(`✅ Replica Set Name: "${status.set}", Trạng thái: "${status.members?.[0]?.stateStr || 'OK'}"`);
  } catch (error: any) {
    console.warn(`⚠️ Không thể lấy replSetGetStatus từ adminDb (có thể do quyền): ${error.message}`);
  }

  // 2. Kiểm tra mở Session và thực thi Transaction
  const session = await connection.startSession();
  console.log('✅ Khởi tạo ClientSession thành công.');

  const testCollectionName = '_tx_verification_test';
  const testDb = connection.connection.db;
  if (!testDb) {
    throw new Error('Database instance is undefined');
  }
  const collection = testDb.collection(testCollectionName);

  try {
    const testId = new mongoose.Types.ObjectId();

    // KỊCH BẢN A: Test Abort Transaction (Rollback)
    console.log('[Test 1] Kiểm tra Rollback khi Abort Transaction...');
    session.startTransaction();

    await collection.insertOne(
      { _id: testId, name: 'rollback-test', createdAt: new Date() },
      { session },
    );

    // Xác nhận trong session thì thấy
    const docInSession = await collection.findOne({ _id: testId }, { session });
    if (!docInSession) {
      throw new Error('Tài liệu phải tồn tại bên trong transaction');
    }

    // Hủy transaction
    await session.abortTransaction();
    console.log('   ↳ Đã abort transaction.');

    // Kiểm tra ngoài session: tài liệu không được phép tồn tại
    const docAfterAbort = await collection.findOne({ _id: testId });
    if (docAfterAbort) {
      throw new Error('LỖI: Tài liệu vẫn tồn tại sau khi abort transaction!');
    }
    console.log('✅ Test Rollback thành công: Dữ liệu được khôi phục nguyên vẹn.');

    // KỊCH BẢN B: Test Commit Transaction
    console.log('[Test 2] Kiểm tra Commit Transaction...');
    session.startTransaction();

    await collection.insertOne(
      { _id: testId, name: 'commit-test', createdAt: new Date() },
      { session },
    );

    await session.commitTransaction();
    console.log('   ↳ Đã commit transaction.');

    // Kiểm tra ngoài session: tài liệu phải tồn tại
    const docAfterCommit = await collection.findOne({ _id: testId });
    if (!docAfterCommit) {
      throw new Error('LỖI: Tài liệu không tồn tại sau khi commit transaction!');
    }
    console.log('✅ Test Commit thành công: Dữ liệu đã được ghi bền vững.');

    // Dọn dẹp bản ghi kiểm thử
    await collection.deleteOne({ _id: testId });
    console.log('✅ Dọn dẹp dữ liệu kiểm thử thành công.');

    console.log('\n🎉 KẾT QUẢ: MongoDB Replica Set rs0 hỗ trợ hoàn hảo Multi-Document Transactions!');
  } finally {
    await session.endSession();
    await connection.disconnect();
    console.log('🔌 Đã đóng kết nối an toàn.');
  }
}

main().catch((err) => {
  console.error('❌ Lỗi xác minh transaction:', err);
  process.exit(1);
});
