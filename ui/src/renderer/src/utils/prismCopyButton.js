/**
 * Utility to add copy-to-clipboard buttons to Prism code blocks
 */

/**
 * Adds copy buttons to all code blocks within a container
 * @param {HTMLElement} container - The container element containing code blocks
 * @param {Function} onCopy - Callback function when copy is successful
 */
export function addCopyButtonsToCodeBlocks(container, onCopy) {
    if (!container) return;

    // Find all pre elements with code children (Prism structure)
    const codeBlocks = container.querySelectorAll('pre[class*="language-"]');

    codeBlocks.forEach((pre) => {
        // Skip if button already exists
        if (pre.querySelector('.code-copy-button')) return;

        // Create wrapper div for positioning
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        wrapper.style.position = 'relative';

        // Wrap the pre element
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        // Create copy button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'code-copy-button';
        buttonContainer.style.cssText = `
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            z-index: 10;
        `;

        // Create the button
        const button = document.createElement('button');
        button.className = 'btn btn-sm btn-ghost-secondary opacity-60 hover:opacity-100';
        button.setAttribute('aria-label', 'Copy code to clipboard');
        button.innerHTML = `
            <svg class="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg class="check-icon hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;

        // Get the code content
        const codeElement = pre.querySelector('code');
        const code = codeElement ? codeElement.textContent : pre.textContent;

        // Add click handler
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(code);
                
                // Show check icon
                const copyIcon = button.querySelector('.copy-icon');
                const checkIcon = button.querySelector('.check-icon');
                copyIcon.classList.add('hidden');
                checkIcon.classList.remove('hidden');

                // Call the callback if provided
                if (onCopy) {
                    onCopy('Copied to clipboard');
                }

                // Reset icon after 2 seconds
                setTimeout(() => {
                    copyIcon.classList.remove('hidden');
                    checkIcon.classList.add('hidden');
                }, 2000);
            } catch (error) {
                console.error('Failed to copy code:', error);
                if (onCopy) {
                    onCopy('Failed to copy', 'error');
                }
            }
        });

        buttonContainer.appendChild(button);
        wrapper.appendChild(buttonContainer);
    });
}

/**
 * Removes all copy buttons from code blocks within a container
 * @param {HTMLElement} container - The container element containing code blocks
 */
export function removeCopyButtonsFromCodeBlocks(container) {
    if (!container) return;

    const copyButtons = container.querySelectorAll('.code-copy-button');
    copyButtons.forEach((button) => button.remove());

    // Unwrap code blocks
    const wrappers = container.querySelectorAll('.code-block-wrapper');
    wrappers.forEach((wrapper) => {
        const pre = wrapper.querySelector('pre');
        if (pre) {
            wrapper.parentNode.insertBefore(pre, wrapper);
        }
        wrapper.remove();
    });
}

