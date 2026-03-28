/**
 * Styles Module - UI样式定义
 * 提取自 ai表单-0.1.user.js 第99-395行
 */

const Styles = {
    // 建议容器样式
    container: {
        base: `
            position: fixed;
            right: 20px;
            top: 20px;
            background: rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(200, 200, 200, 0.5);
            border-radius: 10px;
            padding: 10px;
            max-width: 300px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 2147483647;
            display: none;
            font-family: sans-serif;
            will-change: opacity, transform;
        `,
        visible: 'display: block; opacity: 1; transform: scale(1);',
        hidden: 'display: none; opacity: 0; transform: scale(0.95);'
    },

    // 列表项样式
    listItem: `
        padding: 8px;
        margin: 5px 0;
        color: rgba(0, 0, 0, 0.9);
        background-color: rgba(255, 255, 255, 0.4);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border-radius: 3px;
        border: 1px solid rgba(255, 255, 255, 0.5);
        cursor: pointer;
        opacity: 0;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2), inset 0 0 15px rgba(255, 255, 255, 0.3);
        transform: translateY(40px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `,

    // 提示框样式
    tooltip: `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0,0,0,0.7);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 14px;
        z-index: 2147483647;
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
    `,

    // 加载状态样式
    loading: `
        padding: 5px;
        color: #333;
        font-style: italic;
    `,

    // 错误状态样式
    error: `
        padding: 5px;
        color: #d32f2f;
        background-color: rgba(211, 47, 47, 0.1);
        border-radius: 4px;
    `,

    // 生成设置菜单样式
    getSettingsStyles() {
        return `
            #ai-settings-container {
                position: fixed;
                background-color: rgba(255, 255, 255, 0.35);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.5);
                border-radius: 16px;
                padding: 15px 18px;
                max-width: 300px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1),
                            inset 0 0 0 1px rgba(255, 255, 255, 0.2);
                z-index: 2147483647;
                color: rgba(0, 0, 0, 0.8);
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                transition: all 0.3s ease;
                overflow: hidden;
                will-change: transform, opacity;
            }

            #ai-settings-toggle {
                background: rgba(52, 152, 219, 0.65);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 10px;
                padding: 10px 14px;
                cursor: pointer;
                font-weight: 600;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                transition: all 0.3s ease;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
            }

            #ai-settings-toggle:hover {
                background: rgba(52, 152, 219, 0.85);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
            }

            #ai-settings-panel {
                margin-top: 15px;
                padding-top: 12px;
                border-top: 1px solid rgba(255, 255, 255, 0.3);
            }

            .settings-row {
                display: flex;
                align-items: center;
                margin-bottom: 12px;
                padding: 8px 5px;
                border-radius: 12px;
                background-color: rgba(255, 255, 255, 0.3);
                backdrop-filter: blur(5px);
                -webkit-backdrop-filter: blur(5px);
                transition: all 0.2s ease;
            }

            .settings-label {
                flex-grow: 1;
                font-size: 14px;
                color: rgba(0, 0, 0, 0.7);
                font-weight: 500;
                padding-left: 8px;
            }

            .custom-checkbox {
                position: relative;
                display: inline-block;
                width: 46px;
                height: 24px;
                margin-right: 8px;
            }

            .custom-checkbox input {
                opacity: 0;
                width: 0;
                height: 0;
                position: absolute;
            }

            .checkmark {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(200, 200, 200, 0.5);
                border-radius: 20px;
                transition: .3s;
                backdrop-filter: blur(3px);
                -webkit-backdrop-filter: blur(3px);
                border: 1px solid rgba(255, 255, 255, 0.5);
                box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);
            }

            .checkmark:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 2px;
                bottom: 2px;
                background-color: rgba(255, 255, 255, 0.95);
                border-radius: 50%;
                transition: .3s;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            }

            .custom-checkbox input:checked + .checkmark {
                background-color: rgba(33, 150, 243, 0.7);
            }

            .custom-checkbox input:checked + .checkmark:before {
                transform: translateX(22px);
            }

            .custom-number {
                width: 60px;
                text-align: center;
                background-color: rgba(255, 255, 255, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.6);
                border-radius: 8px;
                padding: 6px 8px;
                font-size: 14px;
                color: rgba(0, 0, 0, 0.7);
                transition: all 0.2s ease;
                margin-right: 8px;
            }

            .custom-text {
                width: calc(100% - 16px);
                background-color: rgba(255, 255, 255, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.6);
                border-radius: 8px;
                padding: 6px 8px;
                font-size: 14px;
                color: rgba(0, 0, 0, 0.7);
                transition: all 0.2s ease;
                margin-top: 5px;
                resize: vertical;
                min-height: 60px;
            }

            .status-indicator {
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                background-color: rgba(46, 125, 50, 0.15);
                color: rgba(46, 125, 50, 0.9);
                display: inline-block;
                margin-top: 10px;
                text-align: center;
                width: 85%;
                margin-left: auto;
                margin-right: auto;
            }

            .status-indicator.error {
                background-color: rgba(211, 47, 47, 0.15);
                color: rgba(211, 47, 47, 0.9);
            }
        `;
    }
};

export default Styles;