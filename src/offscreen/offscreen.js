// 监听来自 background 的消息
chrome.runtime.onMessage.addListener(handleMessages);

async function handleMessages(message, sender, sendResponse) {
    // 返回 true 以便异步发送响应
    if (message.target !== 'offscreen-doc') {
        return;
    }

    if (message.type === 'copy-data') {
        handleClipboardWrite(message.data, sendResponse);
        return true;
    }
}

// 执行剪贴板写入操作
async function handleClipboardWrite(data, sendResponse) {
    try {
        const textarea = document.getElementById('text-box');
        textarea.value = data;
        textarea.select();
        document.execCommand('copy');

        // 如果支持 Clipboard API，也可以尝试使用它
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(data);
            } catch (err) {
                // 忽略错误，回退到 execCommand 已经执行过了
                console.log('Clipboard API failed in offscreen, relying on execCommand');
            }
        }

        sendResponse({ success: true });
    } catch (error) {
        console.error('Offscreen copy failed:', error);
        sendResponse({ success: false, error: error.message });
    } finally {
        // 清理
        const textarea = document.getElementById('text-box');
        textarea.value = '';
    }
}
