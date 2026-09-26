import { getContext, extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const MODULE_NAME = 'token-cost';

// 默认设置
const defaultSettings = {
    inputPrice: 0,
    outputPrice: 0,
    currency: '¥',
};

// 初始化设置
if (!extension_settings[MODULE_NAME]) {
    extension_settings[MODULE_NAME] = { ...defaultSettings };
}
const settings = extension_settings[MODULE_NAME];

// 格式化金额
function formatCost(tokens, pricePerMillion) {
    if (!pricePerMillion || tokens <= 0) return '';
    const cost = (tokens / 1000000) * pricePerMillion;
    return `${settings.currency}${cost.toFixed(4)}`;
}

// ---- 消息气泡处理 ----
function processMessageElement(el) {
    // 找到 .tokenCounter 元素，这是 ST 显示 token 数的位置
    const tokenEl = el.querySelector('.tokenCounter');
    if (!tokenEl) return;

    // 避免重复添加
    if (tokenEl.querySelector('.cost-display')) return;

    const tokenText = tokenEl.textContent.trim();
    const match = tokenText.match(/(\d+)\s*t/);
    if (!match) return;

    const tokenCount = parseInt(match[1], 10);
    const cost = formatCost(tokenCount, settings.outputPrice);
    if (!cost) return;

    const span = document.createElement('span');
    span.className = 'cost-display';
    span.textContent = ` · ${cost}`;
    tokenEl.appendChild(span);
}

// ---- 提示词面板处理 ----
function processPromptPanel() {
    // 查找显示 "总 Token 数量" 的元素
    const promptEl = document.querySelector('#prompt_token_count, .prompt-token-count');
    if (!promptEl) return;

    // 避免重复添加
    if (promptEl.querySelector('.prompt-cost-display')) return;

    const text = promptEl.textContent.trim();
    const match = text.match(/(\d+)/);
    if (!match) return;

    const totalTokens = parseInt(match[1], 10);
    const cost = formatCost(totalTokens, settings.inputPrice);
    if (!cost) return;

    const span = document.createElement('span');
    span.className = 'prompt-cost-display';
    span.textContent = ` · ${cost}`;
    promptEl.appendChild(span);
}

// ---- 批量处理 ----
function processAllMessages() {
    document.querySelectorAll('.mes').forEach(processMessageElement);
}

// ---- MutationObserver 监听 DOM 变化 ----
function startObserver() {
    const chat = document.getElementById('chat');
    if (chat) {
        const observer = new MutationObserver(() => {
            processAllMessages();
        });
        observer.observe(chat, { childList: true, subtree: true });
    }

    // 提示词面板变化较少，定时检查即可
    setInterval(processPromptPanel, 2000);
}

// ---- 设置面板 UI ----
function createSettingsUI() {
    const html = `
    <div id="token-cost-settings" class="token-cost-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Token Cost Display</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label>货币符号</label>
                <select id="cost-currency">
                    <option value="¥">¥ (人民币)</option>
                    <option value="$">$ (美元)</option>
                </select>
                <label>输入单价（每 100 万 token）</label>
                <input id="cost-input-price" type="number" min="0" step="0.01" value="${settings.inputPrice}">
                <label>输出单价（每 100 万 token）</label>
                <input id="cost-output-price" type="number" min="0" step="0.01" value="${settings.outputPrice}">
            </div>
        </div>
    </div>`;

    $('#extensions_settings2').append(html);

    $('#cost-currency').val(settings.currency).on('change', function () {
        settings.currency = $(this).val();
        saveSettingsDebounced();
        refreshAll();
    });

    $('#cost-input-price').on('input', function () {
        settings.inputPrice = parseFloat($(this).val()) || 0;
        saveSettingsDebounced();
        refreshAll();
    });

    $('#cost-output-price').on('input', function () {
        settings.outputPrice = parseFloat($(this).val()) || 0;
        saveSettingsDebounced();
        refreshAll();
    });
}

// ---- 刷新 ----
function refreshAll() {
    // 移除旧显示
    document.querySelectorAll('.cost-display, .prompt-cost-display').forEach(el => el.remove());
    processAllMessages();
    processPromptPanel();
}

// ---- 初始化 ----
jQuery(async () => {
    createSettingsUI();
    startObserver();
    processAllMessages();
    processPromptPanel();
});