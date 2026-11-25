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
assert(i18n.t('hero_title_html').includes('THÁCH ĐẤU BẠN BÈ'), 'Tiêu đề tiếng Việt có gradient HTML');
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
assert(i18n.t('hero_title_html').includes('CHALLENGE YOUR FRIENDS'), 'Tiêu đề HTML tiếng Anh chính xác');
assert.strictEqual(i18n.t('online_players_count'), '128 Players Online');
assert.strictEqual(i18n.t('tab_all'), 'All Games (5)');
assert.strictEqual(i18n.t('tab_action'), 'Action & Shooter');
console.log('✅ Test 3 Passed: Đổi sang English chính xác toàn diện');

// Test 4: Language Switching to Chinese (zh)
i18n.setLanguage('zh');
assert.strictEqual(i18n.getLanguage(), 'zh');
assert(i18n.t('hero_title_html').includes('在复古像素世界中'), 'Tiêu đề HTML tiếng Trung chính xác');
assert.strictEqual(i18n.t('online_players_count'), '128 人在线');
assert.strictEqual(i18n.t('tab_all'), '全部游戏 (5)');
console.log('✅ Test 4 Passed: Đổi sang Chinese (zh) chính xác');

// Test 5: Fallback behavior on missing / invalid language
const invalidSwitch = i18n.setLanguage('fr');
assert.strictEqual(invalidSwitch, false, 'Từ chối mã ngôn ngữ chưa hỗ trợ');
assert.strictEqual(i18n.getLanguage(), 'zh', 'Giữ nguyên ngôn ngữ hiện tại');

// Fallback on missing key
const missingKey = i18n.t('non_existent_key_xyz', 'Fallback Custom');
assert.strictEqual(missingKey, 'Fallback Custom', 'Fallback hoạt động chính xác khi thiếu key');

// Test 6: Mock DOM applyToDOM for text and html attributes
const mockTextEl = {
  getAttribute: (name) => (name === 'data-i18n' ? 'online_players_count' : null),
  textContent: 'Old Text'
};
const mockHtmlEl = {
  getAttribute: (name) => (name === 'data-i18n-html' ? 'hero_title_html' : null),
  innerHTML: 'Old HTML'
};
const mockRoot = {
  querySelectorAll: (selector) => {
    if (selector === '[data-i18n]') return [mockTextEl];
    if (selector === '[data-i18n-html]') return [mockHtmlEl];
    return [];
  },
  querySelector: () => null
};

i18n.applyToDOM(mockRoot);
assert.strictEqual(mockTextEl.textContent, '128 人在线');
assert(mockHtmlEl.innerHTML.includes('在复古像素世界中'));
console.log('✅ Test 6 Passed: applyToDOM quét và cập nhật cả text lẫn rich HTML');

console.log('🎉 TẤT CẢ TEST i18n ĐỀU THÀNH CÔNG (100% PASSED)!');
