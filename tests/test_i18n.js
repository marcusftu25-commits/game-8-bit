const assert = require('assert');
const { i18n, SUPPORTED_LANGS, TRANSLATIONS } = require('../src/i18n');

console.log('🧪 Bắt đầu kiểm thử i18n Engine (Universal Module)...');

// Test 1: Supported Languages List
assert.strictEqual(SUPPORTED_LANGS.length, 3, 'Phải hỗ trợ đúng 3 ngôn ngữ: vi, en, zh');
const codes = SUPPORTED_LANGS.map(l => l.code);
assert(codes.includes('vi') && codes.includes('en') && codes.includes('zh'), 'Chứa đủ vi, en, zh');
console.log('✅ Test 1 Passed: Danh sách ngôn ngữ hợp lệ (vi, en, zh)');

// Test 2: Default Language
assert.strictEqual(i18n.getLanguage(), 'vi', 'Mặc định là Tiếng Việt');
assert.strictEqual(i18n.t('hero_title'), TRANSLATIONS.vi.hero_title);
console.log('✅ Test 2 Passed: Mặc định Tiếng Việt');

// Test 3: Language Switching to English
let notifiedLang = null;
i18n.onLanguageChange((lang) => {
  notifiedLang = lang;
});

const switchSuccess = i18n.setLanguage('en');
assert.strictEqual(switchSuccess, true, 'Đổi sang English thành công');
assert.strictEqual(i18n.getLanguage(), 'en');
assert.strictEqual(notifiedLang, 'en', 'Listener nhận được thông báo đổi ngôn ngữ');
assert.strictEqual(i18n.t('hero_title'), 'RETRO 8-BIT ONLINE DUO ARENA');
assert.strictEqual(i18n.t('btn_create_room'), 'CREATE ROOM');
console.log('✅ Test 3 Passed: Đổi sang English chính xác');

// Test 4: Language Switching to Chinese (zh)
i18n.setLanguage('zh');
assert.strictEqual(i18n.getLanguage(), 'zh');
assert.strictEqual(i18n.t('hero_title'), '复古 8-BIT 在线双人对决街机');
assert.strictEqual(i18n.t('btn_create_room'), '创建房间');
console.log('✅ Test 4 Passed: Đổi sang Chinese (zh) chính xác');

// Test 5: Fallback behavior on missing / invalid language
const invalidSwitch = i18n.setLanguage('fr');
assert.strictEqual(invalidSwitch, false, 'Từ chối mã ngôn ngữ chưa hỗ trợ');
assert.strictEqual(i18n.getLanguage(), 'zh', 'Giữ nguyên ngôn ngữ hiện tại');

// Fallback on missing key
const missingKey = i18n.t('non_existent_key_xyz', 'Fallback Custom');
assert.strictEqual(missingKey, 'Fallback Custom', 'Fallback hoạt động chính xác khi thiếu key');
console.log('✅ Test 5 Passed: Fallback và xử lý lỗi hoàn hảo');

console.log('🎉 TẤT CẢ TEST i18n ĐỀU THÀNH CÔNG (100% PASSED)!');
