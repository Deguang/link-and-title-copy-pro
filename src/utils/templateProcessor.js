/**
 * Process the template string with the provided context.
 * 
 * @param {string} template - The template string to process.
 * @param {Object} context - The context containing data to replace in the template.
 * @param {string} context.title - The page title.
 * @param {string} context.url - The page URL.
 * @param {string} [context.selectedText] - The selected text (optional).
 * @returns {string} The processed string ready for copying.
 */
export function processTemplate(template, context = {}) {
    const { title = '', url = '', selectedText = '' } = context;

    // Create a working copy of the template
    let result = template;

    // Handle conditional logic based on whether text is selected
    // Note: We check if selectedText exists and is not empty string
    const hasSelection = !!selectedText;

    if (template.includes('{if:selectedText}') || template.includes('{selectedText?}')) {
        if (hasSelection) {
            // Keep content inside {if:selectedText}...{/if:selectedText}
            result = result
                .replace(/\{if:selectedText\}(.*?)\{\/if:selectedText\}/gs, '$1')
                .replace(/\{selectedText\?\}(.*?)\{\/selectedText\?\}/gs, '$1')
                // Remove content inside {if:noSelectedText}...{/if:noSelectedText}
                .replace(/\{if:noSelectedText\}(.*?)\{\/if:noSelectedText\}/gs, '')
                .replace(/\{noSelectedText\?\}(.*?)\{\/noSelectedText\?\}/gs, '');
        } else {
            // Remove content inside {if:selectedText}...{/if:selectedText}
            result = result
                .replace(/\{if:selectedText\}(.*?)\{\/if:selectedText\}/gs, '')
                .replace(/\{selectedText\?\}(.*?)\{\/selectedText\?\}/gs, '')
                // Keep content inside {if:noSelectedText}...{/if:noSelectedText}
                .replace(/\{if:noSelectedText\}(.*?)\{\/if:noSelectedText\}/gs, '$1')
                .replace(/\{noSelectedText\?\}(.*?)\{\/noSelectedText\?\}/gs, '$1');
        }
    }

    // Handle basic placeholders
    result = result
        .replace(/\{title\}/g, title)
        .replace(/\{url\}/g, url)
        .replace(/\{selectedText\}/g, selectedText);

    // Handle URL component placeholders
    if (url) {
        try {
            const urlObj = new URL(url);
            result = result
                .replace(/\{url:clean\}/g, `${urlObj.origin}${urlObj.pathname}`)
                .replace(/\{url:protocol\}/g, urlObj.protocol.replace(':', ''))
                .replace(/\{url:domain\}/g, urlObj.hostname)
                .replace(/\{url:path\}/g, urlObj.pathname)
                .replace(/\{url:query\}/g, urlObj.search)
                .replace(/\{url:hash\}/g, urlObj.hash)
                .replace(/\{url:origin\}/g, urlObj.origin);
        } catch (e) {
            // If URL parsing fails, leave the placeholders as-is or replace with empty
            console.warn('Failed to parse URL for component placeholders:', e);
        }
    }

    // Handle smart/combined placeholders
    if (hasSelection) {
        result = result
            .replace(/\{selectedText\|title\}/g, selectedText)
            .replace(/\{title\|selectedText\}/g, selectedText)
            .replace(/\{selectedTextWithQuote\}/g, `"${selectedText}"`)
            .replace(/\{selectedTextWithBrackets\}/g, `[${selectedText}]`)
            .replace(/\{selectedTextWithContext\}/g, `${selectedText} - ${title}`);
    } else {
        // Fallback behavior when no selection
        result = result
            .replace(/\{selectedText\|title\}/g, title)
            .replace(/\{title\|selectedText\}/g, title)
            .replace(/\{selectedTextWithQuote\}/g, `"${title}"`)
            .replace(/\{selectedTextWithBrackets\}/g, `[${title}]`)
            .replace(/\{selectedTextWithContext\}/g, title);
    }

    // Cleanup: consolidate multiple empty lines into max 2 newlines (paragraph break)
    // and trim start/end whitespace
    result = result
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\s+$/gm, ''); // Trim trailing space on each line

    return result;
}
