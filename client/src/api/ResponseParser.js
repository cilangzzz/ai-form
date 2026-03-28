/**
 * Response Parser - 响应解析器
 * 提供直接JSON解析和清理后解析功能
 */

export class ResponseParser {
    /**
     * 解析响应数据
     * @param {string} responseStr - 响应字符串
     * @returns {Array<Object>} - 解析后的建议数组
     */
    parse(responseStr) {
        if (!responseStr || typeof responseStr !== 'string') {
            console.warn('Invalid response string:', responseStr);
            return [];
        }

        // 尝试直接解析 JSON
        const directResult = this.tryDirectParse(responseStr);
        if (directResult.length > 0) {
            return directResult;
        }

        // 清理并尝试解析
        return this.tryCleanedParse(responseStr);
    }

    /**
     * 尝试直接JSON解析
     * @param {string} responseStr - 响应字符串
     * @returns {Array<Object>}
     */
    tryDirectParse(responseStr) {
        try {
            const directParse = JSON.parse(responseStr);
            if (Array.isArray(directParse)) {
                return this.normalizeArray(directParse);
            }
            if (typeof directParse === 'object' && directParse !== null) {
                return [directParse];
            }
        } catch {
            // 不是有效 JSON，继续其他解析方式
        }
        return [];
    }

    /**
     * 尝试清理后解析
     * @param {string} responseStr - 响应字符串
     * @returns {Array<Object>}
     */
    tryCleanedParse(responseStr) {
        try {
            // 清理响应字符串
            let cleanedStr = responseStr
                .replace(/'/g, '"')
                .replace(/，/g, ',')
                .replace(/：/g, ':')
                .replace(/\\"/g, '"')  // 处理转义引号
                .trim();

            // 移除可能的前后缀（如 markdown 代码块标记）
            if (cleanedStr.startsWith('```json')) {
                cleanedStr = cleanedStr.slice(7);
            }
            if (cleanedStr.startsWith('```')) {
                cleanedStr = cleanedStr.slice(3);
            }
            if (cleanedStr.endsWith('```')) {
                cleanedStr = cleanedStr.slice(0, -3);
            }
            cleanedStr = cleanedStr.trim();

            // 添加花括号（如果缺失）
            if (!cleanedStr.startsWith('{') && !cleanedStr.startsWith('[')) {
                cleanedStr = '{' + cleanedStr + '}';
            }

            // 尝试匹配键值对
            const entries = this.extractKeyValuePairs(cleanedStr);

            if (entries.length === 0) {
                return [];
            }

            // 分组并构建结果
            return this.groupEntries(entries);
        } catch (e) {
            console.error('Error parsing AI response:', e);
            return [];
        }
    }

    /**
     * 提取键值对
     * @param {string} str - 字符串
     * @returns {Array<{key: string, value: string}>}
     */
    extractKeyValuePairs(str) {
        const entries = [];
        // 匹配 "key": "value" 格式
        const regex = /"([^"]+)"\s*:\s*"([^"]*)"/g;
        let match;

        while ((match = regex.exec(str)) !== null) {
            entries.push({
                key: match[1].trim(),
                value: match[2].trim()
            });
        }

        return entries;
    }

    /**
     * 分组条目
     * @param {Array<{key: string, value: string}>} entries - 条目数组
     * @returns {Array<Object>}
     */
    groupEntries(entries) {
        const groups = {};
        const result = [];

        entries.forEach(entry => {
            if (!groups[entry.key]) {
                groups[entry.key] = [];
            }
            groups[entry.key].push(entry.value);
        });

        // 创建建议对象
        Object.keys(groups).forEach(key => {
            groups[key].forEach((value, i) => {
                if (!result[i]) result[i] = {};
                result[i][key] = value;
            });
        });

        return result;
    }

    /**
     * 标准化数组
     * @param {Array} arr - 原始数组
     * @returns {Array<Object>}
     */
    normalizeArray(arr) {
        return arr.map(item => {
            if (typeof item === 'object' && item !== null) {
                return item;
            }
            if (typeof item === 'string') {
                return this.tryCleanedParse(item);
            }
            return null;
        }).filter(Boolean);
    }
}

/**
 * 创建默认的响应解析器实例
 * @returns {ResponseParser}
 */
export function createResponseParser() {
    return new ResponseParser();
}

export default ResponseParser;