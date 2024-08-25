// 设置页面标题
const configStr = chrome.i18n.getMessage("config");
const nameStr = chrome.i18n.getMessage("name")

document.title = `${configStr} - ${nameStr}`