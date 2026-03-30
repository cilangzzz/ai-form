/**
 * Clipboard.js - 剪贴板工具
 * 提供跨环境的剪贴板写入功能
 */

class Clipboard {
    /**
     * 写入文本到剪贴板
     * 使用多层 fallback 确保在各种环境下都能工作
     * @param {string} text - 要写入的文本
     * @returns {Promise<boolean>} - 是否成功
     */
    static async writeText(text) {
        // 方案 1: 使用油猴 API（最可靠）
        if (typeof GM_setClipboard !== 'undefined') {
            try {
                GM_setClipboard(text);
                return true;
            } catch (e) {
                console.warn('GM_setClipboard failed:', e);
            }
        }

        // 方案 2: 使用 navigator.clipboard（需要 HTTPS）
        if (navigator?.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (e) {
                console.warn('navigator.clipboard.writeText failed:', e);
            }
        }

        // 方案 3: 使用 document.execCommand('copy')（兼容性最好）
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
            textarea.setAttribute('readonly', '');
            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, text.length);
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        } catch (e) {
            console.warn('execCommand copy failed:', e);
            return false;
        }
    }
}

export default Clipboard;