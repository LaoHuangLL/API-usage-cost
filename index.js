import { getContext, extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const MODULE_NAME = 'token-cost';

const defaultSettings = {
    inputPrice: 0,
    outputPrice: 0,
    currency: '¥',
};

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

// ---- 消息气泡处理 (根据你提供的 DOM 修改) ----
function processMessageElement(el) {
    if (el.getAttribute('is_user') === 'true') return;
    
    const tokenEl = el.querySelector('.tokenCounterDisplay');
    if (!tokenEl) return;
    if (tokenEl.querySelector('.cost-display')) return; // 防止重复添加

    const tokenText = tokenEl.textContent.trim();
    const match = tokenText.match(/(\d+)\s*t/);
    if (!match) return;

    const tokenCount = parseInt(match[1], 10);
    const cost = formatCost(tokenCount, settings.outputPrice);
    if (!cost) return; // 如果没填单价，就不显示

    const span = document.createElement('span');
    span.className = 'cost-display';
    span.textContent = ` · ${cost}`;
    tokenEl.appendChild(span);
}

// ---- 提示词面板处理 (根据你提供的 DOM 修改) ----
function processPromptPanel() {
    // 定位包含 "Total Tokens:" 的 span 的父级 div
    const spanEl = document.querySelector('span[data-i18n="Total Tokens:"]');
    if (!spanEl) return;
    
    const parentEl = spanEl.parentElement;
    if (!parentEl) return;
    if (parentEl.querySelector('.prompt-cost-display')) return; // 防止重复添加

    // 获取父级的全部文本，比如 "总 Token 数量： 10842"
    const text = parentEl.textContent.trim();
    const match = text.match(/(\d+)/); // 提取里面的数字
    if (!match) return;

    const totalTokens = parseInt(match[1], 10);
    const cost = formatCost(totalTokens, settings.inputPrice);
    if (!cost) return;

    const span = document.createElement('span');
    span.className = 'prompt-cost-display';
    span.textContent = ` · ${cost}`;
    parentEl.appendChild(span);
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
                <b>API usage cost</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="token-cost-row">
                    <label for="cost-currency">货币符号</label>
                    <select id="cost-currency" class="text_pole">
                        <option value="¥">¥ (人民币)</option>
                        <option value="$">$ (美元)</option>
                    </select>
                </div>
                <div class="token-cost-row">
                    <label for="cost-input-price">输入单价（每 100 万 token）</label>
                    <input id="cost-input-price" class="text_pole" type="number" min="0" step="0.01" value="${settings.inputPrice}">
                </div>
                <div class="token-cost-row">
                    <label for="cost-output-price">输出单价（每 100 万 token）</label>
                    <input id="cost-output-price" class="text_pole" type="number" min="0" step="0.01" value="${settings.outputPrice}">
                </div>
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
